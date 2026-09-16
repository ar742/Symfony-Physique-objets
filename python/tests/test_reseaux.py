"""Cas analytiques et limites des trois algorithmes, sans dépendance au web."""

import copy
import math
import unittest

from physique_graphes.reseaux import (
    bellman_ford, dijkstra, distance, floyd_warshall, parcours_bornes,
    ponderer_villes, routes_dependantes, sensibilite_dependance, villes_exemple,
)


def graph(nodes, edges):
    return {"nodes": [{"id": i} for i in nodes],
            "edges": [{"from": a, "to": b, "weight": w} for a, b, w in edges]}


class ReseauxTests(unittest.TestCase):
    def test_villes_coordinates_and_euclidean_weights(self):
        raw = villes_exemple()
        weighted = ponderer_villes(raw)
        self.assertEqual((len(raw["nodes"]), len(raw["edges"]), len(weighted["edges"])), (6, 9, 18))
        self.assertEqual(distance({"x": 0, "y": 0}, {"x": 3, "y": 4}), 5)
        self.assertEqual(dijkstra(weighted, "A", "F"), {"distance": 12, "path": ["A", "B", "D", "F"]})
        self.assertEqual(dijkstra(weighted, "A", "E"), {"distance": 8, "path": ["A", "B", "E"]})

    def test_weighting_directed_and_already_bidirectional(self):
        raw = villes_exemple()
        self.assertEqual(len(ponderer_villes(raw, bidirectionnel=False)["edges"]), 9)
        weighted = ponderer_villes(raw)
        self.assertEqual(ponderer_villes(weighted), weighted)
        raw["edges"][0]["weight"] = 999
        self.assertEqual(ponderer_villes(raw)["edges"][0]["weight"], 3)

    def test_all_city_pairs_independent_algorithms(self):
        city = ponderer_villes(villes_exemple())
        matrix = floyd_warshall(city)
        for a in "ABCDEF":
            for b in "ABCDEF":
                with self.subTest(a=a, b=b):
                    self.assertEqual(dijkstra(city, a, b), matrix[a][b])
                    self.assertEqual(bellman_ford(city, a, b), matrix[a][b])

    def test_ties_prefer_fewer_arcs_then_identifiers(self):
        g = graph("ABCD", [("A", "C", 1), ("C", "D", 1), ("A", "B", 1), ("B", "D", 1)])
        for algorithm in (dijkstra, bellman_ford, floyd_warshall):
            self.assertEqual(algorithm(g, "A", "D")["path"], ["A", "B", "D"])
            direct = copy.deepcopy(g)
            direct["edges"].append({"from": "A", "to": "D", "weight": 2})
            self.assertEqual(algorithm(direct, "A", "D")["path"], ["A", "D"])

    def test_unicode_ties_use_javascript_code_unit_order(self):
        low, high = "\U00010000", "\ue000"
        g = graph(["A", "Z", low, high], [("A", high, 1), (high, "Z", 1), ("A", low, 1), (low, "Z", 1)])
        for algorithm in (dijkstra, bellman_ford, floyd_warshall):
            self.assertEqual(algorithm(g, "A", "Z")["path"], ["A", low, "Z"])

    def test_unreachable_and_identity(self):
        g = graph("AB", [])
        for algorithm in (dijkstra, bellman_ford, floyd_warshall):
            self.assertEqual(algorithm(g, "A", "B"), {"distance": math.inf, "path": []})
            self.assertEqual(algorithm(g, "A", "A"), {"distance": 0, "path": ["A"]})

    def test_negative_arc_and_irrelevant_cycle(self):
        g = graph("ABCDE", [("A", "B", 4), ("B", "C", -6), ("A", "C", 1), ("D", "E", -2), ("E", "D", 1)])
        with self.assertRaises(ValueError):
            dijkstra(g, "A", "C")
        for algorithm in (bellman_ford, floyd_warshall):
            self.assertEqual(algorithm(g, "A", "C"), {"distance": -2, "path": ["A", "B", "C"]})
        with self.assertRaises(ValueError):
            floyd_warshall(g)

    def test_reachable_cycle_only_errors_if_it_can_reach_destination(self):
        g = graph("ABCD", [("A", "B", 1), ("B", "B", -1), ("A", "D", 3)])
        for algorithm in (bellman_ford, floyd_warshall):
            self.assertEqual(algorithm(g, "A", "D")["distance"], 3)
            with self.assertRaises(ValueError):
                algorithm(g, "A", "B")

    def test_simple_paths_strict_bound_ordered_pairs_and_no_cycles(self):
        g = graph("ABC", [("A", "B", 1), ("B", "A", 1), ("B", "C", 1), ("C", "B", 1)])
        result = parcours_bornes(g, 3)
        self.assertTrue(result["complete"])
        self.assertEqual(len(result["paths"]), 6)
        self.assertEqual(len(parcours_bornes(g, 2)["paths"]), 4)
        self.assertEqual(parcours_bornes(g, 99, "A", "A")["paths"], [])
        self.assertIn({"distance": 2, "path": ["C", "B", "A"]}, result["paths"])
        self.assertTrue(all(len(p["path"]) == len(set(p["path"])) for p in result["paths"]))

    def test_negative_prefix_not_pruned(self):
        g = graph("ABC", [("A", "B", 10), ("B", "C", -20)])
        self.assertEqual(parcours_bornes(g, 0, "A", "C")["paths"], [{"distance": -10, "path": ["A", "B", "C"]}])

    def test_budgets_report_incompleteness_without_claiming_top_k(self):
        g = graph("ABC", [("A", "B", 1), ("B", "C", 1)])
        full = parcours_bornes(g, 99)
        self.assertEqual(len(full["paths"]), 3)
        self.assertTrue(parcours_bornes(g, 99, max_results=3)["complete"])
        limited = parcours_bornes(g, 99, max_results=2)
        self.assertFalse(limited["complete"])
        self.assertEqual(len(limited["paths"]), 2)
        self.assertIn("sans garantie", limited["warning"])
        limited = parcours_bornes(g, 99, max_expansions=1)
        self.assertFalse(limited["complete"])
        self.assertEqual(limited["expansions"], 1)

    def test_cost_sensitivity_and_nondifferentiable_switch(self):
        self.assertEqual([r["id"] for r in routes_dependantes(20)["best"]], ["ABD"])
        self.assertEqual([r["id"] for r in routes_dependantes(60)["best"]], ["ACD"])
        at_switch = sensibilite_dependance(40)
        self.assertEqual([r["id"] for r in at_switch["best"]], ["ABD", "ACD"])
        self.assertEqual(at_switch["bestDuration"], 8)
        self.assertIsNone(at_switch["bestDerivative"])
        self.assertEqual((at_switch["leftDerivative"], at_switch["rightDerivative"]), (.1, 0))
        for q in (10, 70):
            finite_difference = (routes_dependantes(q + .001)["bestDuration"] - routes_dependantes(q - .001)["bestDuration"]) / .002
            self.assertAlmostEqual(finite_difference, sensibilite_dependance(q)["bestDerivative"], places=10)

    def test_invalid_inputs_and_overflow_are_not_silently_repaired(self):
        for bad in (True, math.nan, math.inf, -1, 101):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                routes_dependantes(bad)
        duplicate = graph("AB", [("A", "B", 1), ("A", "B", 2)])
        with self.assertRaises(ValueError):
            dijkstra(duplicate, "A", "B")
        overflow = graph("ABC", [("A", "B", 1e308), ("B", "C", 1e308)])
        for algorithm in (dijkstra, bellman_ford, floyd_warshall):
            with self.assertRaises(OverflowError):
                algorithm(overflow, "A", "C")
        with self.assertRaises(ValueError):
            parcours_bornes(graph("A", []), 1, max_results=0)

    def test_pure_functions_do_not_mutate_graph(self):
        city = ponderer_villes(villes_exemple())
        before = copy.deepcopy(city)
        dijkstra(city, "A", "F")
        bellman_ford(city, "A", "F")
        floyd_warshall(city)
        parcours_bornes(city, 20)
        self.assertEqual(city, before)
        fresh = villes_exemple()
        fresh["nodes"][0]["x"] = 200
        self.assertEqual(villes_exemple()["nodes"][0]["x"], 0)


if __name__ == "__main__":
    unittest.main()
