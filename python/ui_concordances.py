"""Présentation de l'étude nodale : paramètres, recherche, flux et nappes."""
from copy import deepcopy
import secrets

import numpy as np
import pandas as pd
import streamlit as st

from physique_graphes import concordances as c
from physique_graphes import optimisation_concordances as opt
from physique_graphes.types_concordances import (
    MATRIX_TYPES, ENVIRONMENT_TYPES, apply_matrix_type,
    apply_environment_type, create_default_model,
)
from physique_graphes.visualisation import (
    matrice_concordances, graphe_concordances, echantillonner_surface, nappe, courbes,
)

MODEL_KEY = "concordances-active"
SETTINGS_KEY = "concordances-settings"
GROUP_LABELS = {"shares": "Distributions · 5 partages", "environments": "Environnements eᵢ · 7 variables",
                "epsilon": "Concordances εᵢⱼ actives · 12 variables"}
METHOD_LABELS = {"compare": "Comparer SLSQP et évolution différentielle", "local": "SLSQP · recherche locale",
                 "evolution": "Évolution différentielle · exploration", "grid": "Grille · énumération finie",
                 "interval": "Intervalles · encadrement global des distributions"}
STATUS_LABELS = {"certified": "Encadrement à la tolérance atteint", "evaluation-limit": "Budget d’évaluations atteint",
                 "node-limit": "Budget de boîtes atteint", "budget": "Budget atteint", "complete": "Grille complète",
                 "local-stop": "Convergence locale", "evolution-stop": "Arrêt de l’exploration",
                 "iteration-limit": "Limite d’itérations", "solver-stop": "Arrêt du solveur", "cancelled": "Interrompu"}


def _setup():
    if MODEL_KEY not in st.session_state:
        seed = secrets.randbelow(2**32)
        st.session_state[MODEL_KEY] = create_default_model(seed=seed)
        st.session_state[SETTINGS_KEY] = {"matrix": "random-signed", "environment": "neutre",
                                        "matrix-seed": seed, "environment-seed": seed,
                                        "domain": "signed", "group": "shares"}
    if SETTINGS_KEY not in st.session_state:
        # Une étude déjà ouverte avant la mise à jour reste intacte.
        st.session_state[SETTINGS_KEY] = {"matrix": "custom", "environment": "custom", "matrix-seed": 34,
                                        "environment-seed": 34, "domain": "signed", "group": "shares"}
    model = st.session_state[MODEL_KEY]
    ready = c.validate_model(model)
    # Compléter aussi les anciens modèles à matrice partielle, sans perdre leurs attributs.
    model.setdefault("initial_controls", ready["initial_controls"])
    model["epsilon"] = {str(i): {str(j): ready["epsilon"].get(str(i), {}).get(str(j), 0)
                                  for j in range(1, 9)} for i in range(1, 9)}
    config = st.session_state[SETTINGS_KEY]
    for name, value in config.items():
        # Les clés persistantes ne sont pas effacées par la navigation Streamlit.
        st.session_state["c04-"+name] = value
    return config


def _remember(name):
    st.session_state[SETTINGS_KEY][name] = st.session_state["c04-"+name]


def _choose(component):
    _remember(component)
    config = st.session_state[SETTINGS_KEY]
    kind = config[component]
    if kind != "custom":
        apply = apply_matrix_type if component == "matrix" else apply_environment_type
        st.session_state[MODEL_KEY] = apply(st.session_state[MODEL_KEY], kind,
                                             seed=config[component+"-seed"])


def _seed(component):
    _remember(component+"-seed")
    _choose(component)


