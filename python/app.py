"""Atelier local : lancer avec python -m streamlit run app.py."""
from copy import deepcopy
import json
import math
import secrets

import numpy as np
import pandas as pd
import streamlit as st

from physique_graphes import concordances as c, dag, lois, production as p, reseaux as r
from physique_graphes.optimisation import optimiser
from physique_graphes.exemples_concordances import EXAMPLES, create_example, randomize_matrix
from physique_graphes.visualisation import graphe, courbes, echantillonner_surface, nappe, matrice_concordances
from examples.lois_personnelles import PERSONAL_LAWS

st.set_page_config(page_title="Graphes · Atelier Python", page_icon="🔬", layout="wide")


def json_text(value):
    def finite(item):
        if isinstance(item, dict):
            return {str(k): finite(v) for k, v in item.items()}
        if isinstance(item, (list, tuple)):
            return [finite(v) for v in item]
        if isinstance(item, (float, np.floating)) and not math.isfinite(item):
            return None
        return item
    return json.dumps(finite(value), ensure_ascii=False, indent=2, allow_nan=False)


def download_result(result, key):
    st.download_button("Enregistrer les résultats JSON", json_text(result),
                       file_name=f"{key}-resultats.json", mime="application/json", key=key+"export")


def figure(fig, key):
    st.plotly_chart(fig, width="stretch", key=key)
    with st.expander("Exporter cette figure"):
        st.download_button("Figure HTML interactive autonome", fig.to_html(include_plotlyjs=True),
                           file_name=key+".html", mime="text/html", key=key+"html")


def model_editor(key, factory, validate):
    if key not in st.session_state:
        st.session_state[key] = factory()
    model = deepcopy(st.session_state[key])
    with st.expander("Modèle complet · attributs, topologie, lois · importer / exporter"):
        st.caption("Les attributs libres sont conservés. Les lois sont désignées par leur nom dans le registre Python. "
                   "Le JSON ne contient pas de code exécutable. Les changements sont appliqués à cette session ; téléchargez le modèle pour le conserver.")
        with st.form(key+"jsonform"):
            source = st.text_area("Modèle JSON", json_text(model), height=340, key=key+"json"+json_text(model))
            uploaded = st.file_uploader("Ou importer un modèle JSON", type="json", key=key+"upload")
            if st.form_submit_button("Appliquer le modèle"):
                try:
                    candidate = json.loads(uploaded.getvalue().decode("utf-8-sig") if uploaded else source)
                    if not isinstance(candidate, dict):
                        raise ValueError("Le document JSON doit être un objet décrivant un modèle.")
                    imported_domain = candidate.get("domain")
                    if isinstance(candidate.get("options"), dict):
                        imported_domain = imported_domain or candidate["options"].get("domain")
                    # Les exports de l'atelier web de concordances enveloppent parfois le modèle.
                    if "model" in candidate and isinstance(candidate["model"], dict):
                        candidate = candidate["model"]
                    if "initialControls" in candidate:
                        candidate["initial_controls"] = candidate.pop("initialControls")
                    validate(candidate)
                    st.session_state[key] = candidate
                    if key.startswith("concordances-") and imported_domain in ("signed", "rectified"):
                        st.session_state["concordance-domain"] = imported_domain
                    st.rerun()
                except (ValueError, KeyError, TypeError, UnicodeError) as error:
                    st.error(f"Modèle non appliqué : {error}")
        st.download_button("Enregistrer le modèle JSON", json_text(model), file_name=key+".json",
                           mime="application/json", key=key+"download")
    return model


