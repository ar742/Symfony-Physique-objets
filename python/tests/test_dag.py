"""Contrôles indépendants : valeurs rationnelles, bilans et modèle éditable."""

from copy import deepcopy
from fractions import Fraction
import json
from pathlib import Path
import tempfile
import unittest

from physique_graphes.dag import (
    binary_controls, create_branch_active, create_branch_interior,
    create_machine_eight, evaluate, load_model, save_model,
    validate_model, with_binary_controls,
)
from physique_graphes.lois import (
    LawDomainError, law_registry, piecewise_response, piecewise_yield,
)


IDENTITY = {"name": "identity", "parameters": {}}


def simple_graph(mode="branches"):
    model = {"mode": mode, "name": "Trois sorties et deux puits", "source": {"node": "A", "input": 2},
             "sink": "E", "nodes": [{"id": key, "name": key} for key in "ABCDE"],
             "edges": [{"id": "AB", "from": "A", "to": "B", "fraction": .2},
                       {"id": "AC", "from": "A", "to": "C", "fraction": .3},
                       {"id": "AD", "from": "A", "to": "D", "fraction": .5},
                       {"id": "BE", "from": "B", "to": "E", "fraction": 1},
                       {"id": "CE", "from": "C", "to": "E", "fraction": 1}]}
    for item in model["edges" if mode == "branches" else "nodes"]:
        item["law"] = deepcopy(IDENTITY)
    return model