def _controls_form(model):
    st.caption("Une modification de type remplace uniquement la composante correspondante. "
               "Les flèches des graines donnent un nouveau tirage reproductible, sans bouton de tirage.")
    for component, types in (("matrix", MATRIX_TYPES), ("environment", ENVIRONMENT_TYPES)):
        label = "Graine de la matrice" if component == "matrix" else "Graine des environnements"
        st.number_input(label, min_value=0, max_value=2**32-1, step=1, key="c04-"+component+"-seed",
                        on_change=_seed, args=(component,))
        kind = st.session_state[SETTINGS_KEY][component]
        if kind.startswith("seed-"):
            st.caption("Ce type utilise sa graine fixe. Pour varier la graine, choisir un type « aléatoire ».")
    with st.form("c04-parameters"):
        st.markdown("**Environnements e₂ à e₈** · bornes [−1,1]")
        env = st.data_editor(pd.DataFrame([{"nœud": str(i), "eᵢ": model["environments"][str(i)]}
                                          for i in range(2, 9)]), disabled=["nœud"], hide_index=True,
                             column_config={"eᵢ": st.column_config.NumberColumn(min_value=-1., max_value=1., step=.1)},
                             key="c04-env-editor", width="stretch")
        st.markdown("**Matrice ε** · ligne = destinataire i, colonne = fournisseur j ; diagonale nulle")
        ids = [str(i) for i in range(1, 9)]
        matrix = st.data_editor(pd.DataFrame.from_dict(model["epsilon"], orient="index").reindex(index=ids, columns=ids),
                                key="c04-matrix-editor", width="stretch",
                                column_config={n: st.column_config.NumberColumn(min_value=-1., max_value=1., step=.1) for n in ids})
        st.markdown("**Distributions de départ** · la seconde part vaut 1−s")
        destination = {"s1": "1→2 / 1→5", "s2": "2→3 / 2→8", "s5": "5→3 / 5→7",
                       "s3": "3→4 / 3→6", "s7": "7→6 / 7→4"}
        shares = st.data_editor(pd.DataFrame([{"partage": name, "branches": destination[name],
                                               "s": model["initial_controls"][name]} for name in c.GRAPH["controls"]]),
                                disabled=["partage", "branches"], hide_index=True, width="stretch", key="c04-shares-editor",
                                column_config={"s": st.column_config.NumberColumn(min_value=0., max_value=1., step=.1)})
        if st.form_submit_button("Appliquer les réglages"):
            candidate = deepcopy(model)
            candidate["environments"] = {row["nœud"]: row["eᵢ"] for row in env.to_dict("records")}
            candidate["epsilon"] = matrix.to_dict(orient="index")
            candidate["initial_controls"] = {row["partage"]: row["s"] for row in shares.to_dict("records")}
            try:
                c.validate_model(candidate)
            except (ValueError, TypeError) as error:
                st.error(f"Réglages non appliqués : {error}")
            else:
                for component, field in (("matrix", "epsilon"), ("environment", "environments")):
                    if candidate[field] != model[field]:
                        st.session_state[SETTINGS_KEY][component] = "custom"
                        candidate.setdefault("parameter_provenance", {})[field] = {"kind": "manual"}
                st.session_state[MODEL_KEY] = candidate
                st.rerun()


def _formulas():
    st.subheader("Variables et lois effectivement calculées")
    st.write("qᵢⱼ est le transfert du nœud i vers j ; αᵢⱼ sa fraction de la sortie Yᵢ. "
             "Xᵢ est la somme des entrées (Exp. IN), eᵢ l’environnement, Cᵢ le coefficient résultant "
             "et Yᵢ la sortie après THᵢ (Exp. OUT). εᵢⱼ décrit l’influence du fournisseur j sur le destinataire i.")
    st.latex(r"Y_1=1,\quad q_{ij}=\alpha_{ij}Y_i,\quad \sum_{j:i\to j}\alpha_{ij}=1,\quad 0\leq\alpha_{ij}\leq1")
    st.latex(r"X_i=\sum_{j:j\to i}q_{ji},\qquad C_i=e_i+\sum_{j:j\to i}\varepsilon_{ij}q_{ji},\qquad"
             r"Y_i=T_i=\begin{cases}X_iC_i&\text{signé}\\\max(0,X_iC_i)&\text{rectifié}\end{cases}")
    st.caption("Les lois nodales et les bilans reprennent l’étude PDF. Selon votre précision ultérieure, l’objectif est Y₈ après TH₈, "
               "et non la somme des valeurs absolues reçues. Cette version Python étend eᵢ à [−1,1] pour permettre les mêmes types de tirages que ε. "
               "Les flux sont calculés ; aucun plafond de rendement n’est ajouté. En signé, les contributions négatives se somment avec leur signe.")


