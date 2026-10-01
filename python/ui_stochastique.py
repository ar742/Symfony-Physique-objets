"""Point 05 : calculs, explications et vues du même état de référence."""
from fractions import Fraction

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from physique_graphes import stochastique as s
from physique_graphes.visualisation import nappe, courbes


@st.cache_data(show_spinner=False)
def analyse(start, method, seed, starts, tolerance, budget):
    result = s.search(start, method=method, seed=seed, starts=starts)
    result["bound"] = s.global_bound(result["best"], tolerance=tolerance, max_boxes=budget)
    return result


def _number(c):
    f = Fraction(c)
    if f.denominator <= 4096:
        return str(f.numerator) if f.denominator == 1 else rf"\frac{{{f.numerator}}}{{{f.denominator}}}"
    return f"{float(c):.6g}"


def _latex(poly):
    terms = []
    for (px, py), c in sorted(poly.items(), key=lambda pair: (-sum(pair[0]), -pair[0][0])):
        if abs(float(c)) < 1e-14:
            continue
        variables = ("x" if px == 1 else rf"x^{{{px}}}" if px else "") + ("y" if py == 1 else rf"y^{{{py}}}" if py else "")
        coefficient = "" if abs(c) == 1 and variables else _number(abs(c))
        terms.append(("-" if c < 0 else "+")+coefficient+variables)
    return "".join(terms).lstrip("+") or "0"


def _partial(poly, axis):
    result = {}
    for exponent, coefficient in poly.items():
        if exponent[axis]:
            power = list(exponent)
            power[axis] -= 1
            result[tuple(power)] = coefficient*exponent[axis]
    return result


def _graph(state, directed=False):
    positions = {"1": (0, 0), "2": (1.5, 1.1), "5": (1.5, -1.1), "3": (3.3, 1.1),
                 "7": (3.3, -1.1), "4": (5.1, 1.1), "6": (5.1, -1.1), "8": (7, 0)}
    routes = {"2-8": [(1.5, 2.35), (6.3, 2.35)], "5-3": [(2.25, .2)],
              "7-4": [(4.55, -.3)], "3-6": [(3.8, .1)]}
    labels = {"1-2": (.6, .8), "1-5": (.6, -.8), "2-3": (2.4, 1.35), "2-8": (4.2, 2.35),
              "5-3": (2.25, .15), "5-7": (2.4, -1.4), "7-6": (4.25, -1.4), "7-4": (4.8, -.35),
              "3-4": (4.25, 1.4), "3-6": (3.8, .05), "4-8": (6.1, .9), "6-8": (6.1, -.9)}
    fig = go.Figure()
    for flow in state["flows"]:
        i, j, a, q = flow["from"], flow["to"], flow["coefficient"], flow["value"]
        key = i+"-"+j
        path = [positions[i], *routes.get(key, []), positions[j]]
        x, y = zip(*path)
        color = "#1e7893" if q > 1e-12 else "#94a3b8"
        fig.add_trace(go.Scatter(x=x, y=y, mode="lines", line=dict(color=color, width=3 if q > 1e-12 else 1.5),
                                showlegend=False, hoverinfo="skip"))
        if directed:
            x0, y0 = path[-2]
            x1, y1 = path[-1]
            fig.add_annotation(x=x0+.85*(x1-x0), y=y0+.85*(y1-y0), ax=x0+.65*(x1-x0), ay=y0+.65*(y1-y0),
                               xref="x", yref="y", axref="x", ayref="y", text="", showarrow=True, arrowhead=2, arrowcolor=color)
        lx, ly = labels[key]
        fig.add_annotation(x=lx, y=ly, text=f"a={a:.4g}"+(f"<br>q={q:.5g}" if directed else ""),
                           showarrow=False, bgcolor="rgba(255,255,255,.95)", font=dict(size=12, color="#174b65"), borderpad=3)
        fig.add_trace(go.Scatter(x=[lx], y=[ly], mode="markers", marker=dict(size=30, opacity=0),
                                text=[f"Liaison {i}–{j}<br>aᵢⱼ = aⱼᵢ = {a:.12g}<br>Transfert {i} → {j} : q = a × IN{i} = {q:.12g}"],
                                hovertemplate="%{text}<extra></extra>", showlegend=False))
    nodes = state["nodes"]
    fig.add_trace(go.Scatter(x=[positions[n["id"]][0] for n in nodes], y=[positions[n["id"]][1] for n in nodes],
                            mode="markers+text", text=[f"<b>{n['id']}</b><br>IN={n['input']:.5g}" for n in nodes], textposition="top center",
                            marker=dict(size=26, color="#174b65"),
                            hovertext=[f"Nœud {n['id']}<br>IN={n['input']:.12g}<br>OUT={n['output']:.12g}" for n in nodes],
                            hovertemplate="%{hovertext}<extra></extra>", showlegend=False))
    fig.update_layout(height=580, template="plotly_white", margin=dict(l=30, r=30, t=50, b=25),
                      title="Transferts calculés vers 8" if directed else "Support non orienté · poids symétriques",
                      xaxis=dict(visible=False, range=[-.5, 7.6]), yaxis=dict(visible=False, range=[-1.95, 2.9]))
    return fig