def compatible_surface(controls, evaluate, key, zlabel="Production"):
    if len(controls) < 2:
        st.info("Il faut au moins deux partages binaires pour cette coupe.")
        return
    st.subheader("Nappe compatible autour de la configuration courante")
    st.caption("Deux partages indépendants varient ; les autres restent fixes. Tous les bilans et toutes les lois sont recalculés. "
               "Le point rouge est réévalué, sans supposer qu’il est optimal. Une frontière ou un plateau restent visibles.")
    cols = st.columns(4)
    names = list(controls)
    xname = cols[0].selectbox("Axe x · partage", names, key=key+"x")
    others = [name for name in names if name != xname]
    yname = cols[1].selectbox("Axe y · partage", others, key=key+"y")
    radius = cols[2].select_slider("Rayon du voisinage", [.02, .05, .1, .2, .5, 1.], value=.2, key=key+"radius")
    points = cols[3].selectbox("Points par axe", [15, 25, 41], index=1, key=key+"points")
    x0, y0 = controls[xname], controls[yname]
    def objective(x, y):
        return evaluate({**controls, xname: x, yname: y})
    x, y, z = echantillonner_surface(objective, x0, y0, radius=radius, points=points, bounds=[(0, 1)]*2)
    figure(nappe(x, y, z, xlabel=xname, ylabel=yname, zlabel=zlabel,
                  reference=(x0, y0, objective(x0, y0))), key+"nappe")
    st.caption(f"{np.isfinite(z).sum()} / {z.size} points compatibles. Les trous signalent les entrées hors domaine ; aucun écrêtage ajouté.")
    # Les profils passent exactement par la référence, même si la grille est tronquée au bord.
    figure(courbes(x, {f"{yname} = {y0:.6g}": [objective(float(v), y0) for v in x]},
                    xlabel=xname, ylabel=zlabel), key+"profil")
    rows = [{xname: float(vx), yname: float(vy), zlabel: float(z[j, i]) if np.isfinite(z[j, i]) else None}
            for j, vy in enumerate(y) for i, vx in enumerate(x)]
    st.download_button("Échantillons de la nappe CSV", pd.DataFrame(rows).to_csv(index=False).encode("utf-8-sig"),
                       file_name=key+"-nappe.csv", mime="text/csv", key=key+"csv")


def cities_page():
    st.header("01 · Villes et parcours")
    st.write("Exp. IN : position de départ → TH : distance euclidienne → Exp. OUT : position d’arrivée. Les distances et positions sont fictives.")
    model = model_editor("villes", r.villes_exemple, r.ponderer_villes)
    with st.form("villes-coordinates"):
        nodes = st.data_editor(pd.DataFrame(model["nodes"]), num_rows="dynamic", width="stretch", key="citiesnodes")
        st.caption("Ajout/suppression de villes : adapter aussi les liaisons dans le JSON complet.")
        if st.form_submit_button("Appliquer les coordonnées"):
            try:
                candidate = {**model, "nodes": nodes.to_dict("records")}
                r.ponderer_villes(candidate)
                st.session_state.villes = candidate
                st.rerun()
            except (ValueError, TypeError) as error:
                st.error(str(error))
    weighted = r.ponderer_villes(model)
    figure(graphe(model, directed=False, title="Positions et liaisons"), "villes-graphe")
    ids = [n["id"] for n in model["nodes"]]
    cols = st.columns(3)
    start = cols[0].selectbox("Départ", ids)
    end = cols[1].selectbox("Arrivée", ids, index=len(ids)-1)
    method = cols[2].selectbox("Algorithme", ["Dijkstra", "Bellman–Ford", "Floyd–Warshall"])
    methods = {"Dijkstra": r.dijkstra, "Bellman–Ford": r.bellman_ford, "Floyd–Warshall": r.floyd_warshall}
    result = methods[method](weighted, start, end)
    st.json(result, expanded=True)
    bound = st.number_input("Distance strictement maximale des chemins simples", min_value=.1, value=18., step=.5)
    if st.button("Énumérer les parcours entre ces deux villes (au plus 5 000)"):
        paths = r.parcours_bornes(weighted, bound, depart=start, arrivee=end, max_results=5000, max_expansions=100000)
        st.write(f"{len(paths['paths'])} parcours · exploration complète : {paths['complete']}")
        if paths.get("warning"):
            st.warning(paths["warning"])
        st.dataframe(paths["paths"], width="stretch")
        download_result(paths, "parcours")