def _search(model, domain, config, json_text):
    st.subheader("Rechercher le maximum sous contraintes")
    cols = st.columns([3, 4, 2])
    group = cols[0].selectbox("Variables étudiées", list(GROUP_LABELS), format_func=GROUP_LABELS.get,
                              key="c04-group", on_change=_remember, args=("group",))
    methods = ["compare", "local", "evolution", "grid"] + (["interval"] if group == "shares" else [])
    method = cols[1].selectbox("Type de recherche", methods, format_func=METHOD_LABELS.get, key="c04-method-"+group)
    budget = cols[2].number_input("Budget par méthode", min_value=100, max_value=100000, value=1000, step=100, key="c04-budget")
    bounds_text = "[0,1]" if group == "shares" else "[−1,1]"
    st.caption(f"Seul le groupe choisi varie dans {bounds_text}. Les autres paramètres restent fixés aux réglages ci-dessus. "
               "Pour ε, seules les 12 concordances associées aux arcs sont optimisées ; les 44 autres restent inchangées.")
    divisions = 5
    if method == "grid":
        divisions = st.selectbox("Divisions par variable", [2, 5, 10], key="c04-grid")
        n = len(opt.variables(model, group)["names"])
        st.info(f"Grille complète : {(divisions+1)**n:,} configurations. Le budget peut arrêter l’énumération ; "
                "même complète, une grille finie ne certifie pas le maximum continu.")
    if method == "interval":
        st.caption("Le budget limite ici le nombre de boîtes subdivisées. La borne supérieure et l’écart restant encadrent le maximum continu.")
    st.caption("SLSQP recherche un optimum local ; l’évolution différentielle explore plus largement. "
               "Leur accord ne suffit pas à prouver un maximum global. Chaque recherche repart des mêmes réglages.")
    signature = json_text({"model": model, "domain": domain, "group": group})
    if st.button("Lancer la recherche", type="primary", key="c04-search"):
        results = []
        with st.spinner("Calcul des états compatibles et comparaison des résultats…"):
            for chosen in (["local", "evolution"] if method == "compare" else [method]):
                results.append(opt.search(model, group, method=chosen, domain=domain,
                                          seed=config["matrix-seed"], max_evaluations=int(budget),
                                          max_nodes=int(budget), iterations=80, divisions=divisions))
        st.session_state["c04-results"] = {"signature": signature, "results": results}
    saved = st.session_state.get("c04-results", {})
    results = saved.get("results", []) if saved.get("signature") == signature else []
    if not results:
        st.info("La configuration de départ est affichée ci-dessous. Lancez une recherche pour afficher automatiquement "
                "la meilleure configuration trouvée dans le tableau, le graphe et les nappes.")
        return model, c.evaluate(model, domain=domain), group, [], False
    rows = []
    for result in results:
        rows.append({"Méthode": METHOD_LABELS[result["method"]], "Y₈ trouvé": result["best_state"]["objective"],
                     "Évaluations": result["evaluations"], "Statut": STATUS_LABELS.get(result["status"], result["status"]),
                     "Borne supérieure": result.get("upper_bound"), "Écart": result.get("gap")})
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    best = max(results, key=lambda item: item["best_state"]["objective"])
    for result in results:
        if result.get("upper_bound") is not None:
            st.write(f"Encadrement global : **{result['best_state']['objective']:.12g} ≤ max Y₈ ≤ {result['upper_bound']:.12g}** ; "
                     f"écart restant : {result['gap']:.6g}.")
            st.caption("Le certificat est numérique, à la tolérance de recherche ; si le budget est épuisé, l’écart affiché reste ouvert.")
    st.success("Le tableau, le graphe et les nappes utilisent maintenant la meilleure configuration trouvée. "
               "Les réglages de départ restent disponibles en haut pour comparer les méthodes sur le même problème.")
    return best["best_model"], best["best_state"], group, results, True


