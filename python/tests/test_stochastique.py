"""Réduction, propagation indépendante, calcul différentiel et borne globale."""
from fractions import Fraction as F
from math import comb

import numpy as np
import pytest
from scipy.optimize import linprog

from physique_graphes import stochastique as s


def witnesses():
    yield np.array(s.START)
    yield np.array([.5, 0, 0, 0, 0])
    rng = np.random.default_rng(82)
    for _ in range(18):
        vertex = linprog(rng.normal(size=5), A_ub=-s.MAPPING, b_ub=s.OFFSET, bounds=[(0, 1)]*5)
        yield .7*vertex.x+.3*np.array(s.START)


def exact_rank(matrix):
    rows = [[F(int(v)) for v in row] for row in matrix]
    rank = 0
    for col in range(len(rows[0])):
        pivot = next((i for i in range(rank, len(rows)) if rows[i][col]), None)
        if pivot is None:
            continue
        rows[rank], rows[pivot] = rows[pivot], rows[rank]
        d = rows[rank][col]
        rows[rank] = [v/d for v in rows[rank]]
        for i in range(len(rows)):
            if i != rank:
                d = rows[i][col]
                rows[i] = [a-d*b for a, b in zip(rows[i], rows[rank])]
        rank += 1
    return rank


def test_minimal_coordinates_and_stochastic_support():
    incidence = np.zeros((8, 12), dtype=int)
    for k, (i, j) in enumerate(s.ARCS):
        incidence[i-1, k] = incidence[j-1, k] = 1
    assert exact_rank(incidence) == 7
    assert exact_rank(s.MAPPING) == 5
    np.testing.assert_array_equal(incidence@s.MAPPING, np.zeros((8, 5)))
    np.testing.assert_array_equal(incidence@s.OFFSET, np.ones(8))
    assert min(s.coefficients(s.START)) > 0
    for x in witnesses():
        m = s.matrix(x)
        assert s.feasible(x)
        np.testing.assert_allclose(m.sum(0), 1, atol=1e-14)
        np.testing.assert_allclose(m.sum(1), 1, atol=1e-14)
        np.testing.assert_array_equal(m, m.T)
        np.testing.assert_array_equal(m.diagonal(), 0)
        assert len(np.flatnonzero(s.matrix(s.START))) == 24


def test_propagation_polynomial_and_terminal_convention():
    for x in witnesses():
        # Somme indépendante des produits de poids le long de TOUS les chemins.
        m = s.matrix(x)
        def walk(i, value):
            if i == 8:
                return value
            return sum(walk(j, value*m[i-1, j-1]) for origin, j in s.ARCS if origin == i)
        expected = walk(1, 1.)
        state = s.evaluate(x)
        assert state["objective"] == pytest.approx(expected, abs=1e-14)
        assert s.objective_gradient(x)[0] == pytest.approx(expected, abs=1e-14)
        assert float(s.exact_witness(x)) == pytest.approx(expected, abs=1e-14)
        assert state["nodes"][7]["input"] == state["nodes"][7]["output"]
        assert state["nodes"][7]["outgoing"] == []
        assert abs(state["balance_residual"]) < 1e-14
    assert s.exact_witness(s.START) == F(13, 64)
    assert s.exact_witness([.5, 0, 0, 0, 0]) == F(5, 16)
    assert s.exact_witness([.5, 0, .5, .5, 1]) == F(5, 16)  # non-unicité des témoins


def test_reject_incompatible_points_without_renormalization():
    for x in ([.5, .8, .2, .1, .2], [.5, 0, 0, 0, .1]):
        assert not s.feasible(x)
        with pytest.raises(ValueError):
            s.evaluate(x)
        with pytest.raises(ValueError):
            s.global_bound(x, max_boxes=10)
    with pytest.raises(ValueError):
        s.evaluate([.5, .2, float("nan"), .2, .2])