def dependencies_page():
    st.header("02 · Dépendance à un débit externe")
    st.write("Le débit d’une branche modifie le coût temporel d’un parcours. Le débit reste un paramètre externe fixé ; il ne résulte pas d’une résolution de réseau couplé.")
    load = st.slider("Débit externe (véhicules par minute)", 0., 100., 40., 1.)
    result = r.sensibilite_dependance(load)
    st.json(result)
    loads = list(range(101))
    rows = [r.routes_dependantes(q) for q in loads]
    figure(courbes(loads, {"Meilleure durée": [row["bestDuration"] for row in rows]},
                    xlabel="Débit externe (véhicules/min)", ylabel="Durée (min)"), "dependances-courbe")
    st.info("Pour modifier ces lois et les deux parcours, ouvrir physique_graphes/reseaux.py, fonctions routes_dependantes et sensibilite_dependance.")
    download_result(result, "dependances")


def cycles_page():
    choices = {"Progression équilibrée": "balanced", "Blocage sous seuil": "threshold", "Oscillation": "oscillating"}
    label = st.selectbox("Scénario cyclique", list(choices))
    preset = choices[label]
    key = "cycles-"+preset
    model = model_editor(key, lambda: p.production_exemple(preset), lambda m: p.simuler_production(m, 1))
    with st.form(key+"params"):
        machines = st.data_editor(pd.DataFrame(model["machines"]), disabled=["id"], width="stretch")
        allocations = st.data_editor(pd.DataFrame(model["allocations"]), num_rows="dynamic", width="stretch")
        if st.form_submit_button("Appliquer les machines et répartitions"):
            try:
                candidate = {**model, "machines": machines.to_dict("records"), "allocations": allocations.to_dict("records")}
                p.simuler_production(candidate, 1)
                st.session_state[key] = candidate
                st.rerun()
            except (ValueError, TypeError) as error:
                st.error(str(error))
    cycles = st.slider("Nombre de cycles synchrones", 1, 300, 40)
    result = p.simuler_production(model, cycles)
    names = [m["id"] for m in model["machines"]]
    graph = {"nodes": model["machines"], "edges": model["allocations"]}
    figure(graphe(graph, dict(zip(names, result["finalOutputs"])), title="Productions au dernier cycle"), "cycles-graphe")
    figure(courbes(list(range(cycles+1)), {name: [row["outputs"][i] for row in result["history"]]
                                          for i, name in enumerate(names)}, xlabel="Cycle", ylabel="Production normalisée"), "cycles-courbes")
    st.write(f"Résidu final : {result['residual']:.6g} · alternance de période 2 observée : {result['period2Observed']}")
    st.caption("Un faible résidu ne prouve ni stabilité ni optimalité. Les excédents d’alimentation sont comptés, sans stock implicite.")
    st.dataframe(result["history"], width="stretch")
    download_result({"model": model, "simulation": result}, "cycles")


