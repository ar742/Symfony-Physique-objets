"""Expressions exactes en coordonnées minimales, avec budget d'expansion explicite."""
from fractions import Fraction as F


class ExpansionLimit(ValueError):
    """La forme factorisée reste exacte ; aucun polynôme tronqué n'est renvoyé."""


def derivative(poly, axis):
    result = {}
    for powers, coefficient in poly.items():
        if powers[axis]:
            key = list(powers); key[axis] -= 1
            result[tuple(key)] = coefficient*powers[axis]
    return result


def value(poly, coordinates):
    result = F(0)
    for powers, coefficient in poly.items():
        term = coefficient
        for x, power in zip(coordinates,powers):
            term *= F(x)**power
        result += term
    return result


def affine_weights(graph):
    zero = (0,)*graph.d
    result = []
    for offset,row in zip(graph.offset_exact,graph.mapping_exact):
        poly = {zero:offset} if offset else {}
        for k,c in enumerate(row):
            if c:
                poly[tuple(int(i==k) for i in range(graph.d))] = c
        result.append(poly)
    return result


def objective(graph, *, max_terms=1200, max_products=60000, max_variables=24):
    """R exact après substitution de tous les poids dépendants et des entrées."""
    if min(max_terms,max_products,max_variables) < 1:
        raise ValueError("Les budgets d’expansion doivent être positifs.")
    if graph.d > max_variables:
        raise ExpansionLimit(f"{graph.d} coordonnées : la forme factorisée est conservée au-delà de {max_variables} variables.")
    weights = affine_weights(graph)
    inputs = [{} for _ in range(graph.n+1)]
    inputs[1] = {(0,)*graph.d:F(1)}
    products = 0
    for i in graph.model["order"]:
        for edge,j in graph.outgoing[i]:
            target = inputs[j]
            for p,c in inputs[i].items():
                for q,a in weights[edge].items():
                    products += 1
                    if products > max_products:
                        raise ExpansionLimit(f"Budget de {max_products} produits atteint : forme factorisée exacte conservée.")
                    key = tuple(x+y for x,y in zip(p,q))
                    coefficient = target.get(key,F(0))+c*a
                    if coefficient:
                        target[key] = coefficient
                    else:
                        target.pop(key,None)
                    if len(target) > max_terms:
                        raise ExpansionLimit(f"Plus de {max_terms} monômes intermédiaires : forme factorisée exacte conservée.")
    return inputs[graph.n]


def fixed_lagrangian(graph, poly, multipliers):
    """ℒ en tous les a libres, multiplicateurs numériques fixés et non arrondis."""
    if len(multipliers) != len(graph.edges):
        raise ValueError("Un multiplicateur par liaison est requis.")
    result = dict(poly)
    for weight,mu in zip(affine_weights(graph),multipliers):
        for powers,c in weight.items():
            result[powers] = result.get(powers,F(0))+F(mu)*c
    return {p:c for p,c in result.items() if c}


def serialize(poly):
    return [{"powers":list(p),"coefficient_exact":str(c)} for p,c in sorted(poly.items())]
