"""Recherches SciPy sur les partages d'un DAG : témoins, sans certificat global."""
import numpy as np
from scipy.optimize import differential_evolution, minimize
from . import dag


def optimiser(model, *, method="local", registry=None, seed=42, iterations=60):
    if method not in ("local", "exploration"):
        raise ValueError("Méthode attendue : local ou exploration")
    if not isinstance(iterations, int) or not 1 <= iterations <= 1000:
        raise ValueError("Entre 1 et 1000 itérations")
    controls = dag.binary_controls(model)
    keys = list(controls)
    if not keys:
        raise ValueError("Au moins un partage binaire est nécessaire")
    initial = dag.evaluate(model, registry=registry)
    best = {"state": initial if initial["feasible"] else None, "controls": controls.copy()}
    evaluations = 0

    def objective(values):
        nonlocal evaluations
        candidate = dict(zip(keys, map(float, values)))
        state = dag.evaluate(dag.with_binary_controls(model, candidate), registry=registry)
        evaluations += 1
        if not state["feasible"]:
            return 1e6
        if best["state"] is None or state["production"] > best["state"]["production"]:
            best.update(state=state, controls=candidate)
        return -state["production"]

    start = [controls[k] for k in keys]
    if method == "local":
        result = minimize(objective, start, method="SLSQP", bounds=[(0, 1)]*len(keys),
                          options={"maxiter": iterations, "ftol": 1e-11})
    else:
        result = differential_evolution(objective, [(0, 1)]*len(keys), x0=start,
                                        rng=np.random.default_rng(seed), maxiter=iterations,
                                        popsize=8, polish=True, tol=1e-7)
    return {"method": method, "best": best["state"], "controls": best["controls"],
            "evaluations": evaluations, "solver_success": bool(result.success),
            "message": str(result.message), "upper_bound": None,
            "certified": False, "seed": seed if method == "exploration" else None}
