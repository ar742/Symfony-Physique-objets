"""Éditeur graphique local ; seules les données validées rejoignent le brouillon."""
import math
from pathlib import Path

import streamlit as st
from streamlit.components.v2 import component

from physique_graphes import graphes_symetriques as g

ASSETS = Path(__file__).with_name("graph_editor_assets")
def register_editor():
    # Une seule instance ; l'enregistrement appartient au runtime courant
    # (notamment chaque nouvelle session AppTest), pas à l'import Python.
    return component("graph_editor", html=(ASSETS/"editor.html").read_text("utf-8"),
                     css=(ASSETS/"editor.css").read_text("utf-8"), js=(ASSETS/"editor.js").read_text("utf-8"))


def positions_for(model):
    """Repères initiaux stables, avec des liaisons qui ne traversent pas les nœuds."""
    n = model["n"]
    if g.normalize(model,draft=True) == g.normalize(g.initial_graph(),draft=True):
        return {"1":[60,240],"2":[230,85],"5":[230,395],"3":[440,85],
                "7":[440,395],"4":[650,85],"6":[650,395],"8":[840,240]}
    if n >= 5:
        return {str(node):[450+375*math.cos(math.pi+2*math.pi*k/n),240+190*math.sin(math.pi+2*math.pi*k/n)]
                for k,node in enumerate(model["order"])}
    columns = min(6, max(2, math.ceil(n/4)))
    rows = math.ceil(n/columns)
    return {str(node): [90+720*(k%columns)/max(1,columns-1), 65+350*(k//columns)/max(1,rows-1)]
            for k,node in enumerate(model["order"])}


def validate_drawing(payload, current, revision):
    if not isinstance(payload, dict) or type(payload.get("revision")) is not int or payload["revision"] != revision:
        raise ValueError("Le dessin a changé entre-temps. Reprendre la modification sur la version affichée.")
    model = g.normalize({**current, "edges": payload.get("edges")}, draft=True)
    positions = payload.get("positions")
    if not isinstance(positions, dict) or set(positions) != {str(i) for i in range(1,model["n"]+1)}:
        raise ValueError("Positions des nœuds incomplètes.")
    for point in positions.values():
        if not isinstance(point, list) or len(point) != 2 or any(type(v) not in (int,float) or (type(v) is float and not math.isfinite(v)) for v in point):
            raise ValueError("Position de nœud invalide.")
        if not 30 <= point[0] <= 870 or not 30 <= point[1] <= 450:
            raise ValueError("Un nœud sort du cadre du dessin.")
    return model, positions


def receive_drawing():
    state = st.session_state.get("s05g-drawing", {})
    payload = state.get("drawing")
    if payload is None:
        return
    try:
        current = st.session_state["s05g-draft"]
        model, positions = validate_drawing(payload, current, st.session_state.get("s05g-revision",0))
        old_positions = st.session_state.get("s05g-positions") or positions_for(current)
        if model == current and positions == old_positions:
            return
        history = st.session_state.get("s05g-drawing-history", [])
        st.session_state["s05g-drawing-history"] = (history+[(current,old_positions)])[-30:]
        st.session_state["s05g-draft"] = model
        st.session_state["s05g-positions"] = positions
        st.session_state["s05g-revision"] = st.session_state.get("s05g-revision",0)+1
        st.session_state.pop("s05g-drawing-error",None)
        st.session_state.pop("s05g-validation-error",None)
    except ValueError as error:
        st.session_state["s05g-drawing-error"] = str(error)


def draw(model):
    positions = st.session_state.get("s05g-positions") or positions_for(model)
    if set(positions) != {str(i) for i in range(1,model["n"]+1)}:
        positions = positions_for(model)
    editor = register_editor()
    editor(data={"model":model, "positions":positions, "revision":st.session_state.get("s05g-revision",0)},
           key="s05g-drawing", on_drawing_change=receive_drawing, height="content")
    if st.session_state.get("s05g-drawing-error"):
        st.error(st.session_state["s05g-drawing-error"])
