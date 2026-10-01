"""Construction et analyse du point 05, jusqu'à 24 nœuds."""
from fractions import Fraction as F
from hashlib import sha256
import json

import networkx as nx
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from physique_graphes import graphes_symetriques as g
from physique_graphes.visualisation import nappe, courbes
import graph_editor


def edge_tex(edge):
    return rf"a_{{{edge[0]},{edge[1]}}}"


def graph_key(graph):
    return sha256(json.dumps(graph.model,sort_keys=True).encode()).hexdigest()[:12]


def number_tex(value):
    f = F(value)
    if f.denominator <= 4096:
        return str(f.numerator) if f.denominator == 1 else rf"\frac{{{f.numerator}}}{{{f.denominator}}}"
    return f"{float(f):.6g}"


def terms_tex(terms):
    parts = []
    for coefficient, label in terms:
        if not coefficient:
            continue
        c = F(coefficient)
        parts.append(("-" if c < 0 else "+")+("" if abs(c) == 1 and label else number_tex(abs(c)))+label)
    return "".join(parts).lstrip("+") or "0"


def affine_tex(graph, e):
    return terms_tex([(graph.offset_exact[e], "")]+[(c, edge_tex(graph.edges[k])) for c, k in zip(graph.mapping_exact[e], graph.free)])


def affine_text(graph, e):
    terms = [(graph.offset_exact[e], "")]+[(c, f"a({graph.edges[k][0]},{graph.edges[k][1]})") for c,k in zip(graph.mapping_exact[e],graph.free)]
    parts = []
    for coefficient,label in terms:
        if coefficient:
            parts.append((" − " if coefficient < 0 else " + ")+("" if abs(coefficient)==1 and label else str(abs(coefficient))+(" × " if label else ""))+label)
    return "".join(parts).removeprefix(" + ").strip() or "0"


def partial(poly, axis):
    result = {}
    for exponent, c in poly.items():
        if exponent[axis]:
            key = list(exponent); key[axis] -= 1
            result[tuple(key)] = c*exponent[axis]
    return result


def polynomial_tex(poly, lhs):
    terms = []
    for (px, py), coefficient in sorted(poly.items(), key=lambda p: (-sum(p[0]), -p[0][0])):
        if abs(float(coefficient)) < 1e-14:
            continue
        label = ("x" if px == 1 else rf"x^{{{px}}}" if px else "")+("y" if py == 1 else rf"y^{{{py}}}" if py else "")
        terms.append((coefficient, label))
    if not terms:
        return lhs+"=0"
    chunks = [terms[k:k+5] for k in range(0, len(terms), 5)]
    lines = [lhs+"&="+terms_tex(chunks[0])]
    for chunk in chunks[1:]:
        text = terms_tex(chunk)
        lines.append("&"+("" if text.startswith("-") else "+")+text)
    return r"\begin{aligned}"+r"\\".join(lines)+r"\end{aligned}"


@st.cache_data(show_spinner=False)
def compile_cached(model_json):
    return g.compile_graph(json.loads(model_json))


@st.cache_data(show_spinner=False)
def analyse(model_json, method, seed, starts, maxiter, tolerance, budget, start):
    graph = compile_cached(model_json)
    result = g.search(graph, method=method, seed=seed, starts=starts, maxiter=maxiter, start=start)
    result["bound"] = g.global_bound(graph, result, tolerance=tolerance, max_boxes=budget)
    return result