def _differentials(model, state, group, domain):
    st.subheader("Lagrangien et différentielles premières")
    st.latex(r"\mathcal L=Y_8+\sum_{i=2}^{8}\lambda_i\left(X_i-\sum_{j:j\to i}q_{ji}\right)"
             r"+\sum_{i=2}^{8}\mu_i(Y_i-T_i)+\sum_{i=1}^{7}\eta_i\left(\sum_{k:i\to k}q_{ik}-Y_i\right)")
    st.write("Les 21 égalités imposent les sommes d’entrées, les sept lois TH et les sept répartitions complètes. "
             "Les fractions α respectent leurs bornes. Sur ces états compatibles, ℒ = Y₈ : le maximum recherché est "
             "celui de cette restriction. Le lagrangien libre à 26 coordonnées q/X/Y peut présenter une selle.")
    explanation = c.explain_lagrangian(model, state)
    reference = explanation["at_reference"]
    st.write(f"À la configuration affichée : **ℒ = Y₈ = {reference['lagrangian']:.12g}** ; "
             f"résidu maximal des égalités = {reference['residual']:.3g}.")
    st.latex(r"T_i=\rho(X_iC_i),\quad\phi_i=\rho'(X_iC_i),\quad p_8=1,\quad v_{ji}=p_i\phi_i(C_i+X_i\varepsilon_{ij}),"
             r"\quad p_j=\sum_{i:j\to i}\alpha_{ji}v_{ji}")
    st.caption("pᵢ mesure l’effet d’une variation de Yᵢ sur Y₈ ; vⱼᵢ celui d’un transfert qⱼᵢ. "
               "φ=1 en signé ; en rectifié, φ=1 pour XC>0 et 0 pour XC<0. Au seuil XC=0, une dérivée classique n’est pas affirmée.")
    st.latex(r"\frac{d\mathcal L_{\mathrm{comp}}}{ds_j}=Y_j(v_{ja}-v_{jb}),\qquad"
             r"\frac{d\mathcal L_{\mathrm{comp}}}{de_i}=p_i\phi_iX_i,\qquad"
             r"\frac{d\mathcal L_{\mathrm{comp}}}{d\varepsilon_{ij}}=p_i\phi_iX_iq_{ji}")
    st.latex(r"d\mathcal L_{\mathrm{comp}}=\sum_jY_j(v_{ja}-v_{jb})\,ds_j"
             r"+\sum_{i=2}^8p_i\phi_iX_i\,de_i+\sum_{j\to i}p_i\phi_iX_iq_{ji}\,d\varepsilon_{ij}")
    st.caption("Pour une bifurcation j→a,b : αⱼₐ=sⱼ et αⱼᵦ=1−sⱼ. "
               "Ces différentielles incluent les effets sur tout le réseau aval ; elles servent aussi aux dérivées des nappes compatibles.")
    spec = opt.variables(model, group)
    derivative = opt.gradient(model, group, domain=domain)
    if derivative["differentiable"]:
        gradient = derivative["gradient"]
        labels = spec["labels"]
        st.dataframe(pd.DataFrame({"Variable": labels, "Valeur retenue": spec["values"],
                                   "dℒ compatible / dvariable": gradient}), hide_index=True, width="stretch")
        st.write(f"Résidu des conditions de premier ordre avec bornes : **{derivative['projected_gradient_norm']:.6g}**.")
        st.caption("À un maximum intérieur différentiable, les dérivées doivent s’annuler. À la borne inférieure, elles doivent être ≤0 ; "
                   "à la borne supérieure, ≥0. Ces conditions nécessaires ne prouvent pas seules un maximum global.")
    else:
        st.warning("La configuration est sur un seuil de rectification : les valeurs adjointes sélectionnées ne sont pas présentées comme des dérivées classiques.")
    with st.expander("Calcul détaillé des multiplicateurs et des dérivées libres"):
        st.latex(r"\mu_i=-p_i,\quad\lambda_i=-p_i\phi_iC_i,\quad\eta_j=-p_j")
        st.latex(r"\partial_{X_i}\mathcal L=\lambda_i-\mu_i\phi_iC_i,\quad"
                 r"\partial_{q_{ji}}\mathcal L=\eta_j-\lambda_i-\mu_i\phi_iX_i\varepsilon_{ij}")
        st.latex(r"\partial_{Y_i}\mathcal L=\mu_i-\eta_i\ (i<8),\qquad\partial_{Y_8}\mathcal L=1+\mu_8")
        st.dataframe(pd.DataFrame({"Nœud": range(2, 9), "pᵢ": [explanation["potentials"][str(i)] for i in range(2, 9)],
                                   "λᵢ": explanation["lambda"], "μᵢ": explanation["mu"]}), hide_index=True)
        st.json({"eta_noeuds_1_a_7": explanation["eta"], "stationnarite_groupe": derivative,
                 "contraintes": reference["constraints"]}, expanded=False)
    return derivative, explanation


def flow_table(model, state):
    """Bilans détaillés dans l'ordre des identifiants, sans arrondi de calcul."""
    rows = []
    for node in sorted(state["nodes"], key=lambda n: int(n["id"])):
        n = node["id"]
        incoming = [f for f in state["flows"] if f["to"] == n]
        outgoing = [f for f in state["flows"] if f["from"] == n]
        rows.append({"Nœud": n,
                     "Amont · contributions reçues qⱼᵢ": " ; ".join(f"{f['from']}→{n} : {f['value']:.8g}" for f in incoming) or "Source imposée",
                     "In · somme Xᵢ": node["input"] if n != "1" else None,
                     "eᵢ": model["environments"].get(n), "Cᵢ": node["coefficient"] if n != "1" else None,
                     "Out · total Yᵢ": node["output"],
                     "Aval · distribution αᵢⱼ × Yᵢ = qᵢⱼ": " ; ".join(
                         f"{n}→{f['to']} : {f['fraction']:.6g} × {node['output']:.8g} = {f['value']:.8g}" for f in outgoing) or "Résultat final Y₈"})
    return rows