def dag_page():
    presets = {"12 branches · maximum de référence 7/32": dag.create_branch_interior,
               "12 branches actives · référence 143217/320000": dag.create_branch_active,
               "8 machines aux nœuds · départ actif": lambda: dag.create_machine_eight("active"),
               "8 machines aux nœuds · plateau nul": lambda: dag.create_machine_eight("plateau")}
    label = st.selectbox("Modèle de DAG", list(presets))
    key = "dag-"+str(list(presets).index(label))
    model = model_editor(key, presets[label], lambda m: dag.evaluate(m, registry=PERSONAL_LAWS))
    st.info("Lois sur les branches : sortie = x × f(x). Lois sur les nœuds : sortie = f(x). "
            "Les JSON permettent aussi de changer la topologie, les attributs et le nom de chaque loi.")
    controls = dag.binary_controls(model)
    support = model["edges"] if model["mode"] == "branches" else model["nodes"]
    editable = [item for item in support if item.get("law", {}).get("name") in ("piecewise_yield", "piecewise_response")]
    with st.form(key+"params"):
        source = st.number_input("Apport de la source", min_value=0., value=float(model["source"]["input"]), step=.01)
        shares = st.data_editor(pd.DataFrame([{"nœud": n, "part vers la première branche": v} for n, v in controls.items()]),
                                disabled=["nœud"], width="stretch")
        if editable:
            parameters = st.data_editor(pd.DataFrame([{"id": item["id"], **item["law"]["parameters"]} for item in editable]),
                                       disabled=["id"], width="stretch")
        if st.form_submit_button("Appliquer les lois et partages"):
            try:
                candidate = dag.with_binary_controls(model, {row["nœud"]: row["part vers la première branche"] for row in shares.to_dict("records")}, source_input=source)
                if editable:
                    by_id = {row["id"]: {k: row[k] for k in ("a", "b", "c", "d")} for row in parameters.to_dict("records")}
                    for item in (candidate["edges"] if candidate["mode"] == "branches" else candidate["nodes"]):
                        if item["id"] in by_id:
                            item["law"]["parameters"] = by_id[item["id"]]
                dag.evaluate(candidate, registry=PERSONAL_LAWS)
                st.session_state[key] = candidate
                st.rerun()
            except (ValueError, TypeError) as error:
                st.error(str(error))
    state = dag.evaluate(model, registry=PERSONAL_LAWS)
    if not state["feasible"]:
        st.warning(f"Configuration incompatible : {state['reason']}")
    else:
        cols = st.columns(3)
        cols[0].metric("Production finale", f"{state['production']:.10g}")
        cols[1].metric("Bilan input − output", f"{state['total_loss']:.7g}")
        cols[2].metric("Résidu du bilan global", f"{state['balance_residual']:.3g}")
        figure(graphe(model, {n: row["output"] for n, row in state["nodes"].items()}, state["y"], title="Sorties des nœuds et des branches"), key+"graphe")
        st.dataframe(pd.DataFrame(state["nodes"]).T, width="stretch")
        st.dataframe(pd.DataFrame(state["edges"]).T, width="stretch")
    if editable:
        name = st.selectbox("Loi à tracer", [item["id"] for item in editable], key=key+"law")
        law = next(item["law"] for item in editable if item["id"] == name)
        xs = np.linspace(0, 1, 201)
        figure(courbes(xs, {"f(x)": [lois.piecewise_response(float(x), law["parameters"]) for x in xs],
                            "x f(x)": [lois.piecewise_yield(float(x), law["parameters"]) for x in xs]}), key+"loi")
    st.subheader("Rechercher une meilleure répartition")
    st.caption("Les lois et l’apport restent fixes. SLSQP est local ; l’évolution différentielle explore le domaine mais ne fournit pas de borne supérieure certifiée. "
               "Une modification des lois ne conserve pas automatiquement les preuves des exemples du site.")
    method = st.selectbox("Méthode numérique", ["local", "exploration"], format_func=lambda v: "SLSQP · local" if v == "local" else "Évolution différentielle · exploration", key=key+"method")
    if st.button("Optimiser les partages", key=key+"optim"):
        with st.spinner("Recherche bornée à 60 générations / itérations…"):
            st.session_state[key+"result"] = (json_text(model), optimiser(model, method=method, registry=PERSONAL_LAWS))
    previous = st.session_state.get(key+"result")
    if previous and previous[0] == json_text(model):
        result = previous[1]
        st.json({k: v for k, v in result.items() if k != "best"})
        if result["best"]:
            st.write(f"Meilleure production calculée : {result['best']['production']:.10g}")
            if st.button("Utiliser cette configuration et centrer la nappe", key=key+"applybest"):
                st.session_state[key] = dag.with_binary_controls(model, result["controls"])
                st.rerun()
        download_result(result, key+"optim")
    def value(parts):
        result = dag.evaluate(dag.with_binary_controls(model, parts), registry=PERSONAL_LAWS)
        return result["production"] if result["feasible"] else None
    compatible_surface(controls, value, key)
    download_result({"model": model, "state": state}, key)


