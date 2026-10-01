from fractions import Fraction as F

import numpy as np
import pytest

from physique_graphes import expressions_symetriques as e, graphes_symetriques as g, stochastique as legacy


MODELS=[g.initial_graph(),{"n":4,"edges":[[i,j] for i in range(1,5) for j in range(i+1,5)]},
        {"n":4,"edges":[[1,2],[2,3],[3,4],[1,4]]},{"n":3,"edges":[[1,2],[1,3],[2,3]]}]


@pytest.mark.parametrize("model",MODELS)
def test_expanded_objective_and_all_derivatives_against_forward_adjoint(model):
    graph=g.compile_graph(model);poly=e.objective(graph)
    mu=[F((k%3)+1,7) for k in range(len(graph.edges))]
    lagrangian=e.fixed_lagrangian(graph,poly,mu)
    for values in [graph.start_exact,[F(k+2,11) for k in range(graph.d)]]:
        r,gradient,*_=graph.evaluate(values,free=True)
        lv,lg=graph.lagrangian(values,mu)
        assert float(e.value(poly,values))==pytest.approx(r,abs=1e-12)
        assert float(e.value(lagrangian,values))==pytest.approx(lv,abs=1e-12)
        for k in range(graph.d):
            assert float(e.value(e.derivative(poly,k),values))==pytest.approx(gradient[k],abs=1e-11)
            assert float(e.value(e.derivative(lagrangian,k),values))==pytest.approx(lg[k],abs=1e-11)
            delta=np.eye(graph.d)[k]*1e-6;x=np.array(values,dtype=float)
            finite=(graph.lagrangian(x+delta,mu)[0]-graph.lagrangian(x-delta,mu)[0])/2e-6
            assert float(e.value(e.derivative(lagrangian,k),values))==pytest.approx(finite,abs=1e-8)


def test_initial_polynomial_is_exactly_the_independent_historical_expansion():
    assert e.objective(g.compile_graph(g.initial_graph()))==legacy.polynomial()


def test_expansion_budget_never_returns_a_truncated_polynomial():
    graph=g.compile_graph(g.initial_graph())
    for kwargs in ({"max_terms":1},{"max_products":2},{"max_variables":2}):
        with pytest.raises(e.ExpansionLimit):e.objective(graph,**kwargs)
    with pytest.raises(ValueError):e.objective(graph,max_terms=0)


def test_all_pairs_agree_with_surface_polynomials_including_mu_terms():
    graph=g.compile_graph(g.initial_graph());theta=[.5,0,0,0,0]
    mu=graph.kkt(theta)["multipliers"]
    poly=e.fixed_lagrangian(graph,e.objective(graph),mu)
    for i in range(graph.d):
        for j in range(i+1,graph.d):
            restricted={}
            for powers,c in poly.items():
                for k,p in enumerate(powers):
                    if k not in (i,j):c*=F(theta[k])**p
                if c:
                    key=(powers[i],powers[j]);restricted[key]=restricted.get(key,F(0))+c
            restricted={p:c for p,c in restricted.items() if c}
            assert restricted==graph.slice_polynomial(theta,(i,j),mu)
            assert e.serialize(restricted)==e.serialize(graph.slice_polynomial(theta,(i,j),mu))


def test_tex_keeps_nonzero_small_coefficients_and_only_named_free_variables():
    from ui_graphes_symetriques import polynomial_tex
    tex=polynomial_tex({(2,0):F(1,10**20),(0,1):F(-1)},"R",["a_{1,2}","a_{3,4}"])
    assert "1e-20" in tex and "a_{1,2}^{2}" in tex and "-a_{3,4}" in tex