def _surfaces(model, state, group, domain, derivative, figure):
    st.subheader("Nappes compatibles au voisinage de la configuration retenue")
    spec = opt.variables(model, group)
    names, labels, values, bounds = (spec[k] for k in ("names", "labels", "values", "bounds"))
    cols = st.columns(4)
    ix = cols[0].selectbox("Variable x", list(range(len(names))), format_func=lambda i: labels[i], key="c04-x-"+group)
    iy = cols[1].selectbox("Variable y", [i for i in range(len(names)) if i != ix], format_func=lambda i: labels[i], key="c04-y-"+group)
    radius = cols[2].select_slider("Rayon du voisinage", [.02, .05, .1, .2, .5, 1.], value=.2, key="c04-radius")
    points = cols[3].selectbox("Points par axe", [15, 25, 41], index=1, key="c04-points")
    def objective(x, y):
        changed = list(values)
        changed[ix], changed[iy] = x, y
        result = c.evaluate(opt.apply_values(model, group, changed), domain=domain, detailed=False)
        return result["objective"] if result["feasible"] else None
    x0, y0 = values[ix], values[iy]
    x, y, z = echantillonner_surface(objective, x0, y0, radius=radius, points=points, bounds=[bounds[ix], bounds[iy]])
    figure(nappe(x, y, z, xlabel=labels[ix], ylabel=labels[iy], zlabel="ℒ compatible = Y₈",
                  reference=(x0, y0, objective(x0, y0))), "c04-compatible")
    st.write(f"Centre : **x₀ = {x0:.12g}, y₀ = {y0:.12g}**, ℒ compatible = {state['objective']:.12g}.")
    st.caption("Les autres variables restent fixées à la configuration retenue. Les lois et tous les flux sont recalculés en chaque point. "
               "Le voisinage est tronqué aux bornes admissibles : un optimum de bord, un plateau ou une selle restent visibles.")
    if derivative["differentiable"]:
        grad = derivative["gradient"]
        st.write(f"Au centre : **∂ℒ compatible/∂x = {grad[ix]:.10g}** ; **∂ℒ compatible/∂y = {grad[iy]:.10g}**.")
    else:
        st.caption("Au centre, la présence d’un seuil interdit d’affirmer l’annulation de dérivées classiques.")
    cols = st.columns(2)
    with cols[0]:
        figure(courbes(x, {f"{labels[iy]} = {y0:.5g}": [objective(float(v), y0) for v in x]},
                        xlabel=labels[ix], ylabel="ℒ compatible = Y₈"), "c04-profil-x")
    with cols[1]:
        figure(courbes(y, {f"{labels[ix]} = {x0:.5g}": [objective(x0, float(v)) for v in y]},
                        xlabel=labels[iy], ylabel="ℒ compatible = Y₈"), "c04-profil-y")
    rows = [{names[ix]: float(vx), names[iy]: float(vy), "Y8": float(z[j, i])}
            for j, vy in enumerate(y) for i, vx in enumerate(x)]
    st.download_button("Échantillons de la nappe CSV", pd.DataFrame(rows).to_csv(index=False).encode("utf-8-sig"),
                       file_name="concordances-nappe.csv", mime="text/csv", key="c04-nappe-csv")


def _free_surface(model, explanation, domain, figure):
    with st.expander("Complément · nappe libre du lagrangien, hors contraintes"):
        st.caption("Deux coordonnées q/X/Y varient seules, sans réappliquer les bilans. Les multiplicateurs sont fixés à la référence. "
                   "Cette surface ne mesure donc pas la production du réseau et n’est pas la surface maximisée par la recherche.")
        names = ["q"+e["id"] for e in c.GRAPH["edges"]]+[f"X{i}" for i in range(2, 9)]+[f"Y{i}" for i in range(2, 9)]
        cols = st.columns(3)
        ix = cols[0].selectbox("Coordonnée libre x", list(range(26)), format_func=lambda i: names[i], key="c04-lx")
        iy = cols[1].selectbox("Coordonnée libre y", [i for i in range(26) if i != ix], format_func=lambda i: names[i], key="c04-ly")
        radius = cols[2].number_input("Rayon libre", min_value=.001, max_value=5., value=.1, step=.05, key="c04-lr")
        point = explanation["reference_point"]
        def value(x, y):
            changed = list(point)
            changed[ix], changed[iy] = x, y
            return c.evaluate_lagrangian(model, changed, multipliers=explanation["multipliers"], domain=domain)["lagrangian"]
        x, y, z = echantillonner_surface(value, point[ix], point[iy], radius=radius, points=15)
        figure(nappe(x, y, z, xlabel=names[ix], ylabel=names[iy], zlabel="ℒ libre",
                     reference=(point[ix], point[iy], value(point[ix], point[iy]))), "c04-libre")
        reference = explanation["at_reference"]
        if reference["differentiable"]:
            st.write(f"Au centre : ∂ℒ/∂x = {reference['gradient'][ix]:.10g} ; ∂ℒ/∂y = {reference['gradient'][iy]:.10g}.")