def concordance_page():
    st.header("04 · Environnement, concordances et production")
    key = "concordances-active"
    if key not in st.session_state:
        st.session_state[key] = create_example("reference")
    origin = st.session_state[key].get("provenance", {})
    while isinstance(origin, dict) and origin.get("kind") == "edited" and isinstance(origin.get("initial"), dict):
        origin = origin["initial"]
    if not isinstance(origin, dict):
        origin = {}
    matrix_origin = origin.get("matrix", origin)
    initial_seed = matrix_origin.get("seed", 34) if isinstance(matrix_origin, dict) else 34
    if type(initial_seed) is not int or not 0 <= initial_seed <= 2**32-1:
        initial_seed = 34
    if "concordance-seed" not in st.session_state:
        st.session_state["concordance-seed"] = initial_seed
    if "concordance-example" not in st.session_state:
        st.session_state["concordance-example"] = origin.get("example_id") if origin.get("example_id") in EXAMPLES else "random"
    if "concordance-domain" not in st.session_state:
        st.session_state["concordance-domain"] = st.session_state.get("concordance-last-domain", "signed")

    def load_example(example_id=None):
        selected = example_id or st.session_state["concordance-example"]
        if selected == "random":
            initial = c.create_scenario()
            initial["environments"] = {n: .5 for n in initial["environments"]}
            model = randomize_matrix(initial, st.session_state["concordance-seed"])
        else:
            model = create_example(selected)
        st.session_state[key] = model
        st.session_state["concordance-example"] = selected
        provenance = model.get("provenance", {})
        seed = provenance.get("seed", provenance.get("matrix", {}).get("seed"))
        if seed is not None:
            st.session_state["concordance-seed"] = seed

    def redraw_matrix(fresh=True):
        seed = st.session_state["concordance-seed"]
        current = st.session_state[key]
        if fresh:
            # La graine suivante est nouvelle ; le tirage de coefficients reste reproductible.
            previous = seed
            while True:
                seed = secrets.randbelow(2**32)
                if seed != previous and randomize_matrix(current, seed)["epsilon"] != current["epsilon"]:
                    break
        st.session_state[key] = randomize_matrix(current, seed)
        st.session_state["concordance-seed"] = seed
        st.session_state["concordance-example"] = "random"

    cols = st.columns([2, 1, 1])
    cols[0].button("Nouvelle matrice aléatoire", type="primary", on_click=redraw_matrix,
                   key="concordance-randomize", width="stretch")
    cols[1].number_input("Graine à rejouer", min_value=0, max_value=2**32-1, step=1, key="concordance-seed")
    cols[2].button("Rejouer cette graine", on_click=redraw_matrix, args=(False,), key="concordance-replay", width="stretch")
    st.caption("Un clic renouvelle les 56 coefficients hors diagonale dans [−1,1]. "
               "Les environnements, les cinq partages et le mode signé/rectifié sont conservés. La diagonale reste nulle.")
    example_ids = ["reference", "negative", "random"]+[name for name in EXAMPLES if name not in ("reference", "negative")]
    titles = {name: item["title"] for name, item in EXAMPLES.items()}
    titles["random"] = "Matrice aléatoire reproductible · e=0,5 au chargement"
    st.selectbox("Exemple de départ", example_ids, format_func=titles.__getitem__,
                 key="concordance-example", on_change=load_example)
    st.caption("Choisir un exemple charge sa matrice, ses environnements et ses partages initiaux. Le mode d’étude reste inchangé.")
    buttons = st.columns(4)
    for column, label, example_id in zip(buttons[:3], ["Neutre · ε=0", "Amplification · ε=+1", "Inhibition · ε=−1"], ["neutral", "positive", "inhibitory"]):
        column.button(label, on_click=load_example, args=(example_id,), width="stretch", key="example-"+example_id)
    buttons[3].button("Recharger cet exemple", on_click=load_example, width="stretch", key="concordance-restore")
    model = model_editor(key, lambda: create_example("reference"), c.validate_model)
    model["initial_controls"] = c.validate_model(model)["initial_controls"]
    provenance = model.get("provenance", {})
    original = provenance
    while isinstance(original, dict) and original.get("kind") == "edited" and isinstance(original.get("initial"), dict):
        original = original["initial"]
    example_id = original.get("example_id") if isinstance(original, dict) else None
    if example_id in EXAMPLES:
        if c.validate_model(model) == c.validate_model(create_example(example_id)):
            st.info(EXAMPLES[example_id]["description"])
        else:
            st.caption("Modèle modifié à partir de « "+EXAMPLES[example_id]["title"]+" ». Les valeurs de référence décrivent le préréglage d’origine.")
    matrix_origin = original.get("matrix", original) if isinstance(original, dict) else {}
    if isinstance(matrix_origin, dict) and type(matrix_origin.get("seed")) is int and 0 <= matrix_origin["seed"] <= 2**32-1:
        seed = matrix_origin["seed"]
        unchanged = c.randomize(model, seed)["epsilon"] == model["epsilon"]
        st.caption(f"Graine {'de la matrice' if unchanged else 'd’origine (coefficients modifiés)'} : {seed} · LCG32. "
                   "La graine et la matrice effective sont conservées dans l’export JSON.")
    domain = st.radio("Traitement des sorties", ["signed", "rectified"], format_func=lambda v: "Signé · conserver les valeurs négatives" if v == "signed" else "Rectifié · ramener les sorties négatives à zéro", horizontal=True, key="concordance-domain")
    st.session_state["concordance-last-domain"] = domain
    figure(matrice_concordances(model, c.GRAPH["edges"]), key+"matrice")
    st.caption("● : coefficient actif sur l’un des douze arcs. Les 44 autres coefficients hors diagonale n’agissent pas ; ils ne créent pas de liaison.")
    st.latex(r"X_i=\sum_jq_{ji},\quad C_i=e_i+\sum_j\varepsilon_{ij}q_{ji},\quad Y_i=T_i(X_i,C_i),\quad \max Y_8")
    with st.expander("Régler les environnements, la matrice et les cinq partages"):
        with st.form(key+"params"):
            env = st.data_editor(pd.DataFrame([{"nœud": n, "e": v} for n, v in model["environments"].items()]), disabled=["nœud"], width="stretch")
            matrix = pd.DataFrame([[model["epsilon"].get(str(i), {}).get(str(j), 0.) for j in range(1, 9)] for i in range(1, 9)],
                                  index=[str(i) for i in range(1, 9)], columns=[str(j) for j in range(1, 9)])
            st.caption("ε : lignes = destinataires, colonnes = fournisseurs. Diagonale nulle ; 12 coefficients actifs, 44 hors arcs conservés mais sans effet.")
            epsilon = st.data_editor(matrix, width="stretch")
            shares = st.data_editor(pd.DataFrame([{"partage": n, "valeur": v} for n, v in model["initial_controls"].items()]), disabled=["partage"], width="stretch")
            if st.form_submit_button("Appliquer les coefficients et les partages"):
                try:
                    candidate = {**model, "environments": {row["nœud"]: row["e"] for row in env.to_dict("records")},
                                 "epsilon": epsilon.to_dict("index"), "initial_controls": {row["partage"]: row["valeur"] for row in shares.to_dict("records")}}
                    c.validate_model(candidate)
                    candidate["provenance"] = {"kind": "edited", "initial": model.get("provenance")}
                    st.session_state[key] = candidate
                    st.rerun()
                except (ValueError, TypeError) as error:
                    st.error(str(error))
    controls = model["initial_controls"]
    state = c.evaluate(model, domain=domain)
    cols = st.columns(3)
    for col, title, value in zip(cols, ["Y₈ après TH₈ · objectif", "X₈ · somme algébrique", "Σ |q vers 8|"],
                                 [state["objective"], state["objectives"]["algebraic_arrivals"], state["objectives"]["arrivals"]]):
        col.metric(title, f"{value:.10g}")
    figure(graphe(c.GRAPH, {n["id"]: n["output"] for n in state["nodes"]},
                  {e["id"]: e["value"] for e in state["flows"]}, title="Sorties signées" if domain == "signed" else "Sorties rectifiées"), key+"graphe")
    st.dataframe(state["nodes"], width="stretch")
    st.subheader("Comparaison des recherches")
    method = st.selectbox("Méthode", ["Locale", "Grille", "Intervalles globaux"])
    budget = st.number_input("Budget (évaluations locales / boîtes globales)", min_value=10, max_value=10000, value=1000, step=100)
    divisions = st.selectbox("Divisions par partage pour la grille", [2, 5, 10], index=1)
    st.caption(f"La grille visitera {(divisions+1)**5:,} configurations. Une grille finie ne prouve pas le maximum continu. "
               "Les intervalles rapportent séparément témoin, borne supérieure et écart restant.")
    resultkey = key+"-"+domain+"-search"
    if st.button("Lancer la recherche"):
        with st.spinner("Calcul en Python…"):
            result = c.search_local(model, domain=domain, max_evaluations=budget) if method == "Locale" else (
                c.search_grid(model, domain=domain, divisions=divisions) if method == "Grille" else c.search_global(model, domain=domain, max_nodes=budget))
            st.session_state[resultkey] = (json_text(model), result)
    previous = st.session_state.get(resultkey)
    if previous and previous[0] == json_text(model):
        result = previous[1]
        st.json({k: v for k, v in result.items() if k not in ("best", "history")})
        if result["best"]:
            st.write(f"Meilleur témoin Y₈ : {result['best']['objective']:.10g}")
            if st.button("Adopter les partages trouvés et centrer les nappes"):
                st.session_state[key] = {**model, "initial_controls": result["best"]["controls"]}
                st.rerun()
        download_result({"model": model, "domain": domain, "search": result}, resultkey)
    compatible_surface(controls, lambda parts: c.evaluate(model, parts, domain=domain, detailed=False)["objective"], key, "Y₈")
    st.subheader("Dérivées exactes par rapport aux cinq partages")
    derivative = state["derivatives"]
    if derivative["differentiable"]:
        st.dataframe(pd.DataFrame({"partage": c.GRAPH["controls"], "∂Y₈/∂s": derivative["gradient"]}), width="stretch")
        with st.expander("Hessienne des partages"):
            st.dataframe(pd.DataFrame(derivative["hessian"], index=c.GRAPH["controls"], columns=c.GRAPH["controls"]))
    else:
        st.warning("Un seuil empêche d’affirmer la différentiabilité à cette configuration.")
        st.json(derivative["kinks"])
    lagrangian_view(model, state, key, domain)
    download_result({"model": model, "domain": domain, "state": state}, key)


