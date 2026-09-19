"""Atelier local : lancer avec python -m streamlit run app.py."""
from copy import deepcopy
import json
import math

import numpy as np
import pandas as pd
import streamlit as st

from physique_graphes import dag, lois, production as p, reseaux as r
from physique_graphes.optimisation import optimiser
from ui_concordances import concordance_page
from physique_graphes.visualisation import graphe, courbes, echantillonner_surface, nappe
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
        concordance_page(figure, json_text, download_result)
except (ValueError, KeyError, TypeError, OverflowError) as error:
    st.error(f"Le modèle ne peut pas être calculé en l’état : {error}")
    st.info("Corrigez les valeurs dans l’éditeur ou choisissez un autre préréglage. Les autres études restent accessibles.")