def _formulas():
    st.subheader("Cinq variables indépendantes et un lagrangien explicite")
    st.write("Les douze poids des liaisons vérifient huit sommes nodales. Leur rang est 7 : "
             "le graphe est biparti, avec les groupes {1, 3, 7, 8} et {2, 4, 5, 6}. "
             "Les sommes de colonnes découlent de la symétrie. Il reste donc **12 − 7 = 5 variables indépendantes**.")
    st.latex(r"(t,u,v,w,z)=(a_{12},a_{23},a_{35},a_{34},a_{67}),\qquad a_{ij}=a_{ji}")
    st.dataframe(pd.DataFrame({"Coefficient": s.EDGE_NAMES, "Expression": s.EXPRESSIONS}), hide_index=True, width="stretch")
    st.caption("Chaque expression doit être ≥ 0. Avec les sommes à 1, cela impose aussi aᵢⱼ ≤ 1. "
               "Les cinq coefficients ne peuvent donc pas être réglés librement dans un simple cube.")
    st.latex(r"A=X_3=tu+(1-t)v,\quad B=X_7=(1-t)(t-v)")
    st.latex(r"H=1-t+v-z,\ J=1-u-v-w,\ K=t-v+z-w,\ M=u+v+w-z,\ D=1-t-u")
    st.latex(r"P=X_4=wA+HB,\quad Q=X_6=JA+zB,\quad R=X_8=tD+KP+MQ")
    st.latex(r"\boxed{\mathcal L(t,u,v,w,z;\mu)=R(t,u,v,w,z)+\sum_{e=1}^{12}\mu_e a_e(t,u,v,w,z)},\quad\mu_e\geq0")
    st.write("Les égalités sont éliminées ; les multiplicateurs μ imposent les douze inégalités aₑ ≥ 0 "
             "pour cette maximisation. Les bornes supérieures sont redondantes. Les conditions KKT sont :")
    st.latex(r"\nabla R+B_a^T\mu=0,\quad a\geq0,\quad\mu\geq0,\quad\mu_e a_e=0,\qquad a=b_a+B_a(t,u,v,w,z)^T")
    st.caption("ℒ = R à la référence si la complémentarité est satisfaite. Ailleurs, même pour des poids admissibles, "
               "les termes μₑaₑ peuvent être non nuls. Une coupe libre de ℒ ne représente alors pas une sortie réalisable.")
    with st.expander("Développer les cinq dérivées partielles", expanded=True):
        st.latex(r"A_t=u-v,\ A_u=t,\ A_v=1-t,\ A_w=A_z=0")
        st.latex(r"B_t=1-2t+v,\ B_v=t-1,\ B_u=B_w=B_z=0")
        st.latex(r"P_k=wA_k+A\delta_{kw}+HB_k+BH_k,\quad Q_k=JA_k+AJ_k+zB_k+B\delta_{kz}")
        st.latex(r"R_k=\delta_{kt}D+tD_k+K_kP+KP_k+M_kQ+MQ_k\quad(k=t,u,v,w,z)")
        st.dataframe(pd.DataFrame({"k": ["t", "u", "v", "w", "z"], "D_k": [-1,-1,0,0,0], "H_k": [-1,0,1,0,-1],
                                   "J_k": [0,-1,-1,-1,0], "K_k": [1,0,-1,-1,1], "M_k": [0,1,1,1,-1]}), hide_index=True)
        st.latex(r"\mathcal L_t=R_t+\mu_{12}-\mu_{15}-\mu_{28}+\mu_{57}-\mu_{47}+\mu_{48}")
        st.latex(r"\mathcal L_u=R_u+\mu_{23}-\mu_{28}-\mu_{36}+\mu_{68}")
        st.latex(r"\mathcal L_v=R_v+\mu_{35}-\mu_{57}+\mu_{47}-\mu_{36}-\mu_{48}+\mu_{68}")
        st.latex(r"\mathcal L_w=R_w+\mu_{34}-\mu_{36}-\mu_{48}+\mu_{68},\quad\mathcal L_z=R_z+\mu_{67}-\mu_{47}+\mu_{48}-\mu_{68}")
        st.caption("δ vaut 1 si ses indices sont égaux, sinon 0. Ces dérivées analytiques sont celles utilisées par le moteur.")