def lagrangian_view(model, state, key, domain):
    st.subheader("Lagrangien : 26 variables libres, 21 égalités")
    st.latex(r"\mathcal L=Y_8+\sum_{i=2}^{8}\lambda_i(X_i-\sum_jq_{ji})"
             r"+\sum_{i=2}^{8}\mu_i(Y_i-T_i)+\sum_{i=1}^{7}\eta_i(\sum_kq_{ik}-Y_i)")
    st.caption("Tᵢ = XᵢCᵢ en signé, max(0,XᵢCᵢ) en rectifié. Y₁ = 1. Les multiplicateurs adjoints sont calculés à la référence puis fixés pour la coupe. "
               "Hors contraintes, L n’est pas une production réalisable ; une selle n’est pas transformée en maximum.")
    explanation = c.explain_lagrangian(model, state)
    at_reference = explanation["at_reference"]
    st.write(f"L à la référence : {at_reference['lagrangian']:.10g} · résidu des égalités : {at_reference['residual']:.3g}")
    st.latex(r"\partial_{X_i}\mathcal L=\lambda_i-\mu_i\phi_i C_i,\qquad"
             r"\partial_{q_{ji}}\mathcal L=\eta_j-\lambda_i-\mu_i\phi_iX_i\varepsilon_{ij}")
    st.latex(r"\partial_{Y_i}\mathcal L=\mu_i-\eta_i\ (i<8),\quad"
             r"\partial_{Y_8}\mathcal L=1+\mu_8,\quad \phi_i=1\ \text{en signé}")
    st.caption("En rectifié, φᵢ=1 si XᵢCᵢ>0, 0 si XᵢCᵢ<0 ; au seuil, il s’agit d’une sélection de sous-gradient, pas d’une dérivée affirmée.")
    with st.expander("Multiplicateurs, contraintes et dérivées détaillées"):
        st.json(explanation)
    with st.expander("Nappe libre de L et ses deux dérivées partielles"):
        names = ["q"+e["id"] for e in c.GRAPH["edges"]]+[f"X{i}" for i in range(2, 9)]+[f"Y{i}" for i in range(2, 9)]
        cols = st.columns(3)
        xname = cols[0].selectbox("Variable libre x", names, key=key+"lx")
        others = [n for n in names if n != xname]
        yname = cols[1].selectbox("Variable libre y", others, index=others.index("X2") if "X2" in others else 0, key=key+"ly")
        radius = cols[2].number_input("Rayon libre", min_value=.001, max_value=5., value=.1, step=.05, key=key+"lr")
        ix, iy = names.index(xname), names.index(yname)
        point = explanation["reference_point"]
        def value(x, y):
            modified = list(point)
            modified[ix], modified[iy] = x, y
            return c.evaluate_lagrangian(model, modified, multipliers=explanation["multipliers"], domain=domain)["lagrangian"]
        x, y, z = echantillonner_surface(value, point[ix], point[iy], radius=radius, points=21)
        figure(nappe(x, y, z, xlabel=xname, ylabel=yname, zlabel="L libre",
                     reference=(point[ix], point[iy], value(point[ix], point[iy]))), key+"libre")
        if at_reference["differentiable"]:
            grad = at_reference["gradient"]
            st.write(f"À la référence x₀={point[ix]:.9g}, y₀={point[iy]:.9g} : ∂L/∂x={grad[ix]:.9g}, ∂L/∂y={grad[iy]:.9g}.")
        else:
            st.warning("Référence sur un seuil : dérivées classiques non affirmées.")


