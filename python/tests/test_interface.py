"""Recette des parcours principaux de l'interface, sans navigateur externe."""
from pathlib import Path
import json
import pytest
from streamlit.testing.v1 import AppTest

APP = Path(__file__).resolve().parents[1] / "app.py"


def assert_ready(app):
    assert not app.exception, [item.message for item in app.exception]
    assert not app.error, [item.value for item in app.error]


def button(app, label):
    return next(item for item in app.button if item.label == label)


@pytest.mark.parametrize("family", range(4))
def test_families_render(family):
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[family]).run()
    assert_ready(app)
    assert len(app.get("plotly_chart")) > 0


def test_signed_negative_and_random_research():
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run()
    app.selectbox[0].select_index(1).run()
    assert_ready(app)
    assert app.metric[0].value == "-1"
    button(app, "Lancer la recherche").click().run()
    assert_ready(app)
    app.selectbox[0].select_index(2).run()
    assert_ready(app)
    # Une recherche locale modifie réellement les partages et recentre la nappe.
    button(app, "Lancer la recherche").click().run()
    assert_ready(app)
    button(app, "Adopter les partages trouvés et centrer les nappes").click().run()
    assert_ready(app)


def test_import_concordance_defaults_order_and_domain():
    from physique_graphes import concordances as c
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run()
    model = c.randomize(c.create_scenario(), 34)
    model["initialControls"] = dict(sorted(model.pop("initial_controls").items()))
    app.text_area[0].set_value(json.dumps({"model": model, "options": {"domain": "rectified"}}))
    button(app, "Appliquer le modèle").click().run()
    assert_ready(app)
    assert app.session_state["concordance-domain"] == "rectified"
    model.pop("initialControls")
    app.text_area[0].set_value(json.dumps({"model": model, "domain": "signed"}))
    button(app, "Appliquer le modèle").click().run()
    assert_ready(app)
    gradient_table = next(item.value for item in app.dataframe if "∂Y₈/∂s" in item.value.columns)
    expected = c.evaluate(model, domain="signed")["derivatives"]["gradient"]
    assert list(gradient_table["partage"]) == c.GRAPH["controls"]
    assert list(gradient_table["∂Y₈/∂s"]) == pytest.approx(expected)


def test_dag_presets_cycles_and_model_edit():
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[2]).run()
    assert float(app.metric[0].value) == pytest.approx(7/32)
    app.selectbox[0].select_index(1).run()
    assert_ready(app)
    assert float(app.metric[0].value) == pytest.approx(143217/320000)
    # Ajout d'un attribut et remplacement d'une vraie loi par une fonction personnelle.
    model = json.loads(app.text_area[0].value)
    model["edges"][0]["attributes"]["unité"] = "débit normalisé"
    model["edges"][0]["law"] = {"name": "rendement_constant", "parameters": {"eta": .75}}
    app.text_area[0].set_value(json.dumps(model))
    button(app, "Appliquer le modèle").click().run()
    assert_ready(app)
    assert float(app.metric[0].value) != pytest.approx(143217/320000)
    assert json.loads(app.text_area[0].value)["edges"][0]["attributes"]["unité"] == "débit normalisé"
    # Le rejet d'une topologie cyclique est visible et préserve le dernier modèle valide.
    invalid = json.loads(app.text_area[0].value)
    invalid["edges"][0]["to"] = "1"
    app.text_area[0].set_value(json.dumps(invalid))
    button(app, "Appliquer le modèle").click().run()
    assert app.error
    # Passer au modèle cyclique explicitement prévu à cet effet.
    app.main.radio[0].set_value(app.main.radio[0].options[1]).run()
    assert_ready(app)
    app.selectbox[0].select_index(2).run()
    assert_ready(app)
