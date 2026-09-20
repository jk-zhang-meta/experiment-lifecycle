import asyncio
import json
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree as ET
from unittest.mock import patch

from artifact_dag import ArtifactStore, DagRunner, Node, concurrency_ceiling


def node(key, parents=(), produce=None, **kwargs):
    async def default(inputs):
        return key.encode()
    return Node(key, tuple(parents), kwargs.pop("recipe", "code+input+seed-v1"),
                produce or default, kwargs.pop("validate", lambda b: bool(b)), "validator-v1",
                **kwargs)


class ArtifactDagTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def runner(self, nodes, **kwargs):
        return DagRunner(nodes, ArtifactStore(self.root), capacities=kwargs.pop("capacities", {"slots": 2}),
                         max_in_flight=kwargs.pop("max_in_flight", 2), disk_reserve_bytes=0, **kwargs)

    async def test_each_item_releases_downstream_before_slow_peer_and_join_waits(self):
        downstream = asyncio.Event()
        order = []

        async def slow(_):
            await asyncio.wait_for(downstream.wait(), .5)
            order.append("slow-s1")
            return b"slow"

        async def fast_stage(parents):
            path = parents["fast-s1"]
            self.assertEqual(path.read_bytes(), b"fast-s1")
            self.assertTrue((path.parent / "manifest.json").is_file())
            order.append("fast-s2")
            downstream.set()
            return b"fast-s2"

        async def joined(parents):
            self.assertEqual(set(parents), {"slow-s1", "fast-s2"})
            order.append("join")
            return b"joined"

        runner = self.runner([node("slow-s1", produce=slow), node("fast-s1"),
                              node("fast-s2", ["fast-s1"], fast_stage),
                              node("join", ["slow-s1", "fast-s2"], joined)])
        result = await runner.run()
        self.assertEqual(len(result), 4)
        self.assertLess(order.index("fast-s2"), order.index("slow-s1"))
        self.assertEqual(order[-1], "join")

    async def test_validation_failure_never_releases_successor_and_retains_bytes(self):
        called = []
        async def child(_):
            called.append(True)
            return b"bad"
        with self.assertRaises(ValueError):
            await self.runner([node("bad", validate=lambda _: False), node("child", ["bad"], child)]).run()
        self.assertEqual(called, [])
        self.assertEqual(list((self.root / "artifacts").iterdir()), [])
        self.assertEqual(len(list((self.root / "attempts").glob("*/payload"))), 1)
        self.assertEqual(len(list((self.root / "attempts").glob("*/failure.json"))), 1)

    async def test_resume_reuses_valid_parent_and_recipe_change_recomputes_descendants(self):
        counts = []
        async def produce(_):
            counts.append(True)
            return b"same-bytes"
        nodes = [node("a", produce=produce), node("b", ["a"], produce)]
        first = await self.runner(nodes).run()
        second = await self.runner(nodes).run()
        self.assertEqual(len(counts), 2)
        self.assertEqual(first, second)
        third = await self.runner([node("a", produce=produce, recipe="input-v2"), nodes[1]]).run()
        self.assertEqual(len(counts), 4)
        self.assertNotEqual(first["b"].identity, third["b"].identity)

    async def test_corrupt_cache_aborts_instead_of_reusing(self):
        nodes = [node("a")]
        result = await self.runner(nodes).run()
        result["a"].payload.write_bytes(b"corruption")
        with self.assertRaises(ValueError):
            await self.runner(nodes).run()

    async def test_aggregate_resources_fill_to_ceiling_without_oversubscription(self):
        active = peak = 0
        both = asyncio.Event()
        async def work(_):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            if active == 2:
                both.set()
            await asyncio.wait_for(both.wait(), .5)
            await asyncio.sleep(.001)
            active -= 1
            return b"done"
        nodes = [node(str(i), produce=work, resources={"ram": 3}) for i in range(6)]
        await self.runner(nodes, capacities={"ram": 7}, max_in_flight=6).run()
        self.assertEqual(peak, 2)

    async def test_failure_cancels_other_local_work_and_releases_lock(self):
        started = asyncio.Event()
        stopped = asyncio.Event()
        async def wait(_):
            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()
        async def fail(_):
            await started.wait()
            raise RuntimeError("expected")
        with self.assertRaises(RuntimeError):
            await self.runner([node("wait", produce=wait), node("fail", produce=fail)]).run()
        self.assertTrue(stopped.is_set())
        with ArtifactStore(self.root):
            pass

    async def test_cached_release_does_not_wait_for_unrelated_running_task(self):
        await self.runner([node("cached")]).run()
        released = asyncio.Event()
        async def slow(_):
            await asyncio.wait_for(released.wait(), .5)
            return b"done"
        async def child(_):
            released.set()
            return b"done"
        await self.runner([node("slow", produce=slow), node("cached"),
                           node("child", ["cached"], child)]).run()

    async def test_timeout_retains_attempt_without_commit(self):
        async def slow(_):
            await asyncio.sleep(1)
            return b"late"
        with self.assertRaises(TimeoutError):
            await self.runner([node("slow", produce=slow, timeout=.01)]).run()
        self.assertEqual(list((self.root / "artifacts").iterdir()), [])

    def test_cycle_missing_parent_and_resource_impossibility_fail_before_execution(self):
        for nodes in [[node("a", ["b"]), node("b", ["a"])], [node("a", ["missing"])],
                      [node("a", resources={"slots": 3})]]:
            with self.assertRaises(ValueError):
                self.runner(nodes)

    def test_single_owner_fences_duplicate_dispatch(self):
        with ArtifactStore(self.root):
            with self.assertRaises(BlockingIOError):
                with ArtifactStore(self.root):
                    pass

    def test_dag_drawio_matches_declared_artifact_edges(self):
        xml = ET.fromstring(self.runner([node("a"), node("b", ["a"])]).drawio())
        self.assertEqual(len(xml.findall(".//mxCell[@vertex='1']")), 2)
        self.assertEqual(len(xml.findall(".//mxCell[@edge='1']")), 1)

    def test_top_down_ceiling_uses_all_resources(self):
        self.assertEqual(concurrency_ceiling({"ram": 12, "cpu": 4}, {"ram": 3, "cpu": 1},
                                             100, provider_cap=8), 4)
        self.assertEqual(concurrency_ceiling({"ram": 2}, {"ram": 3}, 100, provider_cap=8), 0)

    async def test_fractional_resource_release_does_not_leave_stale_residue(self):
        async def slower(_):
            await asyncio.sleep(.01)
            return b"b"
        nodes = [node("a", resources={"r": .022}),
                 node("b", produce=slower, resources={"r": .071}),
                 node("c", ["a", "b"], resources={"r": .1})]
        self.assertEqual(len(await self.runner(nodes, capacities={"r": .1}).run()), 3)

    async def test_post_rename_sync_failure_blocks_resume_until_durability_recovered(self):
        called = []
        async def child(_):
            called.append(True)
            return b"child"
        nodes = [node("parent"), node("child", ["parent"], child)]
        sync = ArtifactStore._sync
        def broken(path):
            if path.name == "artifacts":
                raise OSError("injected durability failure")
            sync(path)
        with patch.object(ArtifactStore, "_sync", staticmethod(broken)):
            for _ in range(2):
                with self.assertRaises(OSError):
                    await self.runner(nodes).run()
                self.assertEqual(called, [])
        self.assertEqual(len(await self.runner(nodes).run()), 2)
        self.assertEqual(called, [True])


if __name__ == "__main__":
    unittest.main()
