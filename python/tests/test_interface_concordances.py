"""Parcours de l'étude 04 : paramètres indépendants et référence commune."""
from copy import deepcopy
from pathlib import Path

import numpy as np
import plotly.io as pio
import pytest
from streamlit.testing.v1 import AppTest

from physique_graphes import concordances as c
from physique_graphes.types_concordances import apply_matrix_type, apply_environment_type

APP = Path(__file__).resolve().parents[1] / "app.py"


def ready(app):
    assert not app.exception, [item.message for item in app.exception]
    assert not app.error, [item.value for item in app.error]


def study():
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run()
    ready(app)
    return app


def click(app, label):
    next(button for button in app.button if button.label == label).click().run()
    ready(app)


def test_defaults_lists_matrix_orientation_and_apply_unchanged():
    app = study()
    model = deepcopy(app.session_state["concordances-active"])
    assert app.selectbox(key="c04-matrix").value == "random-signed"
    assert app.selectbox(key="c04-environment").value == "neutre"
    assert set(model["environments"].values()) == {0}
    assert not app.text_area
    assert not any("Nouvelle matrice" in b.label or "Amplification" in b.label for b in app.button)
    chart = pio.from_json(app.get("plotly_chart")[0].proto.spec)
    assert sum(label == "Coefficient actif" for row in chart.data[0].customdata for label in row) == 12
    assert np.array(chart.data[0].z).tolist() == [[model["epsilon"][str(i)][str(j)] for j in range(1, 9)] for i in range(1, 9)]
    click(app, "Appliquer les réglages")
    # Attraper notamment une transposition silencieuse destination/fournisseur.
    assert app.session_state["concordances-active"] == model


def test_independent_types_seed_and_navigation_preserve_state():
    app = study()
    model = deepcopy(app.session_state["concordances-active"])
    model["initial_controls"]["s1"] = .23
    model["attributes"] = {"étude": "personnelle"}
    app.session_state["concordances-active"] = model
    app.run()
    app.selectbox(key="c04-environment").set_value("random-signed").run()
    ready(app)
    env_model = deepcopy(app.session_state["concordances-active"])
    assert env_model["epsilon"] == model["epsilon"]
    app.selectbox(key="c04-matrix").set_value("random-positive").run()
    ready(app)
    positive = deepcopy(app.session_state["concordances-active"])
    assert positive["environments"] == env_model["environments"]
    assert positive["attributes"] == model["attributes"]
    assert positive["initial_controls"] == model["initial_controls"]
    seed = app.number_input(key="c04-matrix-seed").value
    next_seed = (seed+1) % 2**32
    app.number_input(key="c04-matrix-seed").set_value(next_seed).run()
    ready(app)
    expected = deepcopy(app.session_state["concordances-active"])
    assert expected["epsilon"] != positive["epsilon"]
    assert expected["epsilon"] == apply_matrix_type(positive, "random-positive", seed=next_seed)["epsilon"]
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[0]).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run()
    ready(app)
    assert app.session_state["concordances-active"] == expected
    assert app.selectbox(key="c04-environment").value == "random-signed"
    assert app.selectbox(key="c04-matrix").value == "random-positive"
    assert app.number_input(key="c04-matrix-seed").value == next_seed


def test_negative_maximum_and_rectification():
    app = study()
    app.selectbox(key="c04-matrix").set_value("negative").run()
    app.selectbox(key="c04-environment").set_value("negative").run()
    ready(app)
    assert float(app.metric[0].value) == pytest.approx(-1)
    app.selectbox(key="c04-method-shares").set_value("interval").run()
    app.number_input(key="c04-budget").set_value(100).run()
    click(app, "Lancer la recherche")
    assert float(app.metric[0].value) == pytest.approx(-1)
    app.radio(key="c04-domain").set_value("rectified").run()
    ready(app)
    assert float(app.metric[0].value) == 0
    assert "configuration de départ" in app.metric[0].label


@pytest.mark.parametrize("group", ["shares", "environments", "epsilon"])
def test_search_updates_every_view_and_invalidates_on_change(group):
    app = study()
    app.selectbox(key="c04-matrix").set_value("reference").run()
    app.selectbox(key="c04-environment").set_value("reference").run()
    app.selectbox(key="c04-group").set_value(group).run()
    app.selectbox(key="c04-method-"+group).set_value("local").run()
    app.number_input(key="c04-budget").set_value(100).run()
    click(app, "Lancer la recherche")
    result = app.session_state["c04-results"]["results"][0]
    assert float(app.metric[0].value) == pytest.approx(result["best_state"]["objective"])
    table = next(df.value for df in app.dataframe if "Out · total Yᵢ" in df.value.columns)
    assert list(table["Out · total Yᵢ"]) == pytest.approx([n["output"] for n in sorted(result["best_state"]["nodes"], key=lambda n: int(n["id"]))])
    spec = next(df.value for df in app.dataframe if "dℒ compatible / dvariable" in df.value.columns)
    assert len(spec) == {"shares": 5, "environments": 7, "epsilon": 12}[group]
    surfaces = [pio.from_json(chart.proto.spec) for chart in app.get("plotly_chart")]
    compatible = next(fig for fig in surfaces if fig.data[0].type == "surface" and fig.layout.scene.zaxis.title.text == "ℒ compatible = Y₈")
    assert compatible.data[1].z[0] == pytest.approx(result["best_state"]["objective"])
    if group != "shares":
        assert not any("Intervalles" in option for option in app.selectbox(key="c04-method-"+group).options)
    app.selectbox(key="c04-matrix").set_value("inhibitory").run()
    ready(app)
    assert "configuration de départ" in app.metric[0].label


def test_table_flow_sums_and_graph_labels_agree_with_signed_state():
    from ui_concordances import flow_table
    from physique_graphes.visualisation import graphe_concordances
    model = apply_environment_type(apply_matrix_type(c.create_scenario(), "random-signed", seed=8), "random-signed", seed=7)
    state = c.evaluate(model, domain="signed")
    table = flow_table(model, state)
    for row in table[1:]:
        incoming = [f["value"] for f in state["flows"] if f["to"] == row["Nœud"]]
        assert row["In · somme Xᵢ"] == pytest.approx(sum(incoming))
    graph = graphe_concordances(state)
    assert sum("α=" in annotation.text for annotation in graph.layout.annotations) == 12
    assert sum("q=" in annotation.text for annotation in graph.layout.annotations) == 12