def test_derivatives_hessian_kkt_and_lagrangian_not_equal_to_r_elsewhere():
    h = 1e-5
    for x in witnesses():
        gradient, hessian = s.derivatives(x)
        fd = [(s.objective_gradient(x+e*h)[0]-s.objective_gradient(x-e*h)[0])/(2*h) for e in np.eye(5)]
        fd_h = np.array([(s.objective_gradient(x+e*h)[1]-s.objective_gradient(x-e*h)[1])/(2*h) for e in np.eye(5)]).T
        np.testing.assert_allclose(gradient, fd, atol=2e-9)
        np.testing.assert_allclose(hessian, fd_h, atol=2e-9)
    d = s.kkt([.5, 0, 0, 0, 0])
    assert d["stationarity_residual"] < 1e-14
    assert d["complementarity_residual"] == 0
    assert min(d["multipliers"]) >= 0
    assert d["gradient"] == [0, -.5, -.125, -.125, 0]
    assert s.lagrangian(s.START, d["multipliers"])[0] > s.objective_gradient(s.START)[0]


def test_search_and_independent_global_enclosure():
    local = s.search(method="local")
    multi = s.search()
    assert local["objective"] == pytest.approx(.297652481895, abs=1e-10)
    assert multi["best"] == [.5, 0, 0, 0, 0]
    assert multi["exact_value"] == "5/16"
    assert multi["objective"] > local["objective"]
    cert = s.global_bound(multi["best"])
    assert cert["complete"]
    assert F(cert["lower"]) <= F(5, 16) <= F(cert["upper"])
    assert cert["gap"] <= 1e-6
    open_cert = s.global_bound(multi["best"], max_boxes=1)
    assert not open_cert["complete"]
    assert open_cert["upper"] >= cert["upper"]


def test_bernstein_directed_rounding_against_rational_subdivision():
    upper = s.bernstein_root()
    # Évaluation rationnelle de la base : ses coefficients majorants doivent
    # majorer la valeur exacte du polynôme (sans passer par le moteur flottant).
    for x in ([F(1, 2)]*5, [F(1, 3), F(2, 5), F(3, 7), F(1, 4), F(4, 5)]):
        basis_value = F(0)
        for index in np.ndindex(upper.shape):
            term = F(float(upper[index]))
            for i, size, coordinate in zip(index, upper.shape, x):
                n = size-1
                term *= comb(n, i)*coordinate**i*(1-coordinate)**(n-i)
            basis_value += term
        exact = s._poly_value(s.polynomial(), x)
        assert basis_value >= exact
        assert float(basis_value-exact) < 1e-14
    for axis in range(5):
        left, right = s.split_bernstein(upper, axis)
        # Une fibre exacte, avec valeurs float converties en rationnels exacts.
        index = [0]*5
        source = [F(float(np.take(upper, k, axis=axis)[(0,)*4])) for k in range(upper.shape[axis])]
        n = len(source)-1
        exact_l, exact_r = [source[0]], [source[-1]]
        while len(source) > 1:
            source = [(a+b)/2 for a, b in zip(source[:-1], source[1:])]
            exact_l.append(source[0]); exact_r.append(source[-1])
        for k in range(n+1):
            index[axis] = k
            assert F(float(left[tuple(index)])) >= exact_l[k]
            assert F(float(right[tuple(index)])) >= exact_r[n-k]
    rng = np.random.default_rng(41)
    # Les bornes des deux demi-cubes contiennent le polynôme, même hors polytope.
    left, right = s.split_bernstein(upper, 0)
    for _ in range(200):
        x = rng.random(5)
        assert s.objective_gradient(x)[0] <= (left if x[0] <= .5 else right).max()


def test_surface_masks_center_and_explicit_polynomial_derivatives():
    best = [.5, 0, 0, 0, 0]
    mu = s.kkt(best)["multipliers"]
    for axes in ((0, 2), (0, 1), (3, 4)):
        for free in (False, True):
            x, y, z = s.surface(best, axes, radius=.1, points=21, free=free, multipliers=mu)
            assert best[axes[0]] in x and best[axes[1]] in y
            row, col = list(y).index(best[axes[1]]), list(x).index(best[axes[0]])
            assert z[row, col] == F(5, 16)
            assert np.isfinite(z).all() if free else np.isnan(z).any()
            poly = s.slice_polynomial(best, axes, mu if free else None)
            for xx, yy in ((.45, .05), (.5, .02)):
                point = np.array(best); point[list(axes)] = [xx, yy]
                expected = s.lagrangian(point, mu)[0] if free else s.objective_gradient(point)[0]
                got = sum(float(c)*xx**e[0]*yy**e[1] for e, c in poly.items())
                assert got == pytest.approx(expected, abs=1e-14)
