"""Offline Python reference: three datasets, per-item s1 -> API s2 -> s3.

Usage: python3 pipeline_demo.py --output /absolute/local/runtime/demo
No API credentials, network calls or GPUs are used. All numbers are synthetic.
"""
import argparse
import asyncio
import json
from pathlib import Path
import time
import uuid

from api_governor import ApiError, ApiGovernor
from artifact_dag import ArtifactStore, DagRunner, Node, concurrency_ceiling, digest


async def demo(output: Path):
    output.mkdir(parents=True, exist_ok=True)
    reports = output / f"report-{uuid.uuid4()}"
    reports.mkdir()
    # These are synthetic measured ceilings, not recommended production settings.
    ceiling = concurrency_ceiling({"ram_units": 16}, {"ram_units": 2}, 12, provider_cap=8)
    api = ApiGovernor(4, rpm=1000, tpm=100000, request_timeout=2, max_attempts=3)
    api_events = []
    nodes = []
    final_keys = []
    for item in range(4):  # Round-robin dataset discovery, not dataset-sized barriers.
        for dataset in ("alpha", "beta", "gamma"):
            source = {"dataset": dataset, "item": item, "value": item + 1}
            prefix = f"{dataset}/{item}"
            recipe = "offline-example-v1:" + digest(json.dumps(source, sort_keys=True).encode())

            async def prepare(_, source=source):
                slow = source["dataset"] == "alpha" and source["item"] == 0
                await asyncio.sleep(.2 if slow else .005)
                return json.dumps(source).encode()

            async def predict(parents, prefix=prefix):
                value = json.loads(parents[prefix + "/s1"].read_bytes())
                attempt = 0
                async def request():
                    nonlocal attempt
                    attempt += 1
                    await asyncio.sleep(.01)
                    if prefix == "beta/1" and attempt == 1:
                        raise ApiError(429, retry_after=.03)
                    return json.dumps({**value, "prediction": value["value"] * 2}).encode()
                return await api.run(request, input_tokens=20, max_output_tokens=30,
                                     replay_safe=True, deadline=5,
                                     on_event=lambda event: api_events.append({"item": prefix, **event}))

            async def score(parents, prefix=prefix):
                value = json.loads(parents[prefix + "/s2"].read_bytes())
                await asyncio.sleep(.001)
                return json.dumps({"item": prefix, "score": value["prediction"]}).encode()

            for stage, parents, callback in [
                    ("s1", (), prepare), ("s2", (prefix + "/s1",), predict),
                    ("s3", (prefix + "/s2",), score)]:
                nodes.append(Node(prefix + "/" + stage, parents, recipe + ":" + stage,
                                  callback, lambda b: isinstance(json.loads(b), dict), "json-object-v1",
                                  {"ram_units": 2}, max_output_bytes=512, timeout=10))
            final_keys.append(prefix + "/s3")

    async def aggregate(parents):
        scores = [json.loads(parents[key].read_bytes())["score"] for key in sorted(parents)]
        return json.dumps({"count": len(scores), "total": sum(scores)}).encode()

    nodes.append(Node("complete-summary", tuple(final_keys), "sum-v1", aggregate,
                      lambda b: json.loads(b).get("count") == 12, "coverage-12-v1",
                      {"ram_units": 2}, max_output_bytes=512))
    runner = DagRunner(nodes, ArtifactStore(output / "store"), capacities={"ram_units": 16},
                       max_in_flight=ceiling, disk_reserve_bytes=1024 * 1024)
    # Exact declared artifact DAG, editable without opening any desktop window.
    (reports / "pipeline.drawio").write_text(runner.drawio())
    started = time.monotonic()
    artifacts = await runner.run()
    events = [json.loads(line) for line in runner.events.read_text().splitlines()]
    commits = {e["key"]: e["monotonic"] for e in events if e["event"] == "committed"}
    summary = {"synthetic": True, "artifacts": len(artifacts), "admission_ceiling": ceiling,
               "seconds": time.monotonic() - started,
               "result": json.loads(artifacts["complete-summary"].payload.read_bytes()),
               "fast_s3_before_slow_s1": (commits["beta/0/s3"] < commits["alpha/0/s1"]
                                          if {"beta/0/s3", "alpha/0/s1"} <= commits.keys() else None),
               "reused": sum(e["event"] == "reused" for e in events), "api": api.snapshot()}
    (reports / "api-events.json").write_text(json.dumps(api_events, indent=2))
    (reports / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(demo(args.output.absolute()))
