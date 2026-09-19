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


def matrice_concordances(model, edges):
    """Matrice effective, échelle fixe [-1,1] ; les arcs sont identifiés sans en créer."""
    ids = [str(i) for i in range(1, 9)]
    active = {(edge["to"], edge["from"]) for edge in edges}
    values = [[model["epsilon"].get(i, {}).get(j, 0) for j in ids] for i in ids]
    labels = [[f"{values[row][col]:.2f}"+(" ●" if (i, j) in active else "")
               for col, j in enumerate(ids)] for row, i in enumerate(ids)]
    status = [["Diagonale nulle" if i == j else "Coefficient actif" if (i, j) in active else "Sans arc : inactif"
               for j in ids] for i in ids]
    fig = go.Figure(go.Heatmap(x=ids, y=ids, z=values, zmin=-1, zmax=1, zmid=0,
                              colorscale="RdBu", text=labels, texttemplate="%{text}",
                              textfont=dict(size=11), customdata=status,
                              hovertemplate="Destinataire %{y}, fournisseur %{x}<br>ε = %{z:.6f}<br>%{customdata}<extra></extra>",
                              colorbar=dict(title="ε", tickvals=[-1, 0, 1])))
    fig.update_layout(title="Matrice de concordances courante", height=450,
                      xaxis=dict(title="Fournisseur j", type="category"),
                      yaxis=dict(title="Destinataire i", type="category", autorange="reversed"),
                      margin=dict(l=40, r=15, t=55, b=45))
    return fig


def graphe_concordances(state):
    """DAG nodal avec les douze fractions et transferts réellement calculés."""
    positions = {"1": (0, 0), "2": (1.5, 1.1), "5": (1.5, -1.1),
                 "3": (3.3, 1.1), "7": (3.3, -1.1), "4": (5.1, 1.1),
                 "6": (5.1, -1.1), "8": (7, 0)}
    # Déports explicites pour distinguer les transferts longs des bifurcations.
    routes = {"2-8": [(1.5, 2.35), (6.3, 2.35)],
              "5-3": [(2.25, .2)], "7-4": [(4.55, -.3)],
              "3-6": [(3.8, .1)]}
    label_positions = {"1-2": (.6, .8), "1-5": (.6, -.8), "2-3": (2.4, 1.35),
                       "2-8": (4.2, 2.35), "5-3": (2.25, .15), "5-7": (2.4, -1.4),
                       "7-6": (4.25, -1.4), "7-4": (4.8, -.35), "3-4": (4.25, 1.4),
                       "3-6": (3.8, .05), "4-8": (6.1, .9), "6-8": (6.1, -.9)}
    fig = go.Figure()
    for flow in state["flows"]:
        edge_id = f"{flow['from']}-{flow['to']}"
        path = [positions[flow["from"]], *routes.get(edge_id, []), positions[flow["to"]]]
        xs, ys = zip(*path)
        value, fraction = flow["value"], flow["fraction"]
        color = "#a33f57" if value < 0 else "#357a98"
        fig.add_trace(go.Scatter(x=xs, y=ys, mode="lines", line=dict(color=color, width=2),
                                hoverinfo="skip", showlegend=False))
        x0, y0 = path[-2]
        x1, y1 = path[-1]
        fig.add_annotation(x=x0+.85*(x1-x0), y=y0+.85*(y1-y0),
                           ax=x0+.65*(x1-x0), ay=y0+.65*(y1-y0), xref="x", yref="y", axref="x", ayref="y",
                           text="", arrowhead=2, arrowsize=1.1, arrowwidth=2, arrowcolor=color)
        lx, ly = label_positions[edge_id]
        fig.add_trace(go.Scatter(x=[lx], y=[ly], mode="markers", marker=dict(size=26, opacity=0),
                                text=[f"{flow['from']} → {flow['to']}<br>α = {fraction:.12g}<br>q = {value:.12g}"],
                                hovertemplate="%{text}<extra></extra>", showlegend=False))
        fig.add_annotation(x=lx, y=ly, text=f"α={fraction:.3g}<br>q={value:.4g}", showarrow=False,
                           bgcolor="rgba(255,255,255,.92)", borderpad=3, font=dict(size=11, color=color))
    nodes = state["nodes"]
    fig.add_trace(go.Scatter(x=[positions[n["id"]][0] for n in nodes], y=[positions[n["id"]][1] for n in nodes],
                            mode="markers+text", marker=dict(size=27, color="#174b65", line=dict(color="white", width=2)),
                            text=[f"<b>{n['id']}</b><br>Y={n['output']:.5g}" for n in nodes], textposition="top center",
                            hovertext=[f"Nœud {n['id']}<br>X = {n['input']:.12g}<br>Y = {n['output']:.12g}" for n in nodes],
                            hovertemplate="%{hovertext}<extra></extra>", showlegend=False))
    fig.update_layout(height=580, template="plotly_white", margin=dict(l=35, r=35, t=35, b=35),
                      xaxis=dict(visible=False, range=[-.5, 7.6]), yaxis=dict(visible=False, range=[-1.95, 2.9]),
                      title="Fractions α et transferts q de la configuration retenue")
    return fig