st.title("Graphes · Atelier Python")
st.caption("Modèles éditables • calculs locaux • graphes, courbes et nappes interactives")
family = st.sidebar.radio("Étude", ["01 · Villes", "02 · Dépendances", "03 · Production", "04 · Concordances"])
st.sidebar.markdown("[Guide et code Python](https://github.com/ar742/Symfony-Physique-objets/tree/master/python)\n\n[Site Symfony local](http://localhost:8080/graphes/)")
st.sidebar.caption("Les valeurs modifiées vivent dans la session. Exportez votre JSON pour conserver une étude. Les figures HTML fonctionnent hors ligne.")
try:
    if family.startswith("01"):
        cities_page()
    elif family.startswith("02"):
        dependencies_page()
    elif family.startswith("03"):
        st.header("03 · Machines, branches et production")
        study = st.radio("Modèle de production", ["DAG · branches ou machines", "Machines couplées · cycles"], horizontal=True)
        dag_page() if study.startswith("DAG") else cycles_page()
    else:
        concordance_page()
except (ValueError, KeyError, TypeError, OverflowError) as error:
    st.error(f"Le modèle ne peut pas être calculé en l’état : {error}")
    st.info("Corrigez les valeurs dans l’éditeur ou choisissez un autre préréglage. Les autres études restent accessibles.")
