"""Graphes libres : dimension effective, calcul adjoint et bornes indépendantes."""
from fractions import Fraction as F
import json

import numpy as np
import pytest

from physique_graphes import graphes_symetriques as g, stochastique as old


def cycle(n):
    return {"n":n,"edges":[[i,i+1] for i in range(1,n)]+[[1,n]]}


def ladder(n=24):
    half=n//2
    return {"n":n,"edges":[[i,i+1] for i in range(1,half)]+[[i,i+1] for i in range(half+1,n)]+[[i,i+half] for i in range(1,half+1)],
            "order":[j for i in range(1,half+1) for j in (i,i+half)]}


def test_draft_creation_future_neighbors_removal_and_json():
    a={"n":1,"edges":[],"order":[1]}
    a=g.set_neighbors(a,1,[2,5])
    assert a["n"]==5 and a["edges"]==[[1,2],[1,5]]
    a=g.set_neighbors(a,5,[2,4,8])
    assert a["n"]==8 and [1,5] not in a["edges"]
    assert [2,5] in a["edges"] and [5,8] in a["edges"]
    assert g.normalize(json.loads(json.dumps(a)),draft=True)==a
    assert g.parse_ids("2, 5; 8 12")==[2,5,8,12]
    for ids in ([25],[0],[True],[1]):
        with pytest.raises(ValueError):g.set_neighbors(a,1,ids)
    with pytest.raises(ValueError):g.parse_ids("2-8")


def test_validation_and_incompatible_graph():
    for model in ({"n":25,"edges":[]},{"n":3,"edges":[[1,2]]},{"n":2,"edges":[[1,1]]},
                  {"n":2,"edges":[[1,2]],"order":[2,1]}, {"n":3,"edges":[[1,2],[2,3]]}):
        with pytest.raises(ValueError):g.compile_graph(model)
    triangle=g.compile_graph({"n":3,"edges":[[1,2],[2,3],[1,3],[3,1]]})
    assert triangle.d==0 and triangle.exact_value([])==F(3,4)
    assert len(triangle.edges)==3
    result=g.search(triangle)
    cert=g.global_bound(triangle,result)
    assert cert["complete"] and cert["lower"]==cert["upper"]==.75


def test_forced_zeros_reduce_dimension_beyond_row_rank():
    model={"n":6,"edges":[[1,2],[2,3],[3,4],[1,4],[1,5],[2,6]]}
    graph=g.compile_graph(model)
    assert graph.d==0
    assert set(graph.edges[e] for e in graph.forced_zero)=={(1,2),(1,4),(2,3)}
    H=np.zeros((6,6),dtype=int)
    for e,(i,j) in enumerate(graph.edges):H[i-1,e]=H[j-1,e]=1
    assert len(graph.edges)-np.linalg.matrix_rank(H)==1  # les égalités seules surestiment la dimension
    for e,cert in graph.zero_certificates.items():
        dual=[F(v) for v in cert]
        assert sum(dual)==0
        assert all(sum(int(H[i,k])*dual[i] for i in range(6))>=int(k==e) for k in range(6))


@pytest.mark.parametrize("model",[g.initial_graph(),cycle(4),cycle(5),ladder(),
    {"n":6,"edges":[[i,j] for i in (1,3,5) for j in (2,4,6)]},
    {"n":24,"edges":[[i,j] for i in range(1,25) for j in range(i+1,25)]}])
def test_exact_reduction_and_minimal_positive_relative_interior(model):
    graph=g.compile_graph(model)
    weights=graph.exact_coefficients(graph.start_exact)
    assert min(weights)>=0
    for i in range(1,graph.n+1):
        assert sum(w for e,w in zip(graph.edges,weights) if i in e)==1
    assert all(weights[e]>0 for e in range(len(graph.edges)) if e not in graph.forced_zero)
    assert all(graph.offset_exact[e]==0 and all(c==0 for c in graph.mapping_exact[e]) for e in graph.forced_zero)
    if graph.d:
        assert np.linalg.matrix_rank(graph.mapping)==graph.d
        np.testing.assert_array_equal(graph.mapping[graph.free],np.eye(graph.d))
        H=np.zeros((graph.n,len(graph.edges)))
        for e,(i,j) in enumerate(graph.edges):H[i-1,e]=H[j-1,e]=1
        np.testing.assert_allclose(H@graph.mapping,0,atol=1e-14)
        np.testing.assert_allclose(H@graph.offset,1,atol=1e-14)