def graph_figure(model, state=None, directed=False, drawing_positions=None):
    graph = nx.Graph()
    graph.add_nodes_from(range(1, model["n"]+1)); graph.add_edges_from(model["edges"])
    if drawing_positions:
        positions = {int(i):(p[0],-p[1]) for i,p in drawing_positions.items()}
    elif model["n"] == 1:
        positions = {1: (0, 0)}
    else:
        # La même disposition stable sert au brouillon et aux résultats.
        positions = nx.spring_layout(graph, seed=24)
    flow_map = {tuple(sorted((int(f["from"]), int(f["to"])))): f for f in state["flows"]} if state else {}
    fig = go.Figure()
    for edge in model["edges"]:
        f = flow_map.get(tuple(edge))
        i, j = (int(f["from"]), int(f["to"])) if f else edge
        x0, y0 = positions[i]; x1, y1 = positions[j]
        color = "#1687a0" if f and f["value"] > 1e-12 else "#a4b4be"
        fig.add_trace(go.Scatter(x=[x0, x1], y=[y0, y1], mode="lines", line=dict(color=color, width=3 if color == "#1687a0" else 1), showlegend=False, hoverinfo="skip"))
        text = f"{edge[0]} — {edge[1]}"
        if f:
            text += f"<br>a={f['coefficient']:.9g}<br>q({i}→{j})={f['value']:.9g}"
        fig.add_trace(go.Scatter(x=[(x0+x1)/2], y=[(y0+y1)/2], mode="markers", marker=dict(size=12, color=color, opacity=.5),
                                text=[text], hovertemplate="%{text}<extra></extra>", showlegend=False))
        if f and len(model["edges"]) <= 18:
            fig.add_annotation(x=(x0+x1)/2, y=(y0+y1)/2, text=f"a={f['coefficient']:.3g}"+(f"<br>q={f['value']:.4g}" if directed else ""),
                               showarrow=False, bgcolor="rgba(255,255,255,.9)", font=dict(size=10, color="#205568"))
        if directed and f:
            fig.add_annotation(x=x0+.8*(x1-x0), y=y0+.8*(y1-y0), ax=x0+.65*(x1-x0), ay=y0+.65*(y1-y0),
                               xref="x", yref="y", axref="x", ayref="y", text="", showarrow=True, arrowhead=2, arrowcolor=color)
    ids = list(range(1, model["n"]+1))
    nodes = {int(n["id"]): n for n in state["nodes"]} if state else {}
    labels = [str(i)+(f"<br>IN={nodes[i]['input']:.4g}" if nodes else "") for i in ids]
    fig.add_trace(go.Scatter(x=[positions[i][0] for i in ids], y=[positions[i][1] for i in ids], mode="markers+text", text=labels,
                            textposition="top center", marker=dict(size=23, color=["#e27737" if i == 1 else "#277b64" if i == model["n"] else "#225e83" for i in ids]),
                            hovertext=[f"Nœud {i}"+(f"<br>OUT={nodes[i]['output']:.9g}" if nodes else "") for i in ids],
                            hovertemplate="%{hovertext}<extra></extra>", showlegend=False))
    fig.update_layout(height=500, title="Transferts dans l’ordre choisi" if directed else "Liaisons non orientées", template="plotly_white",
                      xaxis=dict(visible=False), yaxis=dict(visible=False), margin=dict(l=30, r=30, t=50, b=30))
    return fig


def _set_draft(model):
    model = g.normalize(model, draft=True)
    old = st.session_state.get("s05g-draft",{})
    if model["n"] != old.get("n") or model["order"] != old.get("order"):
        st.session_state.pop("s05g-positions",None)
    st.session_state["s05g-draft"] = model
    st.session_state["s05g-revision"] = st.session_state.get("s05g-revision", 0)+1
    st.session_state["s05g-drawing-history"] = []
    st.session_state.pop("s05g-drawing-error",None)
    st.session_state.pop("s05g-validation-error",None)


def validate_graph():
    """Callback avant affichage : le changement d'onglet reste légal et immédiat."""
    try:
        model = g.normalize(st.session_state["s05g-draft"])
        compile_cached(json.dumps(model,sort_keys=True))
        st.session_state["s05g-active"] = model
        st.session_state["s05g-active-positions"] = st.session_state.get("s05g-positions") or graph_editor.positions_for(model)
        st.session_state.pop("s05g-result", None)
        st.session_state.pop("s05g-start", None)
        st.session_state.pop("s05g-validation-error",None)
        st.session_state["s05g-tabs"] = "Lagrangien et dérivées"
    except ValueError as error:
        st.session_state["s05g-validation-error"] = str(error)