def concordance_page(figure, json_text, download_result):
    st.header("04 · Environnement, concordances et production")
    config = _setup()
    cols = st.columns([4, 3, 4])
    cols[0].selectbox("Type de matrice ε", list(MATRIX_TYPES), format_func=lambda k: MATRIX_TYPES[k]["title"],
                       key="c04-matrix", on_change=_choose, args=("matrix",))
    with cols[1]:
        st.write("")
        with st.popover("Régler les environnements, matrice, etc.", width="stretch"):
            _controls_form(deepcopy(st.session_state[MODEL_KEY]))
    cols[2].selectbox("Type d’environnements eᵢ", list(ENVIRONMENT_TYPES),
                       format_func=lambda k: ENVIRONMENT_TYPES[k]["title"], key="c04-environment",
                       on_change=_choose, args=("environment",))
    model = deepcopy(st.session_state[MODEL_KEY])
    st.caption(MATRIX_TYPES[config["matrix"]]["description"]+" "+ENVIRONMENT_TYPES[config["environment"]]["description"])
    st.caption(f"Graines réglables dans le panneau : matrice {config['matrix-seed']} ; environnements {config['environment-seed']}.")
    domain = st.radio("Traitement des sorties", ["signed", "rectified"],
                      format_func=lambda v: "Signé · conserver les valeurs négatives" if v == "signed" else "Rectifié · mettre les valeurs négatives à zéro",
                      horizontal=True, key="c04-domain", on_change=_remember, args=("domain",))
    _formulas()
    figure(matrice_concordances(model, c.GRAPH["edges"]), "c04-matrix-current")
    st.caption("● : concordance active sur un arc. Les 44 autres coefficients hors diagonale sont conservés mais n’agissent pas sur ce graphe. "
               "Cette matrice décrit les réglages de départ ; si la recherche porte sur ε, sa matrice retenue apparaît avec le résultat.")
    chosen, state, group, results, searched = _search(model, domain, config, json_text)
    cols = st.columns(3)
    cols[0].metric("Y₈ · meilleure valeur trouvée" if searched else "Y₈ · configuration de départ", f"{state['objective']:.12g}")
    cols[1].metric("X₈ · somme algébrique reçue", f"{state['objectives']['algebraic_arrivals']:.10g}")
    cols[2].metric("Somme des valeurs absolues reçues", f"{state['objectives']['arrivals']:.10g}")
    if searched and group == "epsilon":
        figure(matrice_concordances(chosen, c.GRAPH["edges"]), "c04-matrix-best")
    derivative, explanation = _differentials(chosen, state, group, domain)
    st.subheader("Tableau des flux · configuration retenue")
    rows = flow_table(chosen, state)
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    st.caption("Les liens amont expriment les dépendances de calcul. La source impose Y₁=1 et n’a pas de TH₁. "
               "Chaque sortie intermédiaire est entièrement répartie ; les arrondis affichés ne sont pas réinjectés dans les calculs.")
    st.subheader("Graphe des distributions retenues")
    figure(graphe_concordances(state), "c04-network")
    st.caption("Sur chaque arc : α = fraction distribuée ; q = transfert calculé. Sur chaque nœud : Y = sortie après TH. "
               "Le survol donne davantage de décimales. Les fractions complémentaires conservent le signe de Y en mode signé.")
    _surfaces(chosen, state, group, domain, derivative, figure)
    _free_surface(chosen, explanation, domain, figure)
    download_result({"initial_model": model, "model": chosen, "domain": domain, "group": group,
                     "state": state, "searches": results, "differentials": derivative,
                     "lagrangian": explanation}, "concordances-etude")