def stochastic_page(figure, json_text, download_result):
    st.header("05 · Liaisons symétriques et optimum")
    st.write("Huit nœuds, douze liaisons non orientées, une matrice symétrique doublement stochastique. "
             "**Exp. IN₁ = 1 ; Exp. OUT₈ = Exp. IN₈.** Les attributs et résultats sont calculés.")
    st.info("Le support et les poids sont non orientés. Pour calculer les entrées, on conserve la chaîne de transfert "
            "du point 04 : 1 → {2, 5} → {3, 7} → {4, 6} → 8, avec le raccourci 2 → 8. "
            "Il ne s’agit pas d’un équilibre avec circulation dans les deux sens.")
    st.latex(r"q_{ij}=a_{ij}X_i,\quad X_i=\sum_{j\to i}q_{ji},\quad Y_i=\sum_{i\to j}q_{ij}\ (i<8),\quad R=Y_8=X_8")
    st.caption("X = Exp. IN ; Y = Exp. OUT. Les sommes de A concernent tous les voisins, tandis que Y ne compte que "
               "les transferts vers l’aval. X − Y est la part non transmise dans cette convention ; elle n’est ni renormalisée ni réinjectée.")

    start = tuple(st.session_state.get("s05-start", s.START))
    with st.expander("Régler le départ et la précision"):
        with st.form("s05-settings"):
            cols = st.columns(5)
            supplied = tuple(cols[i].number_input(name, min_value=0., max_value=1., value=float(start[i]), step=.05,
                                                  format="%.6f", key="s05-initial-"+name) for i, name in enumerate(s.NAMES))
            submitted = st.form_submit_button("Appliquer le départ")
        if submitted:
            try:
                s.exact_witness(supplied)
                st.session_state["s05-start"] = supplied
                start = supplied
            except ValueError:
                st.error("Départ refusé : les douze poids reconstruits doivent rester positifs ou nuls. Le dernier départ valide est conservé.")
        method = st.selectbox("Recherche", ["multi", "local"], key="s05-method",
                              format_func=lambda x: "Plusieurs départs SLSQP + encadrement global" if x == "multi" else "Un départ SLSQP + encadrement global")
        cols = st.columns(4)
        seed = cols[0].number_input("Graine de recherche", min_value=0, max_value=2**32-1, value=42, step=1, key="s05-seed")
        starts = cols[1].number_input("Nombre de départs", min_value=1, max_value=40, value=16, step=1, key="s05-starts", disabled=method == "local")
        tolerance = cols[2].selectbox("Écart global visé", [1e-4, 1e-6, 1e-8], index=1, key="s05-tolerance", format_func=lambda x: f"{x:g}")
        budget = cols[3].number_input("Budget de subdivisions", min_value=100, max_value=150000, value=30000, step=1000, key="s05-budget")
        st.caption("Le calcul se met à jour après validation du départ ou changement de méthode. Une borne ouverte reste affichée si le budget est atteint. "
                   "Les candidats numériques simplifiés en rationnels sont revérifiés avant d’être retenus.")
    with st.spinner("Recherche et vérification de la borne sur tout le domaine…"):
        result = analyse(start, method, int(seed), int(starts), float(tolerance), int(budget))
    best = result["best"]
    state = s.evaluate(best)
    bound = result["bound"]
    diagnostics = s.kkt(best)
    cols = st.columns(3)
    cols[0].metric("Sortie au départ", f"{s.evaluate(start)['objective']:.10g}")
    cols[1].metric("Meilleure sortie trouvée R", f"{state['objective']:.10g}")
    cols[2].metric("Écart avec la borne globale", f"{bound['gap']:.3g}")
    st.write(f"**Encadrement du maximum global : [{bound['lower']:.12g} ; {bound['upper']:.12g}]** — {bound['status']}.")
    st.caption("La borne est obtenue par coefficients de Bernstein avec arrondis vers le haut et subdivision du domaine. "
               "L’intervalle certifie la précision annoncée ; il ne démontre pas l’égalité exacte du maximum avec 5/16.")
    st.dataframe(pd.DataFrame({"Variable": s.NAMES, "Départ": start, "Configuration retenue": best}), hide_index=True, width="stretch")
    with st.expander("Comparer les recherches locales et lire le certificat"):
        st.dataframe(pd.DataFrame([{"Départ n°": i+1, "R trouvé": run["objective"], "Convergence": run["converged"],
                                   "Itérations": run["iterations"], "Statut": run["status"]} for i, run in enumerate(result["runs"])]), hide_index=True)
        st.json(bound)
        st.caption("Un résultat local inférieur peut subsister. La borne globale reste indépendante des conditions KKT et des différentes recherches locales.")

    _formulas()
    st.subheader("Dérivées et contraintes à la configuration retenue")
    st.dataframe(pd.DataFrame({"Variable": s.NAMES, "∂R": diagnostics["gradient"], "∂ℒ": diagnostics["lagrangian_gradient"]}), hide_index=True, width="stretch")
    st.dataframe(pd.DataFrame({"Liaison": s.EDGE_NAMES, "a retenu": state["coefficients"], "μ ≥ 0": diagnostics["multipliers"]}), hide_index=True)
    st.write(f"Résidu de stationnarité : **{diagnostics['stationarity_residual']:.3g}** ; "
             f"résidu de complémentarité : **{diagnostics['complementarity_residual']:.3g}**.")
    st.caption("Sur une borne active, ∂R peut être non nul. Ce sont les dérivées du lagrangien qui s’annulent, avec les multiplicateurs appropriés. "
               "Les KKT sont un diagnostic local, pas une preuve du maximum global.")

    st.subheader("Entrées, sorties et matrice de la configuration retenue")
    rows = []
    for n in state["nodes"]:
        incoming = " ; ".join(f"{f['from']} : {f['value']:.7g}" for f in n["incoming"]) or "Source = 1"
        outgoing = " ; ".join(f"{f['to']} : {f['value']:.7g} (a={f['coefficient']:.5g})" for f in n["outgoing"]) or "Sortie terminale"
        rows.append({"Nœud": n["id"], "Apports depuis": incoming, "IN total": n["input"], "OUT total": n["output"],
                     "Transferts vers": outgoing, "Non transmis": n["unused"]})
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    with st.expander("Matrice A · symétrie, diagonale et sommes"):
        frame = pd.DataFrame(state["matrix"], index=[str(i) for i in range(1, 9)], columns=[str(i) for i in range(1, 9)])
        frame["Somme ligne"] = frame.sum(axis=1)
        st.dataframe(frame, width="stretch")
        st.write("Sommes des colonnes :", np.array(state["matrix"]).sum(axis=0).tolist())
        st.caption(f"Résidu stochastique : {state['stochastic_residual']:.3g} ; bilan 1 − R − Σ(non transmis) : {state['balance_residual']:.3g}.")
    directed = st.toggle("Afficher les transferts vers 8 et leurs flèches", key="s05-directed")
    figure(_graph(state, directed), "s05-graph")

    st.subheader("Nappes autour de la configuration retenue")
    st.write("Le voisinage est centré sur les coefficients retenus. Dans la nappe de sortie R, les points "
             "hors contraintes sont retirés : un optimum de frontière reste un optimum de frontière.")
    cols = st.columns(4)
    ix = cols[0].selectbox("Axe x", range(5), format_func=lambda i: s.NAMES[i], key="s05-x")
    choices = [i for i in range(5) if i != ix]
    iy = cols[1].selectbox("Axe y", choices, index=choices.index(2) if 2 in choices else 0, format_func=lambda i: s.NAMES[i], key="s05-y")
    radius = cols[2].select_slider("Rayon", [.02, .05, .1, .15, .25, .5], value=.15, key="s05-radius")
    points = cols[3].selectbox("Points par axe", [21, 31, 51], index=1, key="s05-points")
    axes = (ix, iy)
    x0, y0 = best[ix], best[iy]
    st.latex(rf"x={s.NAMES[ix][0]}_{{{s.NAMES[ix][1:]}}},\quad y=a_{{{s.NAMES[iy][1:]}}},\quad (x_0,y_0)=({x0:.10g},{y0:.10g})")
    mode = st.radio("Surface étudiée", ["Sortie R admissible", "Lagrangien ℒ à μ fixés · coupe libre"], horizontal=True, key="s05-surface-mode")
    free = mode.startswith("Lagrangien")
    mu = diagnostics["multipliers"]
    x, y, z = s.surface(best, axes, radius=radius, points=points, multipliers=mu, free=free)
    ref = s.lagrangian(best, mu)[0] if free else state["objective"]
    label = "ℒ libre" if free else "R admissible"
    if free:
        st.warning("Les autres coefficients indépendants et les multiplicateurs restent fixes. Des poids négatifs ou supérieurs à 1 "
                   "sont admis dans cette coupe de la formule : ℒ n’est pas une production. Son point stationnaire peut être une selle.")
    else:
        st.caption(f"{np.isfinite(z).sum()} / {z.size} points admissibles. Aucune normalisation des poids et aucun remplissage des zones interdites.")
        if np.isfinite(z).sum() < min(z.shape)*2:
            st.info("Cette paire laisse peu de directions admissibles avec les trois autres coefficients fixés. Essayer a12 / a35 ou a12 / a23.")
    surface_figure = nappe(x, y, z, xlabel=s.NAMES[ix], ylabel=s.NAMES[iy], zlabel=label, reference=(x0, y0, ref))
    surface_figure.update_layout(title=dict(text=f"05 · {label} · référence {ref:.8g}", x=.02), margin=dict(t=55))
    figure(surface_figure, "s05-surface")
    poly = s.slice_polynomial(best, axes, mu if free else None)
    st.caption("Expression de la coupe : exacte pour les coefficients rationnels simples ; les autres coefficients sont affichés à six chiffres significatifs.")
    st.latex(r"h(x,y)="+_latex(poly))
    st.latex(r"\frac{\partial h}{\partial x}="+_latex(_partial(poly, 0)))
    st.latex(r"\frac{\partial h}{\partial y}="+_latex(_partial(poly, 1)))
    grad = diagnostics["lagrangian_gradient"] if free else diagnostics["gradient"]
    st.latex(rf"h_x(x_0,y_0)={grad[ix]:.8g},\qquad h_y(x_0,y_0)={grad[iy]:.8g}")
    hx = s.derivatives(best)[1][np.ix_(axes, axes)]
    st.caption("Valeurs propres de la Hessienne de la coupe : "+", ".join(f"{v:.7g}" for v in np.linalg.eigvalsh(hx))+". Les contraintes sont affines, donc ℒ et R ont la même Hessienne.")
    with st.expander("Profils passant par le centre et export des échantillons"):
        def profile(v, axis):
            point = np.array(best)
            point[axis] = v
            return s.lagrangian(point, mu)[0] if free else s.objective_gradient(point)[0] if s.feasible(point, 1e-14) else None
        figure(courbes(x, {f"{s.NAMES[iy]} = {y0:.7g}": [profile(v, ix) for v in x]}, xlabel=s.NAMES[ix], ylabel=label), "s05-x-profile")
        figure(courbes(y, {f"{s.NAMES[ix]} = {x0:.7g}": [profile(v, iy) for v in y]}, xlabel=s.NAMES[iy], ylabel=label), "s05-y-profile")
        data = pd.DataFrame([{s.NAMES[ix]: vx, s.NAMES[iy]: vy, label: z[j, i]} for j, vy in enumerate(y) for i, vx in enumerate(x)])
        st.download_button("Nappe CSV", data.to_csv(index=False).encode("utf-8-sig"), "point05-nappe.csv", "text/csv", key="s05-csv")
    download_result({"study": "05-symmetric-forward-v1", "conventions": {"support": "undirected", "propagation": "forward DAG", "source_input": 1, "terminal": "OUT8=IN8"},
                     "independent_names": s.NAMES, "start": start, "search": result, "state": state, "kkt": diagnostics,
                     "surface": {"axes": [s.NAMES[ix], s.NAMES[iy]], "mode": mode, "center": [x0, y0, ref], "x": x.tolist(), "y": y.tolist(), "z": z.tolist()}}, "point05-etude")
