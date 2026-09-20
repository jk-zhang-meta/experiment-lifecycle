"""Backend-neutral execution against a project's retained artifact store."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping, Protocol, Sequence


@dataclass(frozen=True)
class ArtifactRef:
    """Serializable wrapper around an opaque, exact native artifact reference."""
    payload: Any


@dataclass(frozen=True)
class NodeAttempt:
    """Preallocated identity for one fenced node attempt in a trial execution."""
    study_revision: str
    trial_id: str
    execution_id: str
    parent_execution_id: str | None
    node_attempt_id: str
    logical_key: str
    recipe_id: str
    validator_id: str
    output_ports: tuple[str, ...]
    storage_binding: str
    staging_key: str
    output_bundle: str


class ArtifactStore(Protocol):
    """Project-native retained-store seam; references must be serializable."""
    def load_accepted(self, reference: Any) -> Any:
        """Validate one exact accepted, available, non-revoked ref and load it."""

    def record_started(self, attempt: NodeAttempt) -> None:
        """Exclusively claim/fence and retain start before computation can run."""

    def record_failed(self, attempt: NodeAttempt, failure: Mapping[str, str]) -> None:
        """Retain a sanitized failure type and native partial/staging evidence."""

    def validate_and_commit_bundle(self, attempt: NodeAttempt, outputs: Mapping[str, Any], lineage: Sequence[Any]) -> Mapping[str, Any]:
        """Retain success, atomically validate/commit ports, and return native refs."""


class ArtifactStoreFactory(Protocol):
    """An importable, worker-serializable factory for the project's native store."""
    def __call__(self) -> ArtifactStore: ...


def _load(store: ArtifactStore, references: Any) -> Any:
    if isinstance(references, dict):
        return {key: _load(store, value) for key, value in references.items()}
    if isinstance(references, list):
        return [_load(store, value) for value in references]
    if isinstance(references, tuple):
        return tuple(_load(store, value) for value in references)
    if isinstance(references, ArtifactRef):
        return store.load_accepted(references.payload)
    raise TypeError("input references must be ArtifactRef values or nested containers")


def execute_node(store_factory: ArtifactStoreFactory, attempt: NodeAttempt, function: Callable[..., Mapping[str, Any]], input_references: Sequence[Any]) -> Mapping[str, Any]:
    """Fence one attempt, load accepted inputs, and atomically commit its outputs."""
    store = store_factory()
    store.record_started(attempt)
    try:
        outputs = function(*(_load(store, ref) for ref in input_references))
        if not isinstance(outputs, dict) or set(outputs) != set(attempt.output_ports):
            raise TypeError("node outputs must match the declared named output ports")
        accepted = store.validate_and_commit_bundle(attempt, outputs, input_references)
        if set(accepted) != set(outputs):
            raise ValueError("store returned refs for a different output bundle")
        return {port: ArtifactRef(reference) for port, reference in accepted.items()}
    except BaseException as error:
        try:
            store.record_failed(attempt, {"type": type(error).__name__})
        except BaseException as retention_error:
            error.add_note("artifact failure record failed: " + type(retention_error).__name__)
        raise
