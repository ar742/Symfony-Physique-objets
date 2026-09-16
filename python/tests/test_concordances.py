"""Independent mathematical checks for the native nodal concordance study."""
import copy
import json
import math
import random
import unittest

from physique_graphes import concordances as c


class ConcordanceTests(unittest.TestCase):
    def setUp(self):
        self.model = c.create_scenario()
        self.keys = c.GRAPH["controls"]

    def close(self, actual, expected, tolerance=1e-10):
        self.assertLessEqual(abs(actual-expected), tolerance, f"{actual} != {expected}")

    @staticmethod
    def coupled_model():
        result = c.create_scenario()
        result["environments"]["8"] = .2
        result["epsilon"]["8"].update({"2": .4, "4": .1, "6": .3})
        return result

    def test_default_balances_and_source_parabola(self):
        for s in (.1, .3, .5, .8):
            state = c.evaluate(self.model, {"s1": s, "s2": .37, "s5": .64, "s3": .23, "s7": .81})
            self.close(state["objective"], 2*s*(1-s))
            self.close(state["derivatives"]["gradient"][0], 2-4*s)
            for i in range(5):
                for j in range(5):
                    self.close(state["derivatives"]["hessian"][i][j], -4 if i == j == 0 else 0)
            for node in state["nodes"]:
                if node["id"] != "1":
                    self.close(node["input"], sum(flow["value"] for flow in state["flows"] if flow["to"] == node["id"]))
                if node["id"] != "8":
                    self.close(node["output"], sum(flow["value"] for flow in state["flows"] if flow["from"] == node["id"]))
        self.assertEqual(state["domain"], "rectified")
        self.assertEqual(state["objective_kind"], "output")

    def test_destination_first_and_distinct_final_objective(self):
        state = c.evaluate(self.coupled_model())
        self.close(state["objectives"]["arrivals"], .5)
        self.close(state["objectives"]["algebraic_arrivals"], .5)
        self.close(state["nodes"][-1]["coefficient"], .325)
        self.close(state["objective"], .1625)

    def test_rectification_and_unclipped_amplification(self):
        blocked = c.create_scenario()
        blocked["environments"]["2"] = 0
        state = c.evaluate(blocked)
        node = next(n for n in state["nodes"] if n["id"] == "2")
        self.close(node["raw_output"], -.25)
        self.assertEqual(node["output"], 0)
        self.assertTrue(node["rectified"])
        self.close(state["objective"], .25)
        amplified = c.create_scenario()
        for row in amplified["epsilon"].values():
            for key in row:
                row[key] = 1
        controls = {"s1": 1, "s2": 1, "s5": .5, "s3": 1, "s7": .5}
        state = c.evaluate(amplified, controls)
        # Along path1→2→3→4→8, x(1+x) gives 2,6,42,1806.
        self.close(state["objectives"]["arrivals"], 42)
        self.close(state["objective"], 1806)
        self.assertTrue(state["feasible"])
        self.assertFalse(c.evaluate(amplified, controls, domain="efficiency")["feasible"])

    def test_signed_subtractions_and_absolute_arrivals(self):
        model = c.create_scenario()
        model["environments"]["2"] = 0
        model["epsilon"]["5"]["1"] = 0
        controls = {"s1": .5, "s2": .8, "s5": .1, "s3": .6, "s7": .3}
        state = c.evaluate(model, controls, domain="signed")
        self.assertTrue(state["feasible"])
        self.close(next(n for n in state["nodes"] if n["id"] == "3")["input"], -.15)
        self.close(state["objectives"]["arrivals"], .35)
        self.close(state["objectives"]["algebraic_arrivals"], .25)
        self.close(state["objective"], .25)
        self.assertTrue(any(flow["value"] < 0 for flow in state["flows"]))
        self.assertTrue(all(not node["rectified"] for node in state["nodes"]))
        self.close(c.evaluate(model, controls)["objective"], .5)

    def test_random_matrix_lcg32_and_inactive_entries(self):
        first = c.randomize(self.model, 1)
        self.assertEqual(first, c.randomize(self.model, 1))
        self.close(first["epsilon"]["1"]["2"], 2*1015568748/2**32-1, 0)
        self.close(first["epsilon"]["1"]["3"], 2*1586005467/2**32-1, 0)
        self.assertEqual(sum(len(row) for row in first["epsilon"].values()), 64)
        self.assertTrue(all(first["epsilon"][str(i)][str(i)] == 0 for i in range(1, 9)))
        self.assertEqual(first["environments"], self.model["environments"])
        self.assertEqual(first["initial_controls"], self.model["initial_controls"])
        self.assertEqual(first["provenance"]["algorithm"], c.RANDOM_ALGORITHM)
        second = copy.deepcopy(first)
        active = {(edge["to"], edge["from"]) for edge in c.GRAPH["edges"]}
        for n, row in second["epsilon"].items():
            for origin in row:
                if n != origin and (n, origin) not in active:
                    row[origin] *= -1
        for domain in ("signed", "rectified"):
            self.assertEqual(c.evaluate(first, domain=domain), c.evaluate(second, domain=domain))
        canonical = c.validate_model(first)
        first["epsilon"]["1"]["2"] = 1
        self.assertNotEqual(first["epsilon"]["1"]["2"], canonical["epsilon"]["1"]["2"])

    def test_thresholds_do_not_fabricate_derivatives(self):
        model = c.create_scenario()
        model["environments"]["2"] = .5
        rectified, signed = c.evaluate(model), c.evaluate(model, domain="signed")
        self.assertFalse(rectified["derivatives"]["differentiable"])
        self.assertIsNone(rectified["derivatives"]["gradient"])
        self.assertTrue(signed["derivatives"]["differentiable"])
        self.close(signed["derivatives"]["gradient"][0], -.5)
        self.assertFalse(c.evaluate(model, domain="signed", objective="arrivals")["derivatives"]["differentiable"])
        constant = c.create_scenario()
        constant["environments"]["8"] = 0
        self.assertEqual(c.evaluate(constant)["derivatives"]["gradient"], [0]*5)

    def test_exact_jets_against_finite_differences(self):
        model = self.coupled_model()
        model["environments"]["2"] = 0
        model["epsilon"]["5"]["1"] = 0
        controls = {"s1": .4, "s2": .35, "s5": .55, "s3": .6, "s7": .3}
        h = 1e-6
        for domain in ("rectified", "signed"):
            for objective in ("output", "arrivals"):
                state = c.evaluate(model, controls, domain=domain, objective=objective)
                self.assertTrue(state["derivatives"]["differentiable"])
                for j, key in enumerate(self.keys):
                    before = c.evaluate(model, {**controls, key: controls[key]-h}, domain=domain, objective=objective)
                    after = c.evaluate(model, {**controls, key: controls[key]+h}, domain=domain, objective=objective)
                    self.close(state["derivatives"]["gradient"][j], (after["objective"]-before["objective"])/(2*h), 2e-8)
                    for i in range(5):
                        self.close(state["derivatives"]["hessian"][i][j], (after["derivatives"]["gradient"][i]-before["derivatives"]["gradient"][i])/(2*h), 2e-8)

    def test_interval_cuts_certify_default_but_not_signed_by_assumption(self):
        bound = c.bound_box(self.model, [[0, 1]]*5)
        self.assertGreaterEqual(bound["upper_bound"], .5)
        self.assertLess(bound["upper_bound"], .500000000001)
        result = c.search_global(self.model, max_nodes=0)
        self.assertEqual(result["status"], "certified")
        self.assertTrue(result["complete"])
        self.assertEqual(result["processed_nodes"], 0)
        self.assertLess(result["gap"], 1e-12)
        self.assertIsNone(c.bound_box(self.model, [[0, 1]]*5, domain="signed")["cut_bounds"])

    def test_intervals_cover_varied_laws_and_narrow_boxes(self):
        rng = random.Random(915)
        for trial in range(12):
            model = c.randomize(self.model, trial*357+3)
            model["environments"] = {n: rng.random() for n in model["environments"]}
            box = []
            for _ in self.keys:
                a, b = rng.random(), rng.random()
                box.append([a, min(1, a+1e-12)] if trial % 3 == 0 else sorted([a, b]))
            for domain in ("rectified", "signed"):
                for objective in ("output", "arrivals"):
                    bound = c.bound_box(model, box, domain=domain, objective=objective)
                    for _ in range(15):
                        controls = {key: lo+rng.random()*(hi-lo) for key, (lo, hi) in zip(self.keys, box)}
                        state = c.evaluate(model, controls, domain=domain, objective=objective, detailed=False)
                        self.assertLessEqual(state["objective"], bound["upper_bound"])
                        self.assertGreaterEqual(state["objective"], bound["lower_bound"])
                        for node in state["nodes"]:
                            self.assertGreaterEqual(node["output"], bound["nodes"][node["id"]]["output"][0])
                            self.assertLessEqual(node["output"], bound["nodes"][node["id"]]["output"][1])

    def test_grid_is_exhaustive_only_on_its_finite_mesh(self):
        events = []
        result = c.search_grid(self.model, on_progress=events.append)
        self.assertEqual(result["total"], 6**5)
        self.assertEqual(result["evaluations"], 7776)
        self.assertEqual(result["feasible_count"], 7776)
        self.assertTrue(result["complete"])
        self.assertEqual(result["status"], "complete")
        self.close(result["best"]["objective"], .48)
        self.assertIsNone(result["upper_bound"])
        self.assertIs(events[-1], result)
        exact = c.search_grid(self.model, divisions=4)
        self.close(exact["best"]["objective"], .5)
        prefix = c.search_grid(self.model, max_evaluations=3)
        self.assertEqual(prefix["evaluations"], 3)
        self.assertFalse(prefix["complete"])

    def test_local_and_global_budgets_and_cancellation(self):
        start = {**self.model["initial_controls"], "s1": .2}
        result = c.search_local(self.model, initial_controls=start, min_step=1e-4)
        self.close(result["best"]["objective"], .5)
        self.assertEqual(result["status"], "local-stop")
        self.assertIsNone(result["upper_bound"])
        self.assertLessEqual(result["evaluations"], 1000)
        current = c.randomize(self.model, 8)
        limited = c.search_global(current, domain="signed", max_nodes=0)
        partial = c.search_global(current, domain="signed", max_nodes=10)
        self.assertLessEqual(partial["processed_nodes"], 10)
        self.assertLessEqual(partial["upper_bound"], limited["upper_bound"])
        self.assertGreaterEqual(partial["upper_bound"], partial["best"]["objective"])
        for method in (c.search_grid, c.search_local, c.search_global):
            stopped = method(self.model, should_cancel=lambda: True)
            self.assertEqual(stopped["status"], "cancelled")
            self.assertEqual(stopped["evaluations"], 0)
            self.assertIsNone(stopped["best"])
        self.assertIsNone(c.search_grid(self.model, max_evaluations=0)["best"])
        self.assertIsNone(c.search_local(self.model, max_evaluations=0)["best"])

    def test_negative_maximum_never_becomes_zero(self):
        model = c.create_negative_scenario()
        # Independent conservation proof: every upstream transformation is an
        # identity, so X8=1 and C8=-X8=-1 for all five-share configurations.
        for controls in (model["initial_controls"], {"s1": .31, "s2": .67, "s5": .48, "s3": .29, "s7": .77}):
            state = c.evaluate(model, controls, domain="signed")
            self.close(state["objective"], -1)
            self.close(state["nodes"][-1]["input"], 1)
            self.close(state["nodes"][-1]["coefficient"], -1)
        for result in (c.search_grid(model, domain="signed", divisions=4),
                       c.search_local(model, domain="signed", max_evaluations=80),
                       c.search_global(model, domain="signed", max_nodes=8)):
            self.assertIsNotNone(result["best"])
            self.close(result["best"]["objective"], -1)
        self.assertEqual(result["status"], "node-limit")
        self.assertGreaterEqual(result["upper_bound"], -1)
        self.assertFalse(result["complete"])
        self.assertTrue(result["certificate"]["frontier"])
        self.close(c.evaluate(model)["objective"], 0)

    def test_free_lagrangian_coordinates_equalities_and_derivatives(self):
        model = self.coupled_model()
        model["environments"]["2"] = 0
        model["epsilon"]["5"]["1"] = 0
        controls = {"s1": .4, "s2": .35, "s5": .55, "s3": .6, "s7": .3}
        multipliers, h = [(i-10)/20 for i in range(21)], 1e-6
        for domain in ("rectified", "signed"):
            state = c.evaluate(model, controls, domain=domain)
            point = c.witness_point(state)
            self.assertEqual(len(point), 26)
            value = c.evaluate_lagrangian(model, point, multipliers=multipliers, domain=domain)
            # Rectified blocked nodes can create free-coordinate kinks, although
            # the compatible share map stays smooth. Signed case has none.
            self.assertEqual(len(value["constraints"]), 21)
            self.assertTrue(value["feasible"])
            self.close(value["lagrangian"], state["objective"])
            if not value["differentiable"]:
                self.assertIsNone(value["gradient"])
                continue
            for j in range(26):
                before, after = point[:], point[:]
                before[j] -= h
                after[j] += h
                left = c.evaluate_lagrangian(model, before, multipliers=multipliers, domain=domain)
                right = c.evaluate_lagrangian(model, after, multipliers=multipliers, domain=domain)
                self.close(value["gradient"][j], (right["lagrangian"]-left["lagrangian"])/(2*h), 2e-8)
                for i in range(26):
                    self.close(value["hessian"][i][j], (right["gradient"][i]-left["gradient"][i])/(2*h), 2e-8)
        reversed_flow = point[:]
        reversed_flow[2] = abs(reversed_flow[2])
        self.assertFalse(c.evaluate_lagrangian(model, reversed_flow, domain="signed")["share_admissible"])
        self.assertFalse(c.evaluate_lagrangian(model, [0]*26, domain="signed")["feasible"])
        self.assertTrue(c.evaluate_lagrangian(model, [0]*26, multipliers=multipliers, domain="signed")["differentiable"])

    def test_adjoint_is_local_and_matches_share_derivatives(self):
        model = self.coupled_model()
        model["environments"]["2"] = 0
        controls = {"s1": .4, "s2": .35, "s5": .55, "s3": .6, "s7": .3}
        for domain in ("rectified", "signed"):
            for objective in ("output", "arrivals"):
                state = c.evaluate(model, controls, domain=domain, objective=objective)
                explanation = c.explain_lagrangian(model, state)
                self.assertFalse(explanation["global_certificate"])
                self.close(explanation["at_reference"]["lagrangian"], state["objective"])
                for value in explanation["at_reference"]["selected_gradient"][12:]:
                    self.close(value, 0)
                for i, key in enumerate(self.keys):
                    n = key[1:]
                    outgoing = [flow for flow in state["flows"] if flow["from"] == n]
                    supply = next(node["output"] for node in state["nodes"] if node["id"] == n)
                    expected = supply*(explanation["edge_values"][outgoing[0]["id"]]-explanation["edge_values"][outgoing[1]["id"]])
                    self.close(state["derivatives"]["gradient"][i], expected)
        changed = copy.deepcopy(model)
        changed["environments"]["8"] = .1
        with self.assertRaises(ValueError):
            c.explain_lagrangian(changed, state)

    def test_invalid_models_controls_and_options_are_rejected(self):
        mutations = (lambda m: m.update(source=2), lambda m: m["environments"].update({"8": 1.2}),
                     lambda m: m["epsilon"]["8"].update({"2": -1.1}), lambda m: m["epsilon"].update({"1": {"1": .1}}),
                     lambda m: m["epsilon"]["3"].update({"9": 0}), lambda m: m["epsilon"].update({"9": {}}),
                     lambda m: m["initial_controls"].update(s3=True))
        for mutate in mutations:
            invalid = c.create_scenario()
            mutate(invalid)
            with self.assertRaises(ValueError):
                c.validate_model(invalid)
        for seed in (-1, 2**32, .1, True, math.inf, 10**1000):
            with self.assertRaises(ValueError):
                c.randomize(self.model, seed)
        bad_calls = (lambda: c.evaluate(self.model, domain="unknown"), lambda: c.evaluate(self.model, objective="absolute-output"),
                     lambda: c.search_grid(self.model, divisions=0), lambda: c.search_global(self.model, tolerance=0),
                     lambda: c.search_global(self.model, max_nodes=-1), lambda: c.search_local(self.model, min_step=.2, initial_step=.1),
                     lambda: c.bound_box(self.model, [[0, 1]]), lambda: c.evaluate_lagrangian(self.model, [0]*25),
                     lambda: c.evaluate_lagrangian(self.model, [0]*26, multipliers=[0]))
        for call in bad_calls:
            with self.assertRaises(ValueError):
                call()
        with self.assertRaises(TypeError):
            c.search_grid(self.model, unexpected=True)

    def test_results_are_json_serializable_and_input_is_not_mutated(self):
        original = copy.deepcopy(self.model)
        state = c.evaluate(self.model)
        result = c.search_global(self.model, max_nodes=0)
        for value in (state, result, c.explain_lagrangian(self.model, state)):
            json.dumps(value, allow_nan=False)
        self.assertEqual(self.model, original)
        state["controls"]["s1"] = .2
        self.assertEqual(self.model["initial_controls"]["s1"], .5)


if __name__ == "__main__":
    unittest.main()