def constructor(figure, json_text):
    st.subheader("1 · Choisir les nœuds, 2 · Dessiner les liaisons, 3 · Valider")
    st.caption("IN₁ = 1,0. Le dernier nœud est le terminal : OUTₙ = INₙ. Les liaisons sont non orientées.")
    current_n = st.session_state["s05g-draft"]["n"]
    if st.session_state.get("s05g-count-model") != current_n:
        st.session_state["s05g-count"] = max(2,current_n)
        st.session_state["s05g-count-model"] = current_n
    cols = st.columns(3)
    n = cols[0].number_input("Nombre de nœuds",2,24,8,1,key="s05g-count")
    if cols[1].button("Créer un dessin vide",key="s05g-empty"):
        _set_draft({"n":int(n),"edges":[]}); st.rerun()
    if cols[2].button("Reprendre l’exemple à 8 nœuds", key="s05g-reset"):
        _set_draft(g.initial_graph()); st.rerun()
    st.caption("« Créer un dessin vide » utilise le nombre choisi et retire les anciennes liaisons du brouillon.")
    with st.expander("Exemples prêts à modifier"):
        preset = st.selectbox("Autres exemples de construction", ["Choisir…", "Quatre nœuds · deux variables", "Triangle · aucun degré libre", "Cycle à 4 nœuds · une variable", "Échelle à 24 nœuds"], key="s05g-preset")
        if st.button("Charger cet exemple dans le brouillon", key="s05g-load", disabled=preset == "Choisir…"):
            if preset.startswith("Quatre"):
                model = {"n":4,"edges":[[i,j] for i in range(1,5) for j in range(i+1,5)]}
            elif preset.startswith("Triangle"):
                model = {"n": 3, "edges": [[1,2],[2,3],[1,3]]}
            elif preset.startswith("Cycle"):
                model = {"n": 4, "edges": [[1,2],[2,3],[3,4],[1,4]]}
            else:
                model = {"n": 24, "edges": [[i,i+1] for i in range(1,12)]+[[i,i+1] for i in range(13,24)]+[[i,i+12] for i in range(1,13)],
                         "order": [v for i in range(1,13) for v in (i,i+12)]}
            _set_draft(model); st.rerun()
    draft = st.session_state["s05g-draft"]
    revision = st.session_state.get("s05g-revision", 0)
    graph_editor.draw(draft)
    history = st.session_state.get("s05g-drawing-history",[])
    if st.button("Annuler la dernière modification du dessin",key="s05g-undo",disabled=not history):
        model,positions = history[-1]
        st.session_state["s05g-draft"] = model
        st.session_state["s05g-positions"] = positions
        st.session_state["s05g-drawing-history"] = history[:-1]
        st.session_state["s05g-revision"] = revision+1
        st.session_state.pop("s05g-validation-error",None)
        st.rerun()
    st.caption("Ordre de propagation : "+" → ".join(map(str,draft["order"]))+". Modifiable dans la saisie au clavier ci-dessous.")
    st.button("Valider le graphe et passer à l’analyse",type="primary",key="s05g-apply",on_click=validate_graph)
    if st.session_state.get("s05g-validation-error"):
        st.error(st.session_state["s05g-validation-error"])
        st.info("Corrigez les liaisons puis validez à nouveau. La dernière étude valide reste disponible.")
    st.caption("Les nappes utilisent exactement deux coordonnées indépendantes à la fois, les autres restant fixées au résultat retenu. "
               "Si les contraintes en laissent moins de deux, une courbe ou une configuration unique est affichée. L’exemple « Quatre nœuds » en possède deux.")
    with st.expander("Saisie au clavier et ordre de calcul"):
        if st.button("Nouveau graphe depuis 1", key="s05g-new"):
            _set_draft({"n": 1, "edges": [], "order": [1]}); st.rerun()
        node = st.selectbox("Nœud à renseigner", list(range(1, draft["n"]+1)), key="s05g-node")
        neighbors = sorted(j if i == node else i for i, j in draft["edges"] if node in (i, j))
        with st.form("s05g-neighbor-form"):
            text = st.text_input("Voisins de ce nœud", ", ".join(map(str, neighbors)), key=f"s05g-neighbors-{revision}-{node}")
            st.caption("Exemple : 2, 5, 9. Valider remplace toutes les liaisons de ce nœud ; un champ vide les retire.")
            if st.form_submit_button("Enregistrer les liaisons"):
                try:
                    _set_draft(g.set_neighbors(draft, node, g.parse_ids(text))); st.rerun()
                except ValueError as error:
                    st.error(str(error))
        if st.button("Ajouter le nœud suivant", key="s05g-add", disabled=draft["n"] >= 24):
            _set_draft({**draft, "n": draft["n"]+1, "order": draft["order"]+[draft["n"]+1]}); st.rerun()
        if st.button("Retirer le dernier nœud du brouillon", key="s05g-remove", disabled=draft["n"] == 1):
            n = draft["n"]
            new_order = [1] if n == 2 else [i for i in draft["order"] if i not in (n, n-1)]+[n-1]
            _set_draft({"n": n-1, "edges": [e for e in draft["edges"] if n not in e], "order": new_order})
            st.rerun()
        st.dataframe(pd.DataFrame([{"Nœud": i, "Voisins": ", ".join(str(b if a == i else a) for a,b in draft["edges"] if i in (a,b))} for i in range(1,draft["n"]+1)]), hide_index=True, width="stretch")
        with st.form("s05g-order-form"):
            order = st.text_input("Ordre de calcul, de 1 au terminal", ", ".join(map(str, draft["order"])), key=f"s05g-order-{revision}")
            st.caption("Chaque liaison transmet du nœud le plus tôt au plus tard dans cet ordre. La matrice reste symétrique. "
                       "Une circulation simultanée dans les deux sens serait un autre modèle.")
            if st.form_submit_button("Enregistrer l’ordre de calcul"):
                try:
                    _set_draft({**draft, "order": g.parse_ids(order)}); st.rerun()
                except ValueError as error:
                    st.error(str(error))
    with st.expander("Enregistrer ou reprendre une construction JSON"):
        st.download_button("Enregistrer le graphe JSON", json_text({**draft,"positions":st.session_state.get("s05g-positions") or graph_editor.positions_for(draft)}), "point05-graphe.json", "application/json", key="s05g-save-graph")
        uploaded = st.file_uploader("Reprendre un graphe JSON", type="json", key="s05g-import")
        if st.button("Importer dans le brouillon", key="s05g-import-button", disabled=uploaded is None):
            try:
                if uploaded.size > 1_000_000:
                    raise ValueError("Le fichier de construction doit rester inférieur à 1 Mo.")
                value = json.loads(uploaded.getvalue().decode("utf-8-sig"))
                positions = value.get("drawing_positions") if isinstance(value,dict) else None
                if isinstance(value, dict) and "model" in value:
                    value = value["model"]
                positions = value.get("positions",positions) if isinstance(value,dict) else None
                model = g.normalize(value,draft=True)
                if positions is not None:
                    _,positions = graph_editor.validate_drawing({"revision":0,"edges":model["edges"],"positions":positions},model,0)
                _set_draft(model)
                st.session_state["s05g-positions"] = positions or graph_editor.positions_for(model)
                st.rerun()
            except (ValueError, UnicodeError) as error:
                st.error("Import refusé : "+str(error))


