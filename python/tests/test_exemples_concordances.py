"""Scientific properties and preservation guarantees for the example menu."""
from copy import deepcopy
from fractions import Fraction
import json
import math
import random
import unittest

from physique_graphes import concordances as c
from physique_graphes.exemples_concordances import EXAMPLES, create_example, randomize_matrix


class ConcordanceExampleTests(unittest.TestCase):
    def close(self, value, expected, tolerance=1e-10):
        self.assertLessEqual(abs(value-expected), tolerance)

    def test_all_examples_are_independent_complete_native_models(self):
        self.assertEqual(len(EXAMPLES), 9)
        self.assertEqual(list(EXAMPLES)[:3], ["reference", "negative", "neutral"])
        for example_id, metadata in EXAMPLES.items():
            with self.subTest(example=example_id):
                self.assertTrue(metadata["title"] and metadata["description"])
                model = create_example(example_id)
                c.validate_model(model)
                self.assertEqual(model["source"], 1)
                self.assertEqual(model["initial_controls"], {key: .5 for key in c.GRAPH["controls"]})
                self.assertEqual(set(model["epsilon"]), set(map(str, range(1, 9))))
                for n, row in model["epsilon"].items():
                    self.assertEqual(set(row), set(map(str, range(1, 9))))
                    self.assertEqual(row[n], 0)
                    self.assertTrue(all(-1 <= value <= 1 for value in row.values()))
                self.assertEqual(model["provenance"]["example_id"], example_id)
                json.dumps(model, allow_nan=False)
                for domain in ("rectified", "signed"):
                    state = c.evaluate(model, domain=domain)
                    self.assertTrue(state["feasible"])
                    self.assertEqual(len(state["nodes"]), 8)
                    self.assertEqual(len(state["flows"]), 12)
                    self.assertTrue(state["derivatives"]["differentiable"])
                    self.assertTrue(math.isfinite(state["objective"]))
                pristine = create_example(example_id)
                model["environments"]["2"] = .123
                model["epsilon"]["2"]["1"] = .123
                model["initial_controls"]["s1"] = .123
                self.assertEqual(create_example(example_id), pristine)

    def test_reference_and_negative_preserve_their_known_laws(self):
        rng = random.Random(915)
        reference, negative = create_example("reference"), create_example("negative")
        for _ in range(25):
            controls = {key: rng.random() for key in c.GRAPH["controls"]}
            s = controls["s1"]
            for domain in ("rectified", "signed"):
                self.close(c.evaluate(reference, controls, domain=domain)["objective"], 2*s*(1-s))
            self.close(c.evaluate(negative, controls, domain="signed")["objective"], -1)
            self.close(c.evaluate(negative, controls, domain="rectified")["objective"], 0)

    def test_neutral_and_inactive_coefficients_conserve_total_for_all_tested_shares(self):
        neutral, inactive = create_example("neutral"), create_example("inactive")
        self.assertEqual(sum(value == 1 for row in inactive["epsilon"].values() for value in row.values()), 44)
        self.assertTrue(all(inactive["epsilon"][edge["to"]][edge["from"]] == 0 for edge in c.GRAPH["edges"]))
        for code in range(32):
            controls = {key: (code >> i) & 1 for i, key in enumerate(c.GRAPH["controls"])}
            for domain in ("rectified", "signed"):
                first = c.evaluate(neutral, controls, domain=domain)
                second = c.evaluate(inactive, controls, domain=domain)
                self.assertEqual(first, second)
                self.close(first["objective"], 1)
        first = c.evaluate(neutral)
        self.assertTrue(all(abs(v) < 1e-12 for v in first["derivatives"]["gradient"]))
        self.assertTrue(all(abs(v) < 1e-12 for row in first["derivatives"]["hessian"] for v in row))

    def test_positive_and_inhibitory_initial_values_have_independent_rational_calculation(self):
        # Full ±1 rows give g(x)=x(1±x); perform the whole DAG with exact fractions.
        for example_id, sign, expected in (("positive", 1, Fraction(1267226673, 67108864)),
                                           ("inhibitory", -1, Fraction(15775215, 67108864))):
            model = create_example(example_id)
            self.assertEqual(sum(value == sign for row in model["epsilon"].values() for value in row.values()), 56)
            outputs, transfers = {"1": Fraction(1)}, {}
            for n in c.GRAPH["order"]:
                incoming = [edge for edge in c.GRAPH["edges"] if edge["to"] == n]
                outgoing = [edge for edge in c.GRAPH["edges"] if edge["from"] == n]
                if n != "1":
                    x = sum((transfers[edge["id"]] for edge in incoming), Fraction(0))
                    outputs[n] = x*(1+sign*x)
                for edge in outgoing:
                    transfers[edge["id"]] = outputs[n]/len(outgoing)
            self.assertEqual(outputs["8"], expected)
            for domain in ("rectified", "signed"):
                self.close(c.evaluate(model, domain=domain)["objective"], float(expected), 0)
        self.assertGreater(c.evaluate(create_example("positive"))["objective"], 1)

    def test_inhibitory_coefficients_do_not_imply_negative_productions(self):
        model, rng = create_example("inhibitory"), random.Random(37)
        for _ in range(30):
            controls = {key: rng.random() for key in c.GRAPH["controls"]}
            signed, rectified = (c.evaluate(model, controls, domain=domain) for domain in ("signed", "rectified"))
            self.close(signed["objective"], rectified["objective"])
            for node in signed["nodes"]:
                self.assertGreaterEqual(node["input"], 0)
                self.assertLessEqual(node["input"], 1)
                self.assertGreaterEqual(node["output"], 0)
                self.assertLessEqual(node["output"], node["input"])

    def test_seed_examples_reproduce_the_native_generator_and_declared_initial_values(self):
        for seed, expected in ((7, .016087262285171305), (8, .20594989282494972), (34, .24918179253353884)):
            model = create_example(f"seed-{seed}")
            baseline = c.create_scenario()
            baseline["environments"] = {n: .5 for n in baseline["environments"]}
            generated = c.randomize(baseline, seed)
            self.assertEqual(model["epsilon"], generated["epsilon"])
            self.assertEqual(model["environments"], generated["environments"])
            self.assertEqual(model["provenance"]["matrix"], generated["provenance"])
            for domain in ("rectified", "signed"):
                self.close(c.evaluate(model, domain=domain)["objective"], expected, 1e-15)

    def test_randomization_changes_only_matrix_and_provenance_without_aliases(self):
        model = create_example("negative")
        model["environments"]["3"] = .61
        model["initial_controls"]["s5"] = .27
        model["labels"] = {"3": {"title": "Association choisie", "notes": ["à revoir"]}}
        model["domain"] = "signed"
        before = deepcopy(model)
        result = randomize_matrix(model, 123456789)
        self.assertEqual(model, before)
        self.assertEqual(set(result), set(model))
        for key in model.keys()-{"epsilon", "provenance"}:
            self.assertEqual(result[key], model[key])
        expected = c.randomize(model, 123456789)
        self.assertEqual(result["epsilon"], expected["epsilon"])
        self.assertEqual(result["provenance"], expected["provenance"])
        self.assertEqual(result, randomize_matrix(model, 123456789))
        self.assertNotEqual(result["epsilon"], randomize_matrix(model, 123456790)["epsilon"])
        result["labels"]["3"]["notes"].append("modification de la copie")
        result["environments"]["3"] = .42
        result["initial_controls"]["s5"] = .8
        result["epsilon"]["2"]["1"] = .99
        self.assertEqual(model, before)

    def test_randomization_keeps_optional_fields_absent_and_rejects_invalid_inputs(self):
        model = create_example("neutral")
        del model["initial_controls"]
        result = randomize_matrix(model, 0)
        self.assertNotIn("initial_controls", result)
        self.assertEqual(result["source"], 1)
        c.validate_model(result)
        for seed in (-1, 2**32, .5, True, None):
            with self.assertRaises(ValueError):
                randomize_matrix(model, seed)
        for example_id in ("missing", "seed-9", None, [], 1):
            with self.assertRaises(ValueError):
                create_example(example_id)
        model["epsilon"]["3"]["3"] = 1
        with self.assertRaises(ValueError):
            randomize_matrix(model, 7)


if __name__ == "__main__":
    unittest.main()
