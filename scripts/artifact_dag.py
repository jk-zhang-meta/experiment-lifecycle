"""Single-host, attended artifact DAG reference (Python 3.11+, POSIX filesystem).

asyncio owns execution; graphlib owns dependency readiness. A node names ONE
immutable artifact, not an entire dataset. Callbacks must be cooperative async
operations; put blocking CPU/GPU work behind the project's real executor.
Logical resource budgets do not impose OS limits or reserve external devices.
"""
from __future__ import annotations

import asyncio
from collections import Counter
from dataclasses import dataclass, field
import fcntl
from graphlib import TopologicalSorter
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import time
from typing import Awaitable, Callable, Mapping
import uuid
from xml.etree import ElementTree as ET


def encoded(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class Node:
    key: str
    parents: tuple[str, ...]
    recipe: str  # Immutable code/config/input/model/seed/environment closure.
    produce: Callable[[Mapping[str, Path]], Awaitable[bytes]]
    validate: Callable[[bytes], bool]
    validator: str
    resources: Mapping[str, float] = field(default_factory=lambda: {"slots": 1})
    max_output_bytes: int = 1024 * 1024
    timeout: float = 60


@dataclass(frozen=True)
class Artifact:
    identity: str
    payload: Path
    sha256: str
    size: int


class ArtifactStore:
    """One owner per root; payload + manifest are published in one directory rename.

    Root must be private, trusted, local POSIX storage. No external writers,
    network filesystems, live revocation or detached producers are supported.
    A new recipe creates a new identity; old and failed evidence is retained.
    """

    def __init__(self, root: Path):
        self.root = Path(root).absolute()
        self._lock = None

    def __enter__(self):
        for path in (self.root, *self.root.parents):
            if path.is_symlink():
                raise ValueError("artifact root cannot traverse a symlink")
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(self.root / "owner.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        self._lock = os.fdopen(fd, "a+")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            for name in ("artifacts", "attempts"):
                path = self.root / name
                if path.is_symlink():
                    raise ValueError("artifact directories cannot be symlinks")
                path.mkdir(exist_ok=True, mode=0o700)
            self._sync(self.root)
        except BaseException:
            self._lock.close()
            self._lock = None
            raise
        return self

    def __exit__(self, *args):
        self._lock.close()
        self._lock = None

    @staticmethod
    def _sync(path: Path):
        fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)

    @staticmethod
    def _write(path: Path, value: bytes):
        with path.open("xb") as output:
            output.write(value)
            output.flush()
            os.fsync(output.fileno())

    @staticmethod
    def binding(node: Node, parents: Mapping[str, Artifact]):
        return {"key": node.key, "recipe": node.recipe, "validator": node.validator,
                "parents": {key: {"identity": value.identity, "sha256": value.sha256}
                            for key, value in sorted(parents.items())}}

    def lookup(self, node: Node, parents: Mapping[str, Artifact]) -> Artifact | None:
        binding = self.binding(node, parents)
        identity = digest(encoded(binding))
        target = self.root / "artifacts" / identity
        if not target.exists():
            return None
        if target.is_symlink() or any((target / p).is_symlink() for p in ("manifest.json", "payload")):
            raise ValueError("symlink in committed artifact")
        manifest_path = target / "manifest.json"
        if manifest_path.stat().st_size > 65536:
            raise ValueError("oversized manifest")
        manifest = json.loads(manifest_path.read_bytes())
        payload = target / "payload"
        if payload.stat().st_size > node.max_output_bytes:
            raise ValueError("cached payload exceeds declared bound")
        data = payload.read_bytes()
        if (manifest.get("binding") != binding or manifest.get("sha256") != digest(data)
                or manifest.get("size") != len(data) or node.validate(data) is not True):
            raise ValueError(f"invalid committed artifact: {node.key}")
        # A previous process may have failed after rename but before syncing the
        # directory entry. Visibility alone is not recovery of durable commit.
        self._sync(target)
        self._sync(target.parent)
        self._sync(self.root / "attempts")
        return Artifact(identity, payload, manifest["sha256"], len(data))

    async def execute(self, node: Node, parents: Mapping[str, Artifact]) -> Artifact:
        binding = self.binding(node, parents)
        identity = digest(encoded(binding))
        attempt = self.root / "attempts" / str(uuid.uuid4())
        attempt.mkdir(mode=0o700)
        self._write(attempt / "intent.json", encoded(binding))
        self._sync(attempt)
        self._sync(attempt.parent)
        try:
            # Timeout cancellation is cooperative. A provider must own hard stops.
            async with asyncio.timeout(node.timeout):
                data = await node.produce({key: item.payload for key, item in parents.items()})
            if not isinstance(data, bytes) or len(data) > node.max_output_bytes:
                raise ValueError(f"producer must return bounded bytes: {node.key}")
            self._write(attempt / "payload", data)
            if node.validate(data) is not True:
                raise ValueError(f"validation failed: {node.key}")
            manifest = {"binding": binding, "sha256": digest(data), "size": len(data),
                        "attempt": attempt.name}
            receipt = encoded(manifest)
            if len(receipt) > 65536:
                raise ValueError("manifest exceeds reference runner limit")
            self._write(attempt / "manifest.json", receipt)
            self._sync(attempt)
            target = self.root / "artifacts" / identity
            if target.exists():
                raise ValueError("unexpected concurrent artifact commit")
            attempt.rename(target)
            self._sync(target.parent)
            self._sync(attempt.parent)
            return Artifact(identity, target / "payload", manifest["sha256"], len(data))
        except BaseException as error:
            # Keep failures and partials; never turn them into dependency success.
            if attempt.exists():
                self._write(attempt / "failure.json", encoded({"type": type(error).__name__}))
                self._sync(attempt)
            raise


class DagRunner:
    """Fill every admissible ready slot and release successors after durable commit.

    No stage-wide gather, fixed dataset groups or LLM per-batch dispatch. A
    downstream-first queue with aging reduces retained intermediate pressure.
    Pending metadata is bounded by max_nodes; live tasks by max_in_flight.
    """

    def __init__(self, nodes: list[Node], store: ArtifactStore, *,
                 capacities: Mapping[str, float], max_in_flight: int,
                 disk_reserve_bytes: int, max_nodes: int = 100000,
                 aging_seconds: float = 1):
        if not 0 < len(nodes) <= max_nodes or len({n.key for n in nodes}) != len(nodes):
            raise ValueError("empty, duplicate or oversized node collection")
        if (not isinstance(max_in_flight, int) or max_in_flight < 1
                or not isinstance(disk_reserve_bytes, int) or disk_reserve_bytes < 0
                or not math.isfinite(aging_seconds) or aging_seconds <= 0):
            raise ValueError("invalid run budgets")
        if not capacities or any(not math.isfinite(v) or v <= 0 for v in capacities.values()):
            raise ValueError("capacities must be finite positive resource amounts")
        self.nodes = {n.key: n for n in nodes}
        for node in nodes:
            if (not node.key or not node.recipe or not node.validator
                    or len(node.parents) != len(set(node.parents))
                    or any(p not in self.nodes for p in node.parents)
                    or not isinstance(node.max_output_bytes, int) or node.max_output_bytes < 1
                    or not math.isfinite(node.timeout) or node.timeout <= 0
                    or not node.resources
                    or any(not math.isfinite(v) or v < 0 or v > capacities.get(k, -1)
                           for k, v in node.resources.items())):
                raise ValueError(f"invalid or unschedulable node: {node.key}")
        self.graph = {n.key: n.parents for n in nodes}
        order = tuple(TopologicalSorter(self.graph).static_order())  # Reject cycles before work.
        self.depth = {}
        for key in order:
            self.depth[key] = 1 + max((self.depth[p] for p in self.graph[key]), default=0)
        self.store = store
        self.capacities = dict(capacities)
        self.max_in_flight = max_in_flight
        self.disk_reserve_bytes = disk_reserve_bytes
        self.aging_seconds = aging_seconds
        self.events: Path | None = None

    def drawio(self) -> str:
        """Render the exact declared artifact graph, not a guessed call graph."""
        model = ET.Element("mxGraphModel")
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")
        ids = {key: f"n{i}" for i, key in enumerate(self.nodes)}
        rows = Counter()
        for key, node in self.nodes.items():
            depth = self.depth[key]
            cell = ET.SubElement(root, "mxCell", id=ids[key], value=key,
                                 vertex="1", parent="1", style="rounded=1;whiteSpace=wrap;html=0;")
            ET.SubElement(cell, "mxGeometry", x=str((depth - 1) * 240),
                          y=str(rows[depth] * 90), width="210", height="60", **{"as": "geometry"})
            rows[depth] += 1
            for parent in node.parents:
                edge = ET.SubElement(root, "mxCell", id=f"e{ids[parent]}_{ids[key]}",
                                     edge="1", parent="1", source=ids[parent], target=ids[key],
                                     style="edgeStyle=orthogonalEdgeStyle;endArrow=classic;")
                ET.SubElement(edge, "mxGeometry", relative="1", **{"as": "geometry"})
        return ET.tostring(model, encoding="unicode")

    async def run(self) -> dict[str, Artifact]:
        sorter = TopologicalSorter(self.graph)
        sorter.prepare()
        completed: dict[str, Artifact] = {}
        ready: dict[str, float] = {}
        running: dict[asyncio.Task, Node] = {}
        reserved_bytes = 0
        with self.store:
            self.events = self.store.root / f"events-{uuid.uuid4()}.jsonl"
            with self.events.open("x", buffering=1) as events:
                def event(kind, key, **fields):
                    events.write(json.dumps({"event": kind, "key": key,
                                            "monotonic": time.monotonic(), **fields}) + "\n")

                try:
                    while sorter.is_active():
                        for key in sorter.get_ready():
                            ready[key] = time.monotonic()
                            event("ready", key)
                        progress = False
                        released_cached = False
                        now = time.monotonic()
                        candidates = sorted(ready, key=lambda k:
                                            -(self.depth[k] + (now - ready[k]) / self.aging_seconds))
                        for key in candidates:
                            node = self.nodes[key]
                            parents = {p: completed[p] for p in node.parents}
                            cached = self.store.lookup(node, parents)
                            if cached is not None:
                                completed[key] = cached
                                del ready[key]
                                sorter.done(key)
                                event("reused", key, identity=cached.identity)
                                progress = True
                                released_cached = True
                                continue
                            if len(running) >= self.max_in_flight:
                                continue
                            if any(math.fsum([v, *(other.resources.get(k, 0) for other in running.values())])
                                   > self.capacities[k] for k, v in node.resources.items()):
                                continue
                            # Reserve output and bounded control bytes for all admitted work.
                            required = node.max_output_bytes + 131072
                            free = shutil.disk_usage(self.store.root).free
                            if free < self.disk_reserve_bytes + reserved_bytes + required:
                                continue
                            reserved_bytes += required
                            running[asyncio.create_task(self.store.execute(node, parents))] = node
                            del ready[key]
                            event("started", key, resources=dict(node.resources))
                            progress = True
                        if released_cached:
                            # Cached predecessors can release new work while an unrelated
                            # long task is still running; do not wait for that task.
                            continue
                        if not running:
                            if ready and not progress:
                                raise RuntimeError("admission blocked: resource or retained-storage headroom")
                            continue
                        # Drain completion events, never wait for an entire stage or shard.
                        done, _ = await asyncio.wait(running, return_when=asyncio.FIRST_COMPLETED)
                        for task in done:
                            node = running.pop(task)
                            reserved_bytes -= node.max_output_bytes + 131072
                            result = task.result()  # Failure aborts; never marks the dependency done.
                            completed[node.key] = result
                            event("committed", node.key, identity=result.identity)
                            sorter.done(node.key)
                    event("complete", "", count=len(completed))
                    return completed
                except BaseException as error:
                    event("aborted", "", error=type(error).__name__)
                    raise
                finally:
                    for task in running:
                        task.cancel()
                    await asyncio.gather(*running, return_exceptions=True)
                    events.flush()
                    os.fsync(events.fileno())


def concurrency_ceiling(capacities: Mapping[str, float], per_task: Mapping[str, float],
                        demand: int, *, provider_cap: int) -> int:
    """Top-down admission ceiling, NOT a claim of optimum throughput.

    Capacities already exclude measured reserve. Per-task peaks must cover the
    selected workload tails and overlap. Heterogeneous nodes use resource vectors.
    """
    if not isinstance(demand, int) or demand < 0 or not isinstance(provider_cap, int) or provider_cap < 1:
        raise ValueError("invalid demand/provider cap")
    if not per_task:
        raise ValueError("measured per-task resources are required")
    limits = [demand, provider_cap]
    for key, cost in per_task.items():
        capacity = capacities.get(key, 0)
        if not math.isfinite(cost) or cost <= 0 or not math.isfinite(capacity) or capacity < 0:
            raise ValueError("invalid resource profile")
        limits.append(math.floor(capacity / cost))
    return min(limits)