def formulas(graph, state, diagnostics):
    st.subheader("Le minimum de variables, déduit du graphe")
    st.write(f"**{len(graph.edges)} poids**, **{len(graph.forced_zero)} zéros imposés**, "
             f"**{graph.rank} égalités indépendantes** sur les poids restants : **{graph.d} variables libres**.")
    st.latex(r"A=A^T,\quad a_{ii}=0,\quad a_{ij}=0\text{ hors liaison},\quad a_{ij}\geq0,\quad A\mathbf1=\mathbf1")
    st.caption("La symétrie impose aussi les sommes de colonnes à 1. Les bornes a ≤ 1 en découlent. "
               "Les zéros forcés sont vérifiés par des certificats linéaires rationnels avant l’élimination exacte des égalités.")
    if graph.d:
        if graph.d <= 12:
            st.latex(r"\theta=("+",".join(edge_tex(graph.edges[e]) for e in graph.free)+r"),\qquad a=b+B\theta\geq0")
        else:
            st.latex(rf"\theta=(\theta_1,\ldots,\theta_{{{graph.d}}}),\qquad a=b+B\theta\geq0")
            st.caption("Les coefficients a choisis comme coordonnées sont tous répertoriés dans le tableau des dérivées ci-dessous.")
    else:
        st.info("Toutes les valeurs sont imposées. Il n’y a aucune variable d’optimisation ni dérivée indépendante ; le résultat unique est le maximum de ce domaine réduit à un point.")
    with st.expander("Tous les poids exprimés avec ces seules variables", expanded=graph.d <= 6):
        st.dataframe(pd.DataFrame([{"Poids": graph.edge_names[e], "Expression exacte": affine_text(graph,e),
                                   "Valeur retenue": state["coefficients"][e], "Imposé à zéro": e in graph.forced_zero}
                                  for e in range(len(graph.edges))]), hide_index=True, width="stretch")
    st.subheader("Lagrangien réduit et calcul des dérivées")
    st.latex(rf"X_1=1,\quad X_j(\theta)=\sum_{{i\to j}}a_{{ij}}(\theta)X_i(\theta),\qquad R(\theta)=X_{{{graph.n}}}(\theta)")
    st.latex(rf"\boxed{{\mathcal L(\theta;\mu)=X_{{{graph.n}}}(\theta)+\sum_{{e\in E}}\mu_e\left(b_e+\sum_{{k=1}}^{{{graph.d}}}B_{{ek}}\theta_k\right)}},\quad\mu_e\geq0")
    st.caption("Les égalités sont éliminées : seules les variables libres restent dans X et a. Les μ sont des multiplicateurs de contraintes, "
               "pas des paramètres de production à maximiser. Les poids fixes utilisent μ=0.")
    with st.expander("Formule de R par substitutions successives", expanded=True):
        for node in graph.model["order"][1:]:
            formula = "+".join(edge_tex(graph.edges[e])+rf"X_{{{i}}}" for e, i in graph.incoming[node]) or "0"
            st.latex(rf"X_{{{node}}}="+formula)
        st.caption("En remplaçant chaque poids par sa ligne a=b+Bθ, ces expressions dépendent uniquement des variables indépendantes. "
                   "Cette forme factorisée évite de développer un polynôme immense pour 24 nœuds.")
    st.latex(rf"p_{{{graph.n}}}=1,\quad p_i=\sum_{{i\to j}}a_{{ij}}p_j,\qquad p_i=\frac{{\partial R}}{{\partial X_i}}")
    st.latex(r"\boxed{\frac{\partial\mathcal L}{\partial\theta_k}=\sum_{e=(i\to j)}B_{ek}(X_i p_j+\mu_e)}")
    st.latex(r"a\geq0,\quad\mu\geq0,\quad\mu_ea_e=0,\quad\nabla_\theta\mathcal L=0")
    st.caption("Le calcul adjoint remonte dans l’ordre inverse. Ces dérivées analytiques servent au solveur et aux coupes. "
               "Les KKT sont un contrôle local ; ℒ=R à la référence seulement si la complémentarité est satisfaite.")
    if graph.d:
        k = st.selectbox("Développer la dérivée par rapport à", range(graph.d), format_func=lambda k: graph.names[k], key="s05g-derivative-"+graph_key(graph))
        terms = [(row[k], rf"\left(X_{{{i}}}p_{{{j}}}+\mu_{{{graph.edges[e][0]},{graph.edges[e][1]}}}\right)")
                 for e, (row, (i,j)) in enumerate(zip(graph.mapping_exact, graph.arcs)) if row[k]]
        st.latex(rf"\frac{{\partial\mathcal L}}{{\partial {edge_tex(graph.edges[graph.free[k]])}}}="+terms_tex(terms))
        st.dataframe(pd.DataFrame({"Variable": graph.names, "Valeur": state["coordinates"], "∂R": diagnostics["gradient"], "∂ℒ": diagnostics["lagrangian_gradient"]}), hide_index=True, width="stretch")
    st.write(f"Résidu de stationnarité : **{diagnostics['stationarity_residual']:.3g}** ; complémentarité : **{diagnostics['complementarity_residual']:.3g}**.")
    with st.expander("Multiplicateurs et sensibilités des nœuds"):
        st.dataframe(pd.DataFrame({"Liaison": graph.edge_names, "Poids a": state["coefficients"], "μ": diagnostics["multipliers"]}), hide_index=True)
        st.dataframe(pd.DataFrame([{"Nœud": n["id"], "X": n["input"], "p = ∂R/∂X": n["adjoint"]} for n in state["nodes"]]), hide_index=True)


