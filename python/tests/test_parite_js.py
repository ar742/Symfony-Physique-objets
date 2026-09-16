"""Optional regression oracle against the existing browser implementations.

Run with Node on PATH, or set GRAPHES_NODE to its executable. These tests are
skipped when Node is absent. Production Python modules never invoke JavaScript.
"""
from pathlib import Path
import json
import math
import os
import re
import shutil
import subprocess
import unittest

from physique_graphes import concordances as c
from physique_graphes import production as p
from physique_graphes import reseaux as r


_NODE = os.environ.get("GRAPHES_NODE") or shutil.which("node")
_REPO = Path(__file__).resolve().parents[2]


def _snake(value):
    if isinstance(value, list):
        return [_snake(item) for item in value]
    if isinstance(value, dict):
        return {re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower(): _snake(item) for key, item in value.items()}
    return value


def _web_model(model):
    return {**model, "initialControls": model["initial_controls"]}


def _oracle(source, payload):
    completed = subprocess.run([_NODE, "--input-type=module", "-e", source], input=json.dumps(payload),
                               text=True, encoding="utf-8", capture_output=True, cwd=_REPO,
                               check=False, timeout=60)
    if completed.returncode:
        raise AssertionError(f"Node oracle failed ({completed.returncode}): {completed.stderr}")
    return _snake(json.loads(completed.stdout))


_CONCORDANCE_ORACLE = r"""
import {readFileSync} from 'node:fs';
const input=JSON.parse(readFileSync(0,'utf8'));
const c=await import(input.engine),s=await import(input.scenarios);
const output={cases:[],scenarios:[]};
for(const item of input.cases){
  const opts={domain:item.domain,objective:item.objective};
  const state=c.evaluateConcordance(item.model,item.controls,opts);
  const point=c.concordanceWitnessPoint(state);
  const free=c.evaluateConcordanceLagrangian(item.model,item.free_point,{...opts,multipliers:input.multipliers});
  const adjoint=c.explainConcordanceLagrangian(item.model,state,opts);
  const bound=c.boundConcordanceBox(item.model,input.box,opts);
  const grid=c.searchConcordanceGrid(item.model,{...opts,divisions:3,maxEvaluations:1024});
  const local=c.searchConcordanceLocal(item.model,{...opts,initialControls:item.controls,initialStep:.1,minStep:.01,maxEvaluations:80});
  const global=c.searchConcordanceGlobal(item.model,{...opts,initialControls:item.controls,maxNodes:8,tolerance:1e-5});
  output.cases.push({state,point,free,adjoint,bound,grid,local,global});
}
output.default=c.createConcordanceScenario();
output.negative=s.createNegativeConcordanceScenario();
for(const seed of [0,1,7,8,34,4294967295])output.scenarios.push(s.randomizeConcordance(c.createConcordanceScenario(),seed));
process.stdout.write(JSON.stringify(output));
"""