class DAGTests(unittest.TestCase):
    def assert_balanced(self, state):
        self.assertTrue(state["feasible"], state["reason"])
        self.assertAlmostEqual(state["balance_residual"], 0, places=13)
        self.assertAlmostEqual(state["source_input"], state["exported"] + state["total_loss"], places=13)

    def test_interior_exact_reference_and_all_flows(self):
        state = evaluate(create_branch_interior())
        self.assert_balanced(state)
        self.assertAlmostEqual(state["production"], float(Fraction(7, 32)), places=14)
        expected = {"1-2": (Fraction(1, 2), Fraction(1, 4)), "1-5": (Fraction(1, 2), 0),
                    "2-3": (Fraction(1, 8), Fraction(7, 64)), "2-8": (Fraction(1, 8), Fraction(7, 64)),
                    "3-4": (Fraction(7, 64), Fraction(7, 64)), "4-8": (Fraction(7, 64), Fraction(7, 64))}
        for key, edge in state["edges"].items():
            q, y = expected.get(key, (0, 0))
            self.assertAlmostEqual(edge["input"], float(q), places=14)
            self.assertAlmostEqual(edge["output"], float(y), places=14)
            self.assertGreaterEqual(edge["loss"], 0)
        self.assertAlmostEqual(state["total_loss"], float(Fraction(25, 32)), places=14)

    def test_active_exact_reference_and_all_flows(self):
        state = evaluate(create_branch_active())
        self.assert_balanced(state)
        expected = {"1-2": (".5", ".45"), "1-5": (".5", ".45"),
                    "2-3": (".225", ".21375"), "2-8": (".225", ".1125"),
                    "5-3": (".1125", ".106875"), "5-7": (".3375", ".320625"),
                    "7-6": (".1603125", ".152296875"), "7-4": (".1603125", ".152296875"),
                    "3-4": (".1603125", ".152296875"), "3-6": (".1603125", ".152296875"),
                    "4-8": (".30459375", ".1675265625"), "6-8": (".30459375", ".1675265625")}
        for key, (q, y) in expected.items():
            self.assertAlmostEqual(state["q"][key], float(Fraction(q)), places=14)
            self.assertAlmostEqual(state["y"][key], float(Fraction(y)), places=14)
            self.assertGreater(state["q"][key], 0)
            self.assertGreater(state["y"][key], 0)
        self.assertAlmostEqual(state["production"], float(Fraction(143217, 320000)), places=14)

    def test_response_and_yield_are_different_and_continuous(self):
        p = {"a": .1, "b": .5, "c": .8, "d": .4}
        for x, expected in ((0, 0), (.1, 0), (.3, .4), (.5, .8), (.75, .6), (1, .4)):
            self.assertAlmostEqual(piecewise_response(x, p), expected)
            self.assertAlmostEqual(piecewise_yield(x, p), x * expected)
        for x in (-.001, 1.001):
            with self.assertRaises(LawDomainError):
                piecewise_response(x, p)

    def test_machine_active_reference_and_plateau(self):
        state = evaluate(create_machine_eight("active"))
        self.assert_balanced(state)
        # Sur cette chaîne : f(x)=2x−1/5, appliquée successivement à cinq nœuds.
        value = Fraction(49, 250)
        for key in ("M1", "M2", "M4", "M6", "M8"):
            self.assertAlmostEqual(state["nodes"][key]["input"], float(value), places=14)
            value = 2 * value - Fraction(1, 5)
            self.assertAlmostEqual(state["nodes"][key]["output"], float(value), places=14)
        self.assertEqual(value, Fraction(9, 125))
        self.assertAlmostEqual(state["production"], .072, places=14)
        self.assertEqual(evaluate(create_machine_eight("plateau"))["production"], 0)

    def test_machine_incompatible_sum_is_not_clipped(self):
        model = create_machine_eight()
        model["source"]["budget"] = 1
        model = with_binary_controls(model, {"M1": .5, "M3": 1}, source_input=.5)
        result = evaluate(model)
        self.assertFalse(result["feasible"])
        self.assertIsNone(result["production"])
        self.assertIn("M4", result["reason"])
        self.assertIn("aucun écrêtage", result["reason"])

    def test_budget_incompatibility_and_source_change(self):
        model = create_machine_eight()
        self.assertFalse(evaluate(with_binary_controls(model, {}, source_input=.21))["feasible"])
        self.assertAlmostEqual(evaluate(with_binary_controls(model, {}, source_input=.2))["production"], .2)
        self.assertEqual(model["source"]["input"], .196)

    def test_three_full_splits_and_multiple_sinks(self):
        for mode in ("branches", "nodes"):
            model = simple_graph(mode)
            state = evaluate(model)
            self.assert_balanced(state)
            self.assertEqual(state["exports"], {"D": 1, "E": 1})
            self.assertEqual(state["production"], 1)
            self.assertEqual(state["total_loss"], 0)
            self.assertEqual(binary_controls(model), {})
            with self.assertRaisesRegex(ValueError, "deux sorties"):
                with_binary_controls(model, {"A": .2})

    def test_custom_law_normal_python_import(self):
        from examples.lois_personnelles import PERSONAL_LAWS
        model = create_branch_active()
        model["edges"][0]["law"] = {"name": "rendement_constant", "parameters": {"eta": .9}}
        self.assertAlmostEqual(evaluate(model, registry=PERSONAL_LAWS)["production"], 143217 / 320000)
        with self.assertRaisesRegex(ValueError, "Loi inconnue"):
            evaluate(model)

    def test_custom_amplification_has_signed_balance_not_fake_loss(self):
        model = simple_graph("nodes")
        model["nodes"][0]["law"] = {"name": "double", "parameters": {}}
        state = evaluate(model, registry={"double": lambda value, _: 2 * value})
        self.assert_balanced(state)
        self.assertEqual(state["nodes"]["A"]["loss"], -2)
        self.assertEqual(state["exported"], 4)
        self.assertEqual(state["total_loss"], -2)

    def test_invalid_custom_outputs_are_incompatible(self):
        for output in (-1, float("inf"), float("nan"), True):
            model = simple_graph()
            model["edges"][0]["law"] = {"name": "invalid"}
            state = evaluate(model, registry={"invalid": lambda value, parameters, out=output: out})
            self.assertFalse(state["feasible"])
            self.assertIsNone(state["production"])

    def test_binary_controls_preserve_attributes_and_independence(self):
        model = create_branch_interior()
        model["edges"][0]["attributes"]["matiere"] = "exemple fictif"
        changed = with_binary_controls(model, {"1": .4, "2": .3})
        self.assertEqual(binary_controls(changed)["1"], .4)
        self.assertEqual(changed["edges"][1]["fraction"], .6)
        self.assertEqual(changed["edges"][3]["fraction"], .7)
        self.assertEqual(changed["edges"][0]["attributes"], model["edges"][0]["attributes"])
        changed["edges"][0]["law"]["parameters"]["d"] = .1
        self.assertEqual(model["edges"][0]["law"]["parameters"]["d"], 0)
        self.assertEqual(binary_controls(model)["1"], .5)
        self.assertNotAlmostEqual(evaluate(changed)["production"], evaluate(model)["production"])

    def test_partial_controls_and_rejection(self):
        model = create_branch_active()
        self.assertEqual(len(binary_controls(model)), 5)
        changed = with_binary_controls(model, {"5": .4})
        self.assertEqual(binary_controls(changed)["1"], .5)
        for controls in ({"8": .2}, {"1": 1.1}, {"1": True}, {"1": float("nan")}):
            with self.assertRaises(ValueError):
                with_binary_controls(model, controls)

    def test_cycle_is_rejected(self):
        model = simple_graph()
        model["edges"].append({"id": "EB", "from": "E", "to": "B", "fraction": 1, "law": deepcopy(IDENTITY)})
        model["sink"] = "D"
        with self.assertRaisesRegex(ValueError, "cycle"):
            validate_model(model)

    def test_invalid_structure_and_mixed_supports(self):
        model = create_branch_active()
        mutations = [lambda m: m["edges"][0].update(fraction=.9),
                     lambda m: m["edges"][0].update(to="absent"),
                     lambda m: m["edges"][1].update(id=m["edges"][0]["id"]),
                     lambda m: m["nodes"][1].update(id=m["nodes"][0]["id"]),
                     lambda m: m["nodes"][0].update(law=deepcopy(IDENTITY)),
                     lambda m: m["nodes"][0].update(x="gauche"),
                     lambda m: m["edges"][0].update(to=[]),
                     lambda m: m["edges"][0].pop("law"),
                     lambda m: m.update(sink="1"),
                     lambda m: m["source"].update(node="2"),
                     lambda m: m["nodes"].append({"id": "absent"}),
                     lambda m: m["source"].update(input=float("nan"))]
        for mutate in mutations:
            changed = deepcopy(model)
            mutate(changed)
            with self.assertRaises(ValueError):
                validate_model(changed)

    def test_bad_piecewise_parameters_and_reserved_registry(self):
        for params in ({"a": .5, "b": .5, "c": 1, "d": 0},
                       {"a": 0, "b": 1, "c": 1, "d": 0},
                       {"a": 0, "b": .5, "c": .5, "d": .6}):
            with self.assertRaises(ValueError):
                piecewise_response(.3, params)
        with self.assertRaises(ValueError):
            law_registry({"identity": lambda x, p: 0})

    def test_topological_order_ignores_display_order(self):
        model = create_branch_active()
        model["nodes"].reverse()
        order = validate_model(model)
        for edge in model["edges"]:
            self.assertLess(order.index(edge["from"]), order.index(edge["to"]))
        self.assertAlmostEqual(evaluate(model)["production"], 143217 / 320000)

    def test_json_roundtrip_and_editability(self):
        model = create_branch_active()
        model["nodes"][0]["attributes"] = {"observation": "aucune mesure", "unite": "sans dimension"}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "modele.json"
            save_model(model, path)
            restored = load_model(path)
            self.assertEqual(restored, model)
            restored["edges"][0]["law"]["parameters"]["d"] = 0
            self.assertNotAlmostEqual(evaluate(restored)["production"], evaluate(model)["production"])

    def test_shipped_presets_match_factories(self):
        folder = Path(__file__).resolve().parents[1] / "models"
        cases = {"branches-interieur.json": create_branch_interior(),
                 "branches-actives.json": create_branch_active(),
                 "machines-actives.json": create_machine_eight("active"),
                 "machines-plateau.json": create_machine_eight("plateau")}
        for filename, model in cases.items():
            restored = json.loads((folder / filename).read_text(encoding="utf-8"))
            self.assertEqual(restored, model)
            self.assert_balanced(evaluate(restored))


if __name__ == "__main__":
    unittest.main()
