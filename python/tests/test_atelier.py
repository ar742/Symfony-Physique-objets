"""Intégration des calculs, figures et modèles éditables de l'atelier local."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from physique_graphes import dag, reseaux
from physique_graphes.optimisation import optimiser
from physique_graphes.visualisation import courbes, echantillonner_surface, graphe, nappe


def custom_model():
    """Un partage, une loi personnalisée : maximum analytique en s=1/2."""
    return {
        "mode": "nodes", "name": "Étude personnelle", "attributes": {"auteur": "Exemple", "mesures": []},
        "source": {"node": "S", "input": 1}, "sink": "T",
        "nodes": [
            {"id": "S", "law": {"name": "identity"}, "attributes": {"rôle": "source"}},
            {"id": "A", "law": {"name": "parabole", "parameters": {"amplitude": 1}}},
            {"id": "B", "law": {"name": "zero"}},
            {"id": "T", "law": {"name": "identity"}, "attributes": {"rôle": "sortie"}},
        ],
        "edges": [
            {"id": "SA", "from": "S", "to": "A", "fraction": .2, "attributes": {"note": "à conserver"}},
            {"id": "SB", "from": "S", "to": "B", "fraction": .8},
            {"id": "AT", "from": "A", "to": "T", "fraction": 1},
            {"id": "BT", "from": "B", "to": "T", "fraction": 1},
        ],
    }


PERSONAL_REGISTRY = {
    "parabole": lambda value, p: p["amplitude"] * 4 * value * (1 - value),
    "zero": lambda value, p: 0,
}


class AtelierTests(unittest.TestCase):
    def test_surface_all_samples_follow_compatible_recalculation(self):
        model = dag.create_branch_interior()

        def objective(s1, s2):
            return dag.evaluate(dag.with_binary_controls(model, {"1": s1, "2": s2}))["production"]

        x, y, z = echantillonner_surface(objective, .5, .5, radius=.1, points=9, bounds=[(0, 1)] * 2)
        self.assertEqual(z.shape, (9, 9))
        # Ici toutes les branches utilisées restent dans les portions annoncées.
        for row, s2 in enumerate(y):
            for col, s1 in enumerate(x):
                available = s1 * (1 - s1)
                expected = available - available**2 * (s2**2 + (1 - s2)**2)
                self.assertAlmostEqual(z[row, col], expected, places=14)
        self.assertAlmostEqual(z[4, 4], 7 / 32, places=14)

    def test_reference_marker_uses_its_own_value_not_nearest_grid_sample(self):
        def objective(x, y):
            return x**2 + 3 * y

        x0, y0 = .01, .03
        x, y, z = echantillonner_surface(objective, x0, y0, radius=.2, points=5, bounds=[(0, 1)] * 2)
        self.assertFalse(np.any(x == x0))
        self.assertFalse(np.any(y == y0))
        figure = nappe(x, y, z, reference=(x0, y0, objective(x0, y0)))
        marker = figure.data[1]
        self.assertEqual(list(marker.x), [x0])
        self.assertEqual(list(marker.y), [y0])
        self.assertAlmostEqual(marker.z[0], .0901)
        self.assertEqual(figure.data[0].connectgaps, False)

    def test_incompatible_samples_are_holes_and_no_reference_is_fabricated(self):
        x, y, z = echantillonner_surface(lambda a, b: a + b if a + b <= 1 else None,
                                         .5, .5, radius=.5, points=5)
        for row, vy in enumerate(y):
            for col, vx in enumerate(x):
                self.assertEqual(np.isnan(z[row, col]), vx + vy > 1)
        figure = nappe(x, y, z, reference=(.9, .9, None))
        self.assertEqual(len(figure.data), 1)
        self.assertFalse(figure.data[0].connectgaps)

    def test_surface_bounds_and_invalid_radius(self):
        x, y, _ = echantillonner_surface(lambda a, b: a + b, 0, 1, radius=.2, points=5, bounds=[(0, 1)] * 2)
        np.testing.assert_allclose(x, [0, .05, .1, .15, .2])
        np.testing.assert_allclose(y, [.8, .85, .9, .95, 1])
        for radius in (0, -.1, float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                echantillonner_surface(lambda a, b: 0, .5, .5, radius=radius)

    def test_surface_empty_intersection_must_not_sample_outside_bounds(self):
        with self.assertRaises(ValueError):
            echantillonner_surface(lambda a, b: a + b, 2, .5, radius=.1, points=3, bounds=[(0, 1)] * 2)

    def test_surface_rejects_invalid_bounds_before_evaluating_function(self):
        def never_called(x, y):
            self.fail("La fonction ne doit pas être évaluée avec des bornes invalides.")

        for bounds in ([], [(0, 1)], [(0, 1), (0, 1), (0, 1)],
                       [(1, 0), (0, 1)], [(0, 1), (float("nan"), 1)],
                       [(0, float("inf")), (0, 1)], [(0, 1), (0, 1, 2)]):
            with self.subTest(bounds=bounds), self.assertRaises(ValueError):
                echantillonner_surface(never_called, .5, .5, bounds=bounds)

    def test_surface_rejects_nonfinite_centers_and_noninteger_mesh(self):
        for x0, y0 in ((float("inf"), 0), (0, float("nan"))):
            with self.assertRaises(ValueError):
                echantillonner_surface(lambda a, b: a + b, x0, y0)
        for points in (2, 102, 4.5, True):
            with self.assertRaises(ValueError):
                echantillonner_surface(lambda a, b: a + b, .5, .5, points=points)

    def test_city_graph_has_six_nodes_nine_raw_links_and_no_directed_arrows(self):
        model = reseaux.villes_exemple()
        original = deepcopy(model)
        self.assertEqual(len(model["nodes"]), 6)
        self.assertEqual(len(model["edges"]), 9)
        self.assertEqual(len(reseaux.ponderer_villes(model)["edges"]), 18)
        figure = graphe(model, directed=False)
        self.assertEqual(len(figure.data), 2 * 9 + 1)
        self.assertEqual(len(figure.data[-1].x), 6)
        self.assertEqual(len(figure.layout.annotations), 0)
        self.assertEqual(list(figure.data[-1].x), [node["x"] for node in model["nodes"]])
        self.assertEqual(list(figure.data[-1].y), [node["y"] for node in model["nodes"]])
        self.assertEqual(model, original)

    def test_dag_figure_uses_node_and_branch_outputs_and_preserves_metadata(self):
        model = dag.create_branch_active()
        model["nodes"][0]["attributes"] = {"note": "<exemple>"}
        original = deepcopy(model)
        state = dag.evaluate(model)
        figure = graphe(model, {key: row["output"] for key, row in state["nodes"].items()}, state["y"])
        self.assertEqual(len(figure.data), 25)
        self.assertEqual(len(figure.layout.annotations), 12)
        self.assertEqual(len(figure.data[-1].x), 8)
        self.assertIn("0.45", figure.data[1].text[0])
        self.assertIn("&lt;exemple&gt;", figure.data[-1].hovertext[0])
        self.assertEqual(model, original)

    def test_missing_coordinates_get_layout_and_html_export_is_autonomous(self):
        model = custom_model()
        figure = graphe(model)
        self.assertEqual(len(figure.data[-1].x), 4)
        self.assertTrue(all(np.isfinite(value) for value in figure.data[-1].x))
        html = figure.to_html(include_plotlyjs=True)
        self.assertIn("Plotly.newPlot", html)
        self.assertNotRegex(html, r"<script\b[^>]*\bsrc=")
        self.assertNotIn("x", model["nodes"][0])

    def test_profile_preserves_order_values_and_axis_labels(self):
        figure = courbes([0, .2, .5], {"Profil exact": [0, .16, .25]}, xlabel="Partage", ylabel="Production")
        self.assertEqual(list(figure.data[0].x), [0, .2, .5])
        self.assertEqual(list(figure.data[0].y), [0, .16, .25])
        self.assertEqual(figure.layout.xaxis.title.text, "Partage")
        self.assertEqual(figure.layout.yaxis.title.text, "Production")

    def test_local_search_recovers_reference_from_perturbed_shares(self):
        model = dag.with_binary_controls(dag.create_branch_interior(), {"1": .3, "2": .25})
        original = deepcopy(model)
        initial = dag.evaluate(model)["production"]
        result = optimiser(model, method="local", iterations=60)
        self.assertTrue(result["best"]["feasible"])
        self.assertGreater(result["best"]["production"], initial)
        self.assertAlmostEqual(result["best"]["production"], 7 / 32, places=9)
        self.assertAlmostEqual(result["controls"]["1"], .5, places=5)
        self.assertAlmostEqual(result["controls"]["2"], .5, places=5)
        self.assertIsNone(result["upper_bound"])
        self.assertFalse(result["certified"])
        self.assertEqual(model, original)

    def test_custom_law_search_and_candidate_recheck(self):
        model = custom_model()
        original = deepcopy(model)
        for method in ("local", "exploration"):
            result = optimiser(model, method=method, registry=PERSONAL_REGISTRY, iterations=15, seed=31)
            self.assertAlmostEqual(result["best"]["production"], 1, places=8)
            self.assertAlmostEqual(result["controls"]["S"], .5, places=4)
            recalculated = dag.evaluate(dag.with_binary_controls(model, result["controls"]), registry=PERSONAL_REGISTRY)
            self.assertEqual(result["best"], recalculated)
            self.assertFalse(result["certified"])
            self.assertIsNone(result["upper_bound"])
        self.assertEqual(model, original)

    def test_modified_custom_law_recomputes_the_objective(self):
        model = custom_model()
        model["nodes"][1]["law"]["parameters"]["amplitude"] = .37
        result = optimiser(model, registry=PERSONAL_REGISTRY, iterations=30)
        self.assertAlmostEqual(result["best"]["production"], .37, places=10)

    def test_incompatible_search_does_not_return_a_fake_witness(self):
        model = dag.create_machine_eight()
        model["source"]["input"] = .21
        result = optimiser(model, iterations=2)
        self.assertIsNone(result["best"])
        self.assertIsNone(result["upper_bound"])
        self.assertFalse(result["certified"])

    def test_adopt_and_export_preserves_topology_laws_and_free_attributes(self):
        model = custom_model()
        result = optimiser(model, registry=PERSONAL_REGISTRY)
        adopted = dag.with_binary_controls(model, result["controls"])
        self.assertEqual(adopted["attributes"], model["attributes"])
        self.assertEqual(adopted["nodes"], model["nodes"])
        self.assertEqual(adopted["source"], model["source"])
        self.assertEqual(adopted["sink"], "T")
        for old, new in zip(model["edges"], adopted["edges"]):
            self.assertEqual({key: value for key, value in old.items() if key != "fraction"},
                             {key: value for key, value in new.items() if key != "fraction"})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "etude.json"
            dag.save_model(adopted, path)
            restored = dag.load_model(path)
            self.assertEqual(restored, adopted)
            self.assertAlmostEqual(dag.evaluate(restored, registry=PERSONAL_REGISTRY)["production"], 1, places=8)
        exported = json.loads(json.dumps({"model": adopted, "result": result}, allow_nan=False))
        self.assertEqual(exported["model"]["nodes"][-1]["id"], "T")
        self.assertEqual(exported["result"]["best"]["production"], result["best"]["production"])


if __name__ == "__main__":
    unittest.main()