@unittest.skipUnless(_NODE, "Optional JS parity: install Node or set GRAPHES_NODE; native tests remain independent")
class ConcordanceJavaScriptParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.controls = {"s1": .4, "s2": .35, "s5": .55, "s3": .6, "s7": .3}
        cls.box = [[.2, .8], [.15, .85], [.25, .75], [.1, .9], [.05, .95]]
        cls.multipliers = [(i-10)/20 for i in range(21)]
        models = [c.create_scenario(), c.create_negative_scenario()]
        for seed in (7, 8, 34):
            model = c.randomize(c.create_scenario(), seed)
            model["environments"] = {n: .5 for n in model["environments"]}
            models.append(model)
        cls.cases = []
        for index, model in enumerate(models):
            for domain in ("rectified", "signed"):
                for objective in ("output", "arrivals"):
                    state = c.evaluate(model, cls.controls, domain=domain, objective=objective)
                    free = c.witness_point(state)
                    free[0] += .03
                    free[12] -= .02
                    free[25] += .04
                    cls.cases.append({"name": f"model{index}/{domain}/{objective}", "model": model,
                                      "controls": cls.controls, "domain": domain, "objective": objective, "free_point": free})
        cls.oracle = _oracle(_CONCORDANCE_ORACLE, {
            "engine": (_REPO/"app/public/scripts/concordance-engine.mjs").as_uri(),
            "scenarios": (_REPO/"app/public/scripts/concordance-scenarios.mjs").as_uri(),
            "cases": [{**item, "model": _web_model(item["model"])} for item in cls.cases],
            "box": cls.box, "multipliers": cls.multipliers})

    def assert_same(self, actual, expected, path="value"):
        if isinstance(expected, bool) or expected is None or isinstance(expected, str):
            self.assertEqual(actual, expected, path)
        elif isinstance(expected, (float, int)):
            self.assertIsInstance(actual, (int, float), path)
            self.assertTrue(math.isfinite(actual) and math.isfinite(expected), path)
            self.assertLessEqual(abs(actual-expected), 1e-10*max(1, abs(actual), abs(expected)), f"{path}: {actual} != {expected}")
        elif isinstance(expected, list):
            self.assertEqual(len(actual), len(expected), path)
            for index, (left, right) in enumerate(zip(actual, expected)):
                self.assert_same(left, right, f"{path}[{index}]")
        elif isinstance(expected, dict):
            self.assertEqual(set(actual), set(expected), path)
            for key in expected:
                self.assert_same(actual[key], expected[key], f"{path}.{key}")
        else:
            self.fail(f"Unsupported oracle value {path}: {type(expected)}")

    def test_scenarios_and_seeded_matrix_exactly_match(self):
        self.assert_same(c.create_scenario(), self.oracle["default"])
        self.assert_same(c.create_negative_scenario(), self.oracle["negative"])
        for seed, expected in zip((0, 1, 7, 8, 34, 4294967295), self.oracle["scenarios"]):
            self.assertEqual(c.randomize(c.create_scenario(), seed), expected)

    def test_values_gradients_hessians_and_threshold_status_match(self):
        for item, reference in zip(self.cases, self.oracle["cases"]):
            with self.subTest(case=item["name"]):
                state = c.evaluate(item["model"], item["controls"], domain=item["domain"], objective=item["objective"])
                expected = reference["state"]
                for key in ("controls", "nodes", "flows", "objectives", "objective", "objective_kind", "domain", "feasible"):
                    self.assert_same(state[key], expected[key], key)
                for key in ("gradient", "hessian", "differentiable"):
                    self.assert_same(state["derivatives"][key], expected["derivatives"][key], key)
                self.assert_same(c.witness_point(state), reference["point"])

    def test_free_lagrangian_and_adjoint_multipliers_match(self):
        for item, reference in zip(self.cases, self.oracle["cases"]):
            with self.subTest(case=item["name"]):
                mode = {"domain": item["domain"], "objective": item["objective"]}
                value = c.evaluate_lagrangian(item["model"], item["free_point"], multipliers=self.multipliers, **mode)
                for key in ("point", "objective", "lagrangian", "multipliers", "constraints", "coefficients", "residual", "feasible",
                            "share_admissible", "domain_admissible", "differentiable", "gradient", "selected_gradient", "hessian"):
                    self.assert_same(value[key], reference["free"][key], key)
                state = c.evaluate(item["model"], item["controls"], **mode)
                adjoint = c.explain_lagrangian(item["model"], state)
                for key in ("reference_point", "multipliers", "lambda", "mu", "eta", "potentials", "edge_values", "max_selected_gradient", "global_certificate"):
                    self.assert_same(adjoint[key], reference["adjoint"][key], key)

    def test_interval_bounds_and_problem_scope_match(self):
        for item, reference in zip(self.cases, self.oracle["cases"]):
            with self.subTest(case=item["name"]):
                bound = c.bound_box(item["model"], self.box, domain=item["domain"], objective=item["objective"])
                self.assert_same(bound, reference["bound"])

    def test_small_searches_match_without_confusing_grid_and_global(self):
        for item, reference in zip(self.cases, self.oracle["cases"]):
            with self.subTest(case=item["name"]):
                mode = {"domain": item["domain"], "objective": item["objective"]}
                results = {
                    "grid": c.search_grid(item["model"], divisions=3, max_evaluations=1024, **mode),
                    "local": c.search_local(item["model"], initial_controls=item["controls"], initial_step=.1, min_step=.01, max_evaluations=80, **mode),
                    "global": c.search_global(item["model"], initial_controls=item["controls"], max_nodes=8, tolerance=1e-5, **mode)}
                for name, result in results.items():
                    expected = reference[name]
                    for key in ("status", "complete", "evaluations", "upper_bound", "gap"):
                        self.assert_same(result[key], expected[key], f"{name}.{key}")
                    self.assert_same(result["best"]["objective"], expected["best"]["objective"], f"{name}.best")
                self.assert_same(results["global"]["certificate"]["scope"], reference["global"]["certificate"]["scope"])
                self.assert_same(results["global"]["processed_nodes"], reference["global"]["processed_nodes"])


