"""Figures Plotly réutilisables dans Streamlit, Jupyter et les exports HTML."""
from html import escape
import math

import networkx as nx
import numpy as np
import plotly.graph_objects as go


def graphe(model, node_values=None, edge_values=None, *, directed=True, title="Réseau"):
    nodes, edges = model["nodes"], model["edges"]
    graph = nx.DiGraph()
    graph.add_nodes_from(str(n["id"]) for n in nodes)
    graph.add_edges_from((str(e["from"]), str(e["to"])) for e in edges)
    if all("x" in n and "y" in n for n in nodes):
        positions = {str(n["id"]): (n["x"], n["y"]) for n in nodes}
    elif nx.is_directed_acyclic_graph(graph):
        positions = {}
        for col, generation in enumerate(nx.topological_generations(graph)):
            for row, name in enumerate(generation):
                positions[name] = (col, row - (len(generation) - 1) / 2)
    else:
        positions = nx.spring_layout(graph, seed=42)
    fig = go.Figure()
    for edge in edges:
        origin, destination = str(edge["from"]), str(edge["to"])
        x0, y0 = positions[origin]
        x1, y1 = positions[destination]
        edge_id = edge.get("id", f"{origin}-{destination}")
        value = (edge_values or {}).get(edge_id)
        label = str(edge_id) + (f" : {value:.6g}" if isinstance(value, (float, int)) else "")
        label += "<br>" + escape(str(edge.get("attributes", "")))
        fig.add_trace(go.Scatter(x=[x0, x1], y=[y0, y1], mode="lines",
                                line=dict(color="#819ba9", width=2), hoverinfo="skip", showlegend=False))
        fig.add_trace(go.Scatter(x=[(x0+x1)/2], y=[(y0+y1)/2], mode="markers",
                                marker=dict(size=12, color="#267d9b", opacity=.65),
                                text=[label], hovertemplate="%{text}<extra></extra>", showlegend=False))
        if directed:
            fig.add_annotation(x=x0+.77*(x1-x0), y=y0+.77*(y1-y0),
                               ax=x0+.62*(x1-x0), ay=y0+.62*(y1-y0),
                               xref="x", yref="y", axref="x", ayref="y", text="",
                               arrowhead=2, arrowsize=1.2, arrowwidth=2, arrowcolor="#819ba9")
    labels, hover = [], []
    for node in nodes:
        name = str(node["id"])
        value = (node_values or {}).get(name)
        labels.append(name + (f"<br>{value:.5g}" if isinstance(value, (float, int)) else ""))
        hover.append(escape(str(node.get("name", name))) + "<br>" + escape(str(node.get("attributes", ""))))
    fig.add_trace(go.Scatter(x=[positions[str(n["id"])][0] for n in nodes],
                            y=[positions[str(n["id"])][1] for n in nodes], mode="markers+text",
                            text=labels, textposition="top center", hovertext=hover,
                            hovertemplate="%{hovertext}<extra></extra>",
                            marker=dict(size=23, color="#267d9b", line=dict(color="white", width=2)),
                            showlegend=False))
    fig.update_layout(title=title, height=440, margin=dict(l=20, r=20, t=55, b=25),
                      xaxis=dict(visible=False), yaxis=dict(visible=False), template="plotly_white")
    return fig


def echantillonner_surface(function, x0, y0, *, radius=.15, points=25, bounds=None):
    """Coupe à autres coordonnées fixes. NaN signale les points incompatibles."""
    if not all(math.isfinite(v) for v in (x0, y0, radius)) or radius <= 0 or not isinstance(points, int) or not 3 <= points <= 101:
        raise ValueError("Rayon positif et maillage de 3 à 101 points requis")
    limits = [(x0-radius, x0+radius), (y0-radius, y0+radius)]
    if bounds is not None:
        if len(bounds) != 2 or any(len(domain) != 2 or not all(math.isfinite(v) for v in domain) or domain[0] > domain[1] for domain in bounds):
            raise ValueError("Deux domaines finis ordonnés sont requis")
        limits = [(max(lo, domain[0]), min(hi, domain[1])) for (lo, hi), domain in zip(limits, bounds)]
        if any(lo > hi for lo, hi in limits):
            raise ValueError("Le voisinage demandé ne rencontre pas le domaine")
    x, y = (np.linspace(lo, hi, points) for lo, hi in limits)
    z = np.empty((points, points))
    for row, vy in enumerate(y):
        for col, vx in enumerate(x):
            value = function(float(vx), float(vy))
            z[row, col] = np.nan if value is None else value
    return x, y, z


def nappe(x, y, z, *, xlabel="x", ylabel="y", zlabel="r", reference=None):
    fig = go.Figure(go.Surface(x=x, y=y, z=z, colorscale="Viridis",
                               colorbar=dict(title=zlabel), connectgaps=False))
    if reference is not None and reference[2] is not None:
        fig.add_trace(go.Scatter3d(x=[reference[0]], y=[reference[1]], z=[reference[2]],
                                  mode="markers", name="Configuration de référence",
                                  marker=dict(size=6, color="#d64c38")))
    fig.update_layout(height=570, scene=dict(xaxis_title=xlabel, yaxis_title=ylabel, zaxis_title=zlabel,
                      aspectmode="cube"), margin=dict(l=0, r=0, t=20, b=0))
    return fig


def courbes(x, series, *, xlabel="Entrée", ylabel="Sortie"):
    fig = go.Figure()
    for name, values in series.items():
        fig.add_trace(go.Scatter(x=x, y=values, mode="lines", name=str(name)))
    fig.update_layout(xaxis_title=xlabel, yaxis_title=ylabel, height=400, template="plotly_white")
    return fig
