"""Independent derivatives, domains and search-scope checks for workshop 04."""
from copy import deepcopy
import itertools
import math
import random
import unittest

from physique_graphes import concordances as c
from physique_graphes import optimisation_concordances as opt


class OptimizationConcordanceTests(unittest.TestCase):
    @staticmethod
    def model(seed=17, *, negative_environments=False):
        rng = random.Random(seed)
        model = c.randomize(c.create_scenario(), seed)
        model["environments"] = {str(i): rng.uniform(-.8, .8) if negative_environments else rng.uniform(.4, .8)
                                 for i in range(2, 9)}
        # Interior coefficients and shares support central differences.
        for row in model["epsilon"].values():
            for origin in row:
                row[origin] *= .2
        model["initial_controls"] = {key: rng.uniform(.2, .8) for key in c.GRAPH["controls"]}
        model["custom"] = {"notes": ["preserve me"], "purpose": "independent check"}
        return model

    @staticmethod
    def independent_output(model, domain):
        """Plain scalar evaluation, independent of jets, adjoints and searches."""
        outputs, flows = {"1": 1.0}, {}
        for node in c.GRAPH["order"]:
            if node != "1":
                incoming = [edge for edge in c.GRAPH["edges"] if edge["to"] == node]
                x = sum(flows[edge["id"]] for edge in incoming)
                coefficient = model["environments"][node] + sum(
                    model["epsilon"][node][edge["from"]]*flows[edge["id"]] for edge in incoming)
                value = x*coefficient
                outputs[node] = max(0, value) if domain == "rectified" else value
            outgoing = [edge for edge in c.GRAPH["edges"] if edge["from"] == node]
            for index, edge in enumerate(outgoing):
                share = model["initial_controls"][f"s{node}"] if len(outgoing) == 2 else 1
                flows[edge["id"]] = outputs[node]*(share if index == 0 else 1-share)
        return outputs["8"]

    def test_family_domains_and_only_twelve_active_coefficients(self):
        model = self.model()
        expected = {"shares": (5, [0.0, 1.0]), "environments": (7, [-1.0, 1.0]), "epsilon": (12, [-1.0, 1.0])}
        for group, (size, bound) in expected.items():
            with self.subTest(group=group):
                spec = opt.variables(model, group)
                self.assertEqual(len(spec["names"]), size)
                self.assertEqual(len(set(spec["names"])), size)
                self.assertEqual(spec["bounds"], [bound]*size)
        self.assertEqual(opt.variables(model, "epsilon")["names"][:4], ["eps_2_1", "eps_5_1", "eps_3_2", "eps_8_2"])

    def test_apply_changes_exactly_one_family_and_preserves_free_attributes(self):
        model = self.model()
        before = deepcopy(model)
        active = {(edge["to"], edge["from"]) for edge in c.GRAPH["edges"]}
        for group in opt.GROUPS:
            with self.subTest(group=group):
                spec = opt.variables(model, group)
                replacement = dict.fromkeys(spec["names"], .125)
                updated = opt.apply_values(model, group, replacement)
                self.assertEqual(opt.variables(updated, group)["values"], [.125]*len(spec["names"]))
                for other in set(opt.GROUPS)-{group}:
                    self.assertEqual(opt.variables(updated, other), opt.variables(model, other))
                self.assertEqual(updated["custom"], before["custom"])
                self.assertEqual(updated["provenance"], before["provenance"])
                for n, row in model["epsilon"].items():
                    for origin, value in row.items():
                        if (n, origin) not in active:
                            self.assertEqual(updated["epsilon"][n][origin], value)
                updated["custom"]["notes"].append("changed copy")
                self.assertEqual(model, before)

    def test_exact_gradients_against_independent_finite_differences(self):
        h = 2e-6
        cases = [(self.model(), "signed"), (self.model(), "rectified"),
                 (self.model(43, negative_environments=True), "signed")]
        blocked = self.model()
        blocked["environments"]["2"] = -.8
        cases.append((blocked, "rectified"))
        for model, domain in cases:
            for group in opt.GROUPS:
                with self.subTest(domain=domain, group=group, environments=model["environments"]):
                    actual = opt.gradient(model, group, domain=domain)
                    self.assertTrue(actual["differentiable"], actual["kinks"])
                    self.assertAlmostEqual(actual["state"]["objective"], self.independent_output(model, domain), places=14)
                    for index, derivative in enumerate(actual["gradient"]):
                        lower, upper = list(actual["values"]), list(actual["values"])
                        lower[index] -= h
                        upper[index] += h
                        expected = (self.independent_output(opt.apply_values(model, group, upper), domain)
                                    - self.independent_output(opt.apply_values(model, group, lower), domain))/(2*h)
                        self.assertTrue(math.isclose(derivative, expected, rel_tol=2e-6, abs_tol=2e-9),
                                        (group, index, derivative, expected))
                    if group == "shares":
                        jets = c.evaluate(model, domain=domain)["derivatives"]["gradient"]
                        for first, second in zip(actual["gradient"], jets):
                            self.assertAlmostEqual(first, second, places=13)

    def test_threshold_status_depends_on_the_selected_family(self):
        model = c.create_scenario()
        model["environments"]["8"] = 0
        # Final law is identically zero when only the distributions vary.
        shares = opt.gradient(model, "shares", domain="rectified")
        self.assertTrue(shares["differentiable"])
        self.assertEqual(shares["gradient"], [0]*5)
        # Varying e8 or an active incoming epsilon crosses max(0, X8 C8).
        for group in ("environments", "epsilon"):
            result = opt.gradient(model, group, domain="rectified")
            self.assertFalse(result["differentiable"])
            self.assertIsNone(result["gradient"])
            self.assertIsNone(result["projected_gradient"])
            self.assertIsNone(result["kkt"]["stationary"])
            self.assertFalse(result["kkt"]["available"])
            self.assertIn("8", [entry["node"] for entry in result["kinks"]])
            self.assertTrue(opt.gradient(model, group, domain="signed")["differentiable"])

    def test_projected_stationarity_does_not_require_zero_boundary_derivative(self):
        model = c.create_scenario()
        interior = opt.gradient(model, "shares")
        self.assertTrue(interior["kkt"]["stationary"])
        self.assertFalse(interior["kkt"]["global_certificate"])
        # For epsilon=0 and e=1, increasing any environment is favorable,
        # but its upper bound is already reached: nonzero gradients are valid.
        for row in model["epsilon"].values():
            for origin in row:
                row[origin] = 0
        boundary = opt.gradient(model, "environments")
        self.assertTrue(all(value > 0 for value in boundary["gradient"]))
        self.assertEqual(boundary["projected_gradient"], [0]*7)
        self.assertTrue(boundary["kkt"]["stationary"])

    def test_negative_environments_signed_outputs_and_native_interval_bounds(self):
        rng = random.Random(239)
        for trial in range(10):
            model = self.model(trial+20, negative_environments=True)
            # Exercise the full range of concordances as well as negative e.
            model["epsilon"] = c.randomize(model, trial+92)["epsilon"]
            box = [[0, 1]]*5 if trial % 2 == 0 else [[rng.uniform(0, .35), rng.uniform(.65, 1)] for _ in range(5)]
            for domain in ("signed", "rectified"):
                bound = c.bound_box(model, box, domain=domain)
                self.assertEqual(bound["arithmetic"], "outward-rounded-intervals")
                if domain == "signed":
                    self.assertIsNone(bound["cut_bounds"])
                for _ in range(12):
                    controls = {key: rng.uniform(*interval) for key, interval in zip(c.GRAPH["controls"], box)}
                    candidate = deepcopy(model)
                    candidate["initial_controls"] = controls
                    value = self.independent_output(candidate, domain)
                    self.assertGreaterEqual(value, bound["lower_bound"])
                    self.assertLessEqual(value, bound["upper_bound"])
        for value in (-1.0001, 1.0001, True, math.nan):
            model["environments"]["2"] = value
            with self.assertRaises(ValueError):
                c.validate_model(model)

    def test_search_local_recovers_the_known_share_maximum_without_certifying_it(self):
        model = c.create_scenario()
        model["initial_controls"]["s1"] = .2
        before = deepcopy(model)
        result = opt.search(model, method="local", max_evaluations=80)
        self.assertEqual(model, before)
        self.assertAlmostEqual(result["best_state"]["objective"], .5, places=12)
        self.assertAlmostEqual(result["values"][0], .5, places=7)
        self.assertFalse(result["certified"])
        self.assertIsNone(result["upper_bound"])
        self.assertTrue(result["stationarity"]["kkt"]["stationary"])
        self.assertLessEqual(result["evaluations"], 80)

    def test_complete_grid_is_only_a_finite_mesh_and_retains_the_initial_point(self):
        model = c.create_scenario()
        result = opt.search(model, method="grid", divisions=1, max_evaluations=33)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["total_grid_points"], 32)
        self.assertEqual(result["evaluations"], 33)
        self.assertEqual(result["best_state"]["objective"], .5)  # better than every vertex
        self.assertFalse(result["certified"])
        self.assertIsNone(result["gap"])

    def test_all_heuristics_respect_budget_and_cancel_before_evaluating(self):
        model = self.model()
        for group, method, budget in itertools.product(opt.GROUPS, ("local", "evolution", "grid"), (0, 1, 4)):
            with self.subTest(group=group, method=method, budget=budget):
                result = opt.search(model, group, method=method, max_evaluations=budget)
                self.assertLessEqual(result["evaluations"], budget)
                self.assertFalse(result["certified"])
                self.assertIsNone(result["upper_bound"])
                self.assertIsNone(result["best_model"]) if budget == 0 else self.assertIsNotNone(result["best_model"])
        for method in ("local", "evolution", "grid", "interval"):
            result = opt.search(model, method=method, should_cancel=lambda: True)
            self.assertEqual(result["status"], "cancelled")
            self.assertEqual(result["evaluations"], 0)
            self.assertIsNone(result["best_state"])

    def test_searches_leave_other_families_fixed_and_best_states_are_reproducible(self):
        model = self.model()
        before = deepcopy(model)
        for group, method in itertools.product(opt.GROUPS, ("local", "evolution", "grid")):
            with self.subTest(group=group, method=method):
                result = opt.search(model, group, method=method, max_evaluations=55, iterations=5)
                best = result["best_model"]
                self.assertEqual(best["custom"], model["custom"])
                for other in set(opt.GROUPS)-{group}:
                    self.assertEqual(opt.variables(best, other), opt.variables(model, other))
                self.assertGreaterEqual(result["best_state"]["objective"], c.evaluate(model, domain="signed")["objective"])
                self.assertAlmostEqual(result["best_state"]["objective"], self.independent_output(best, "signed"), places=12)
                self.assertEqual(model, before)
        first = opt.search(model, "epsilon", method="evolution", max_evaluations=110, seed=23)
        second = opt.search(model, "epsilon", method="evolution", max_evaluations=110, seed=23)
        self.assertEqual(first, second)

    def test_interval_certificate_scope_and_negative_maximum(self):
        result = opt.search(c.create_scenario(), method="interval", domain="rectified", max_nodes=0)
        self.assertTrue(result["certified"])
        self.assertLess(result["gap"], 1e-12)
        self.assertEqual(result["budget_kind"], "subproblem-nodes")
        self.assertEqual(result["processed_nodes"], 0)
        self.assertGreater(result["evaluations"], 0)
        negative = c.create_negative_scenario()
        for method in ("local", "grid", "evolution"):
            found = opt.search(negative, method=method, domain="signed", max_evaluations=40)
            self.assertAlmostEqual(found["best_state"]["objective"], -1, places=13)
        for group in ("environments", "epsilon"):
            with self.assertRaises(ValueError):
                opt.search(negative, group, method="interval")

    def test_validation_does_not_clip_values_or_accept_ambiguous_parameters(self):
        model = self.model()
        for group in opt.GROUPS:
            spec = opt.variables(model, group)
            for bad in (True, math.nan, math.inf, "0.5", spec["bounds"][0][0]-.01, spec["bounds"][0][1]+.01):
                vector = list(spec["values"])
                vector[0] = bad
                with self.assertRaises(ValueError):
                    opt.apply_values(model, group, vector)
            with self.assertRaises(ValueError):
                opt.apply_values(model, group, spec["values"][:-1])
            with self.assertRaises(ValueError):
                opt.apply_values(model, group, {"wrong": 0})
        for options in ({"max_evaluations": -.1}, {"iterations": 0}, {"divisions": 0}, {"seed": True},
                        {"max_nodes": -1}, {"tolerance": 0}, {"domain": "efficiency"}, {"method": "false-certificate"}):
            with self.assertRaises(ValueError):
                opt.search(model, **options)
        with self.assertRaises(ValueError):
            opt.variables(model, "everything")


if __name__ == "__main__":
    unittest.main()
