"""Vérifications analytiques des réponses, des transferts et de l'horizon."""

import copy
import math
import unittest

from physique_graphes.production import f_piecewise, pas_production, production_exemple, simuler_production


class ProductionTests(unittest.TestCase):
    def assertVectorClose(self, actual, expected, places=12):
        self.assertEqual(len(actual), len(expected))
        for a, e in zip(actual, expected):
            self.assertAlmostEqual(a, e, places=places)

    def test_piecewise_limits_and_segments(self):
        params = dict(a=.1, b=.5, c=.8, d=.4)
        for x, expected in ((0, 0), (.1, 0), (.3, .4), (.5, .8), (.75, .6), (1, .4)):
            self.assertAlmostEqual(f_piecewise(x, params), expected)
        self.assertEqual(f_piecewise(1, dict(a=0, b=.5, c=1, d=0)), 0)
        self.assertEqual(f_piecewise(.8, dict(a=.1, b=.5, c=.7, d=.7)), .7)
        self.assertEqual(f_piecewise(.8, dict(a=.1, b=.5, c=0, d=0)), 0)

    def test_balanced_exact_fixed_point_and_external_outputs(self):
        model = production_exemple()
        row = pas_production(model, [.275, .265, .1875])
        self.assertVectorClose(row["input"], [.2375, .2325, .19375])
        self.assertVectorClose(row["outputs"], [.275, .265, .1875])
        self.assertVectorClose(row["externalOutputs"], [.165, .19875, .15])
        self.assertLess(row["residual"], 1e-15)
        result = simuler_production(model)
        self.assertEqual(len(result["history"]), 41)
        self.assertVectorClose(result["finalOutputs"], [.275, .265, .1875], places=10)
        self.assertEqual(result["status"], "approximate")

    def test_threshold_has_multiple_fixed_points(self):
        model = production_exemple("threshold")
        blocked = simuler_production(model)
        self.assertEqual(blocked["finalOutputs"], [0, 0, 0])
        for value in (.4, 27 / 35):
            self.assertVectorClose(pas_production(model, [value] * 3)["outputs"], [value] * 3)
        for machine in model["machines"]:
            machine["initial"] = .8
        self.assertVectorClose(simuler_production(model)["finalOutputs"], [27 / 35] * 3)

    def test_exact_alternation_and_observation_horizon(self):
        model = production_exemple("oscillating")
        for cycles in (3, 4, 5, 40):
            result = simuler_production(model, cycles)
            self.assertEqual(result["finalOutputs"], [cycles % 2, cycles % 2, 0])
            self.assertEqual(result["residual"], 1)
            self.assertEqual(result["period2Observed"], cycles >= 4)
            self.assertEqual(result["status"], "stillvarying")

    def test_synchronous_updates_do_not_use_new_output_early(self):
        row = pas_production(production_exemple("oscillating"), [0, 0, 0])
        self.assertEqual(row["outputs"], [1, 1, 0])
        self.assertEqual([flow["sent"] for flow in row["flows"]], [0, 0])
        self.assertEqual([flow["nextSent"] for flow in row["flows"]], [.5, .5])
        self.assertEqual(row["previousOutputs"], [0, 0, 0])

    def test_conversion_saturation_and_no_implicit_stock(self):
        model = {"machines": [{"id": name, "a": 0, "b": .5, "c": 1, "d": 1, "external": e}
                              for name, e in (("A", 0), ("B", .2))],
                 "allocations": [{"from": "A", "to": "B", "fraction": 1, "conversion": 2}]}
        row = pas_production(model, [1, 0])
        self.assertVectorClose(row["rawInput"], [0, 2.2])
        self.assertEqual(row["input"], [0, 1])
        self.assertVectorClose(row["overflow"], [0, 1.2])
        self.assertEqual(row["flows"][0]["sent"], 1)
        self.assertEqual(row["flows"][0]["offered"], 2)
        following = pas_production(model, row["outputs"])
        self.assertVectorClose(following["rawInput"], [0, .2])
        self.assertVectorClose(following["outputs"], [0, .4])

    def test_allocated_and_external_outputs_partition_each_production(self):
        model = production_exemple()
        row = pas_production(model, [.3, .4, .5])
        for index, machine in enumerate(model["machines"]):
            exported = sum(flow["nextSent"] for flow in row["flows"] if flow["from"] == machine["id"])
            self.assertAlmostEqual(exported + row["externalOutputs"][index], row["outputs"][index])

    def test_final_residual_is_after_last_transition(self):
        model = production_exemple()
        result = simuler_production(model, cycles=1)
        self.assertEqual(result["residual"], pas_production(model, result["finalOutputs"])["residual"])
        self.assertNotEqual(result["residual"], result["history"][-1]["residual"])
        zero = simuler_production(model, cycles=0)
        self.assertEqual(len(zero["history"]), 1)
        self.assertIsNone(zero["history"][0]["input"])
        self.assertEqual(zero["residual"], .2)

    def test_initial_values_and_missing_initial(self):
        model = production_exemple("threshold")
        for machine in model["machines"]:
            machine["initial"] = .8
        self.assertEqual(simuler_production(model, cycles=0)["finalOutputs"], [.8] * 3)
        del model["machines"][1]["initial"]
        self.assertEqual(simuler_production(model, cycles=0)["finalOutputs"], [.8, 0, .8])

    def test_permutations_preserve_machine_results_and_canonical_flows(self):
        model = production_exemple()
        original = simuler_production(model, 10)
        shuffled = copy.deepcopy(model)
        shuffled["machines"].reverse()
        shuffled["allocations"].reverse()
        alternative = simuler_production(shuffled, 10)
        self.assertEqual(original["finalOutputs"], list(reversed(alternative["finalOutputs"])))
        self.assertEqual(original["history"][-1]["flows"], alternative["history"][-1]["flows"])

    def test_invalid_parameters_and_inputs(self):
        good = dict(a=.1, b=.5, c=.8, d=.4)
        for changes in ({"a": .5}, {"b": 1}, {"c": .3}, {"d": -1}, {"a": True}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                f_piecewise(.2, {**good, **changes})
        for bad in (True, -1, 1.1, math.inf, math.nan):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                f_piecewise(bad, good)
        with self.assertRaises(ValueError):
            pas_production(production_exemple(), [0])
        with self.assertRaises(ValueError):
            production_exemple("absent")

    def test_invalid_allocations_are_not_clamped(self):
        for change in ({"conversion": 0}, {"fraction": 2}, {"to": "M1"}):
            model = production_exemple()
            model["allocations"][0].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                simuler_production(model)
        duplicate = production_exemple()
        duplicate["allocations"].append(copy.deepcopy(duplicate["allocations"][0]))
        with self.assertRaises(ValueError):
            simuler_production(duplicate)
        excessive = production_exemple()
        excessive["allocations"][0]["fraction"] = .95
        with self.assertRaises(ValueError):
            simuler_production(excessive)

    def test_invalid_simulation_options(self):
        for cycles in (-1, 1.5, True, 10001):
            with self.subTest(cycles=cycles), self.assertRaises(ValueError):
                simuler_production(production_exemple(), cycles)
        for tolerance in (0, -1, math.nan, True):
            with self.subTest(tolerance=tolerance), self.assertRaises(ValueError):
                simuler_production(production_exemple(), tolerance=tolerance)

    def test_no_mutation_or_shared_presets(self):
        model = production_exemple()
        before = copy.deepcopy(model)
        outputs = [.1, .2, .3]
        pas_production(model, outputs)
        simuler_production(model)
        self.assertEqual(model, before)
        self.assertEqual(outputs, [.1, .2, .3])
        model["machines"][0]["a"] = .2
        self.assertEqual(production_exemple()["machines"][0]["a"], .1)


if __name__ == "__main__":
    unittest.main()