_NETWORK_ORACLE = r"""
import {readFileSync} from 'node:fs';
const input=JSON.parse(readFileSync(0,'utf8'));
const g=await import(input.network),p=await import(input.production);
const city=g.weightedCityGraph(),pairs=[];
for(const a of city.nodes)for(const b of city.nodes){
  pairs.push({from:a.id,to:b.id,dijkstra:g.dijkstra(city,a.id,b.id),
    bellman:g.bellmanFord(city,a.id,b.id),floyd:g.floydWarshall(city,a.id,b.id)});
}
const cycles=[];
for(const preset of ['balanced','threshold','oscillating']){
  const model=p.createProductionScenario(preset);
  cycles.push({model,result:p.simulateProduction(model)});
}
const high=p.createProductionScenario('threshold');
for(const machine of high.machines)machine.initial=.8;
cycles.push({model:high,result:p.simulateProduction(high)});
process.stdout.write(JSON.stringify({city,pairs,paths:g.enumerateSimplePaths(city,{maxDistance:20}),
  dependencies:[0,20,40,60,100].map(load=>g.dependentRoutes(load)),cycles}));
"""


@unittest.skipUnless(_NODE, "Optional JS parity: install Node or set GRAPHES_NODE; native tests remain independent")
class NetworkAndProductionJavaScriptParity(unittest.TestCase):
    assert_same = ConcordanceJavaScriptParity.assert_same

    @classmethod
    def setUpClass(cls):
        cls.oracle = _oracle(_NETWORK_ORACLE, {
            "network": (_REPO/"app/public/scripts/graph-engine.mjs").as_uri(),
            "production": (_REPO/"app/public/scripts/production-engine.mjs").as_uri()})
        cls.city = r.ponderer_villes(r.villes_exemple())

    def test_city_and_three_shortest_path_algorithms_match_on_all_pairs(self):
        self.assert_same(_snake(self.city), self.oracle["city"])
        self.assertEqual(len(self.oracle["pairs"]), 36)
        for pair in self.oracle["pairs"]:
            with self.subTest(source=pair["from"], target=pair["to"]):
                for name, algorithm in (("dijkstra", r.dijkstra), ("bellman", r.bellman_ford), ("floyd", r.floyd_warshall)):
                    self.assert_same(algorithm(self.city, pair["from"], pair["to"]), pair[name], name)

    def test_bounded_paths_and_dependent_routes_match(self):
        result = r.parcours_bornes(self.city, 20)
        self.assertTrue(result["complete"])
        self.assertEqual(len(result["paths"]), 194)
        self.assert_same(result["paths"], self.oracle["paths"])
        for load, expected in zip((0, 20, 40, 60, 100), self.oracle["dependencies"]):
            self.assert_same(_snake(r.routes_dependantes(load)), expected)

    def test_production_histories_flows_and_final_residual_match(self):
        models = [p.production_exemple(preset) for preset in ("balanced", "threshold", "oscillating")]
        high = p.production_exemple("threshold")
        for machine in high["machines"]:
            machine["initial"] = .8
        models.append(high)
        for index, (model, expected) in enumerate(zip(models, self.oracle["cycles"])):
            with self.subTest(scenario=index):
                self.assert_same(_snake(model), expected["model"])
                self.assert_same(_snake(p.simuler_production(model)), expected["result"])


if __name__ == "__main__":
    unittest.main()