def test_historical_parity_and_order_changes_the_problem():
    graph=g.compile_graph(g.initial_graph())
    for theta in (old.START,[.5,0,0,0,0],[.5,0,.5,.5,1]):
        state=graph.state(theta)
        assert state["objective"]==pytest.approx(old.evaluate(theta)["objective"])
        np.testing.assert_allclose(graph.evaluate(theta)[1],old.objective_gradient(theta)[1],atol=1e-14)
    best=g.search(graph)
    assert best["best"]==[.5,0,0,0,0] and best["exact_value"]=="5/16"
    assert g.global_bound(graph,best,max_boxes=30000)["gap"]<1e-6
    changed=g.compile_graph({**g.initial_graph(),"order":list(range(1,9))})
    assert changed.evaluate(old.START)[0]!=graph.evaluate(old.START)[0]
    assert "Bernstein" not in g.global_bound(changed,g.search(changed,starts=2),max_boxes=5)["method"]


@pytest.mark.parametrize("model",[g.initial_graph(),ladder(10),ladder(),cycle(4)])
def test_adjoint_derivatives_and_path_propagation(model):
    graph=g.compile_graph(model);theta=graph.start
    r,gradient,x,q,p=graph.evaluate(theta)
    assert r==pytest.approx(float(graph.exact_value(graph.start_exact)))
    assert graph.state(theta)["balance_residual"]==pytest.approx(0,abs=1e-13)
    h=1e-6
    for k in range(graph.d):
        direction=np.eye(graph.d)[k]*h
        difference=(graph.evaluate(theta+direction,free=True)[0]-graph.evaluate(theta-direction,free=True)[0])/(2*h)
        assert gradient[k]==pytest.approx(difference,abs=1e-9)
    # Calcul indépendant par énumération des chemins, sans adjoint.
    weights=graph.coefficients(theta)
    def paths(node,value):
        return value if node==graph.n else sum(paths(j,value*weights[e]) for e,j in graph.outgoing[node])
    assert r==pytest.approx(paths(1,1.))


def test_surfaces_slice_polynomials_and_derivatives():
    graph=g.compile_graph(ladder(10));best=g.search(graph,starts=3)
    theta=best["best"];mu=graph.kkt(theta)["multipliers"]
    for free in (False,True):
        x,y,z=g.surface(graph,theta,(0,1),points=21,multipliers=mu,free=free)
        assert theta[0] in x and theta[1] in y
        poly=graph.slice_polynomial(theta,(0,1),mu if free else None)
        for xx,yy in ((theta[0],theta[1]),(.37,.62)):
            point=theta.copy();point[:2]=[xx,yy]
            expected=graph.lagrangian(point,mu)[0] if free else graph.evaluate(point,free=True)[0]
            value=sum(float(c)*xx**e[0]*yy**e[1] for e,c in poly.items())
            assert value==pytest.approx(expected,abs=1e-12)
            partial_x=sum(float(c)*e[0]*xx**(e[0]-1)*yy**e[1] for e,c in poly.items() if e[0])
            expected_gradient=graph.lagrangian(point,mu)[1] if free else graph.evaluate(point,free=True)[1]
            assert partial_x==pytest.approx(expected_gradient[0],abs=1e-11)


def test_interval_bound_independent_grid_and_open_budget():
    graph=g.compile_graph(cycle(4));result=g.search(graph,starts=4)
    sampled=[graph.evaluate([float(x)])[0] for x in np.linspace(0,1,401)]
    cert=g.global_bound(graph,result,tolerance=1e-5,max_boxes=500)
    assert max(sampled)<=cert["upper"] and cert["lower"]<=max(sampled)+1e-4
    rng=np.random.default_rng(9)
    graph=g.compile_graph(ladder(10))
    for _ in range(15):
        lo=rng.uniform(0,.4,graph.d);hi=rng.uniform(.6,1,graph.d)
        upper=g.interval_upper(graph,lo,hi)
        for _ in range(20):
            point=rng.uniform(lo,hi)
            try:r=graph.evaluate(point)[0]
            except ValueError:continue
            assert upper is not None and r<=upper
    cert=g.global_bound(graph,g.search(graph,starts=2),max_boxes=1)
    assert 0<=cert["lower"]<=cert["upper"]<=1