def surfaces(graph, result, diagnostics, figure):
    st.subheader("Nappes autour de la configuration retenue")
    best, mu = result["best"], diagnostics["multipliers"]
    if not graph.d:
        st.info("Aucune nappe : les contraintes ne laissent aucune variable indépendante.")
        return None
    if graph.d == 1:
        st.info("Une seule variable indépendante : le voisinage est une courbe. Deux axes indépendants ne peuvent pas être créés artificiellement.")
        x = np.linspace(max(0,best[0]-.25), min(1,best[0]+.25), 101)
        y = []
        for value in x:
            try:
                y.append(graph.evaluate([value])[0])
            except ValueError:
                y.append(None)
        figure(courbes(x, {"R admissible": y}, xlabel=graph.names[0], ylabel="R"), "s05g-curve")
        st.latex(r"\frac{d\mathcal L}{d\theta_1}=\sum_e B_{e1}(X_i p_j+\mu_e)")
        return {"mode": "courbe", "axis": graph.names[0], "x": x.tolist(), "y": y}
    cols = st.columns(4)
    ix = cols[0].selectbox("Axe x", range(graph.d), format_func=lambda i: graph.names[i], key="s05g-axis-x-"+graph_key(graph))
    choices = [i for i in range(graph.d) if i != ix]
    iy = cols[1].selectbox("Axe y", choices, index=choices.index(2) if 2 in choices else 0, format_func=lambda i: graph.names[i], key="s05g-axis-y-"+graph_key(graph)+"-"+str(ix))
    radius = cols[2].select_slider("Rayon", [.02,.05,.1,.15,.25,.5], value=.15, key="s05g-radius")
    points = cols[3].selectbox("Points par axe", [21,31,51], index=1, key="s05g-points")
    mode = st.radio("Surface étudiée", ["Sortie R admissible", "Lagrangien ℒ à μ fixés · coupe libre"], horizontal=True, key="s05g-surface-mode")
    free = mode.startswith("Lagrangien")
    axes = (ix, iy); x0, y0 = best[ix], best[iy]
    st.latex(rf"x={edge_tex(graph.edges[graph.free[ix]])},\quad y={edge_tex(graph.edges[graph.free[iy]])},\quad(x_0,y_0)=({x0:.9g},{y0:.9g})")
    st.caption("Les autres variables indépendantes restent fixes ; tous les poids dépendants sont recalculés. Le voisinage contient exactement le point de référence.")
    x,y,z = g.surface(graph, best, axes, radius=radius, points=points, multipliers=mu, free=free)
    reference = graph.lagrangian(best,mu)[0] if free else result["objective"]
    if free:
        st.warning("Coupe libre à μ fixés : les inégalités peuvent être violées et ℒ n’est pas une production. Un point stationnaire peut être une selle.")
    else:
        st.caption(f"{np.isfinite(z).sum()} / {z.size} points admissibles. Les points interdits sont masqués ; une frontière ou un domaine réduit à une ligne restent visibles.")
    label = "ℒ libre" if free else "R admissible"
    fig = nappe(x,y,z,xlabel=graph.names[ix],ylabel=graph.names[iy],zlabel=label,reference=(x0,y0,reference))
    fig.update_layout(title=dict(text=f"05 · {label} · référence {reference:.8g}",x=.02),margin=dict(t=55))
    figure(fig,"s05-surface")
    poly = graph.slice_polynomial(best,axes,mu if free else None)
    hx, hy = partial(poly,0),partial(poly,1)
    grad = diagnostics["lagrangian_gradient"] if free else diagnostics["gradient"]
    st.latex(rf"h_x(x_0,y_0)={grad[ix]:.8g},\qquad h_y(x_0,y_0)={grad[iy]:.8g}")
    with st.expander("Expressions de h(x,y) et de ses deux dérivées",expanded=len(poly)<=20):
        st.caption("Développement limité à ces deux variables. Les coefficients simples sont exacts ; les autres sont affichés à six chiffres significatifs.")
        for lhs, p in [("h(x,y)",poly),(r"\partial h/\partial x",hx),(r"\partial h/\partial y",hy)]:
            st.latex(polynomial_tex(p,lhs))
    with st.expander("Profils et export des points"):
        def profile(values,axis):
            out=[]
            for value in values:
                point=best.copy();point[axis]=float(value)
                try:
                    out.append(graph.lagrangian(point,mu)[0] if free else graph.evaluate(point)[0])
                except ValueError:
                    out.append(None)
            return out
        figure(courbes(x,{f"y={y0:.7g}":profile(x,ix)},xlabel=graph.names[ix],ylabel=label),"s05g-profile-x")
        figure(courbes(y,{f"x={x0:.7g}":profile(y,iy)},xlabel=graph.names[iy],ylabel=label),"s05g-profile-y")
        frame=pd.DataFrame([{graph.names[ix]:float(vx),graph.names[iy]:float(vy),label:z[j,i]} for j,vy in enumerate(y) for i,vx in enumerate(x)])
        st.download_button("Nappe CSV",frame.to_csv(index=False).encode("utf-8-sig"),"point05-nappe.csv","text/csv",key="s05g-csv")
    return {"axes":[graph.names[ix],graph.names[iy]],"mode":mode,"center":[x0,y0,reference],"x":x.tolist(),"y":y.tolist(),"z":z.tolist(),
            "polynomial":[{"powers":list(e),"coefficient_exact":str(c)} for e,c in poly.items()]}


