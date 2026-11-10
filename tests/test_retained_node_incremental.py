"""Incremental record retention: completed records survive a later failure."""
import unittest

from retained_node import NodeAttempt, execute_incremental_node


def attempt():
    return NodeAttempt(
        study_revision="s1", trial_id="t1", execution_id="e1", parent_execution_id=None,
        node_attempt_id="n1", logical_key="score", recipe_id="r1", validator_id="v1",
        output_ports=("summary",), storage_binding="b1", staging_key="k1", output_bundle="o1",
    )


class Store:
    def __init__(self):
        self.events = []

    def load_accepted(self, reference):
        return reference

    def record_started(self, node_attempt):
        self.events.append(("started",))

    def record_failed(self, node_attempt, failure):
        self.events.append(("failed", dict(failure)))

    def retain_record(self, node_attempt, record_key, payload):
        self.events.append(("retained", record_key, payload))
        return f"ack:{record_key}"

    def validate_and_commit_bundle(self, node_attempt, outputs, lineage):
        raise AssertionError("an incremental node must commit over its retained records")

    def validate_and_commit_retained_bundle(self, node_attempt, outputs, lineage, retained):
        self.events.append(("committed", dict(retained)))
        return {port: f"ref:{port}" for port in outputs}


class IncrementalNodeTest(unittest.TestCase):
    def run_node(self, function):
        store = Store()
        return store, lambda: execute_incremental_node(lambda: store, attempt(), function, [])

    def test_each_record_is_acknowledged_before_the_next_is_computed(self):
        order = []

        def score():
            for key in ("a", "b"):
                order.append(f"computed:{key}")
                yield key, {"row": key}
                order.append(f"resumed-after:{key}")
            return {"summary": 2}

        store, run = self.run_node(score)
        original = store.retain_record
        store.retain_record = lambda a, key, payload: (order.append(f"retained:{key}"), original(a, key, payload))[1]
        refs = run()
        self.assertEqual(order, ["computed:a", "retained:a", "resumed-after:a", "computed:b", "retained:b", "resumed-after:b"])
        self.assertEqual(refs["summary"].payload, "ref:summary")
        self.assertEqual(store.events[-1], ("committed", {"a": "ack:a", "b": "ack:b"}))

    def test_records_completed_before_a_failure_stay_retained(self):
        def score():
            yield "a", 1
            yield "b", 2
            raise RuntimeError("slow third record failed")

        store, run = self.run_node(score)
        with self.assertRaises(RuntimeError):
            run()
        self.assertEqual([event[1] for event in store.events if event[0] == "retained"], ["a", "b"])
        self.assertEqual(store.events[-1], ("failed", {"type": "RuntimeError", "retainedRecords": "2"}))
        self.assertFalse(any(event[0] == "committed" for event in store.events))

    def test_duplicate_keys_and_wrong_ports_are_rejected_without_commit(self):
        def duplicate():
            yield "a", 1
            yield "a", 2
            return {"summary": 0}

        def wrong_ports():
            yield "a", 1
            return {"other": 0}

        for function, error in ((duplicate, ValueError), (wrong_ports, TypeError)):
            store, run = self.run_node(function)
            with self.assertRaises(error):
                run()
            self.assertFalse(any(event[0] == "committed" for event in store.events))
            self.assertEqual(store.events[-1][0], "failed")


if __name__ == "__main__":
    unittest.main()