def stochastic_page(figure, json_text, download_result):
    st.header("05 · Construire et analyser un graphe")
    st.write("L’exemple à huit nœuds est le point de départ d’un atelier de **2 à 24 nœuds**, "
             "avec liaisons non orientées et matrice symétrique doublement stochastique. **IN₁ = 1,0 ; OUTₙ = INₙ** au dernier nœud.")
    st.caption("Dessinez les liaisons dans le premier onglet, puis validez. Le lagrangien réduit, ses dérivées et les nappes sont recalculés pour ce graphe.")
    st.session_state.setdefault("s05g-active",g.normalize(g.initial_graph()))
    st.session_state.setdefault("s05g-draft",g.normalize(g.initial_graph()))
    active=st.session_state["s05g-active"]
    model_json=json_text(active)
    graph=compile_cached(model_json)
    if st.session_state["s05g-draft"] != active:
        st.info(f"Brouillon en cours : {st.session_state['s05g-draft']['n']} nœud(s). Les autres onglets concernent encore le graphe validé de {graph.n} nœuds, jusqu’à votre validation.")
    tabs=st.tabs(["Construire le graphe","Lagrangien et dérivées","Optimum et flux","Nappes"],key="s05g-tabs",on_change="rerun")
    with tabs[0]:
        constructor(figure,json_text)
    with tabs[1]:
        is_initial=active==g.normalize(g.initial_graph())
        start=st.session_state.get("s05g-start",list(map(str,graph.start_exact)))
        with st.expander("Recherche, précision et configuration de départ"):
            method=st.selectbox("Recherche",["multi","local"],format_func=lambda v:"Plusieurs départs SLSQP" if v=="multi" else "Un départ SLSQP",key="s05g-method")
            cols=st.columns(4)
            starts=cols[0].number_input("Nombre de départs",1,40,16 if is_initial else 4,1,key="s05g-starts-"+str(graph.d),disabled=method=="local")
            seed=cols[1].number_input("Graine",0,2**32-1,42,1,key="s05g-seed")
            budget=cols[2].number_input("Budget de subdivisions",100,150000,30000 if is_initial else 1500,100,key="s05g-budget-"+str(is_initial))
            tolerance=cols[3].selectbox("Écart global visé",[1e-4,1e-6,1e-8],index=1,key="s05g-tolerance")
            maxiter=st.number_input("Itérations maximales par départ",10,500,200 if graph.d<=20 else 60,10,key="s05g-maxiter-"+str(graph.d))
            st.caption("Le calcul peut fournir une borne ouverte pour un grand graphe. L’accord de recherches locales ne prouve pas le maximum global. "
                       "La borne Bernstein de l’exemple initial n’est pas réutilisée pour un graphe ou un ordre différent.")
            if graph.d:
                with st.form("s05g-start-form"):
                    text=st.text_input("Valeurs initiales, dans l’ordre des variables ci-dessous",", ".join(start),key="s05g-start-text-"+model_json)
                    st.caption(", ".join(graph.names)+". Fractions acceptées, par exemple 1/2.")
                    if st.form_submit_button("Appliquer le départ"):
                        try:
                            values=[str(F(v.strip())) for v in text.split(",")]
                            graph.exact_value(values)
                            st.session_state["s05g-start"]=values
                            st.session_state.pop("s05g-result",None)
                            st.rerun()
                        except (ValueError,ZeroDivisionError) as error:
                            st.error("Départ refusé : "+str(error))
        settings=(model_json,method,int(seed),int(starts),int(maxiter),float(tolerance),int(budget),tuple(start))
        previous=st.session_state.get("s05g-result")
        if not graph.d:
            result=g.search(graph,start=start)
            result["bound"]=g.global_bound(graph,result)
        elif is_initial and previous is None:
            with st.spinner("Calcul de l’exemple initial…"):
                result=analyse(*settings)
            st.session_state["s05g-result"]=(settings,result)
        elif previous and previous[0]==settings:
            result=previous[1]
        else:
            # Montrer les formules dès la validation, sans lancer un calcul lourd à chaque édition.
            value=graph.exact_value(start)
            result={"best":[float(F(v)) for v in start],"best_exact":list(start),"objective":float(value),"exact_value":str(value),"runs":[],"method":"départ", "bound":None}
        if st.button("Rechercher le maximum",type="primary",key="s05g-search",disabled=not graph.d):
            with st.spinner("Recherche avec le budget choisi…"):
                result=analyse(*settings)
            st.session_state["s05g-result"]=(settings,result)
        state=graph.state(result["best"]);diagnostics=graph.kkt(result["best"])
        cols=st.columns(3)
        cols[0].metric("Sortie au départ",f"{float(graph.exact_value(start)):.10g}")
        cols[1].metric("Meilleure sortie trouvée R" if result["method"]!="départ" else "Sortie de la configuration de départ",f"{state['objective']:.10g}")
        bound=result["bound"]
        cols[2].metric("Écart avec la borne globale",f"{bound['gap']:.3g}" if bound else "À calculer")
        if bound:
            st.write(f"**Encadrement du maximum global : [{bound['lower']:.12g} ; {bound['upper']:.12g}]** — {bound['status']}.")
        else:
            st.caption("Les formules et les figures portent sur le départ compatible. Lancer la recherche pour les centrer sur le meilleur résultat trouvé.")
        formulas(graph,state,diagnostics)
    with tabs[2]:
        st.subheader(f"Graphe validé : {graph.n} nœuds et {len(graph.edges)} liaisons")
        st.write("Ordre de propagation : "+" → ".join(map(str,active["order"])))
        st.caption("Les poids symétriques multiplient IN. La part non transmise vers l’aval n’est pas redistribuée. "
                   "Il ne s’agit pas d’un équilibre avec circulation dans les deux sens.")
        directed=st.toggle("Afficher les transferts vers le terminal",key="s05-directed")
        figure(graph_figure(active,state,directed,st.session_state.get("s05g-active-positions")),"s05g-result-graph")
        rows=[]
        for n in state["nodes"]:
            rows.append({"Nœud":n["id"],"Apports depuis":" ; ".join(f"{f['from']} : {f['value']:.6g}" for f in n["incoming"]) or ("Source = 1" if n["id"]=="1" else "Aucun apport"),
                         "IN":n["input"],"OUT":n["output"],"Vers":" ; ".join(f"{f['to']} : {f['value']:.6g}" for f in n["outgoing"]),"Non transmis":n["unused"]})
        st.dataframe(pd.DataFrame(rows),hide_index=True,width="stretch")
        with st.expander("Matrice, recherches et certificat"):
            st.dataframe(pd.DataFrame(state["matrix"],index=range(1,graph.n+1),columns=range(1,graph.n+1)),width="stretch")
            st.caption(f"Résidu des sommes à 1 : {state['stochastic_residual']:.3g} ; bilan global : {state['balance_residual']:.3g}.")
            st.dataframe(pd.DataFrame(result["runs"]),width="stretch")
            if bound:st.json(bound)
    with tabs[3]:
        sampled=surfaces(graph,result,diagnostics,figure)
    download_result({"study":"05-custom-symmetric-forward-v2","model":active,"drawing_positions":st.session_state.get("s05g-active-positions") or graph_editor.positions_for(active),"start":start,"independent_names":graph.names,
                     "reduction":{"dimension":graph.d,"rank":graph.rank,"forced_zero_edges":[list(graph.edges[e]) for e in graph.forced_zero],
                                  "offset_exact":list(map(str,graph.offset_exact)),"mapping_exact":[list(map(str,row)) for row in graph.mapping_exact],
                                  "zero_certificates":graph.zero_certificates},
                     "search":result,"state":state,"kkt":diagnostics,"surface":sampled},"point05-etude")
