"""Point 05 : construction, réduction et vues d'une même étude validée."""
from pathlib import Path
import plotly.io as pio
from streamlit.testing.v1 import AppTest

APP=Path(__file__).resolve().parents[1]/"app.py"


def ready(app):
    assert not app.exception,[x.message for x in app.exception]
    assert not app.error,[x.value for x in app.error]


def study():
    app=AppTest.from_file(str(APP),default_timeout=60).run()
    assert len(app.sidebar.radio[0].options)==5
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[4]).run()
    ready(app)
    return app


def click(app,label,valid=True):
    next(b for b in app.button if b.label==label).click().run()
    if valid:ready(app)


def neighbors(app,text):
    next(t for t in app.text_input if t.label=="Voisins de ce nœud").set_value(text)
    click(app,"Enregistrer les liaisons")


def chart(app,key):
    item=next(x for x in app.get("plotly_chart") if x.proto.id.endswith(key))
    return pio.from_json(item.proto.spec)


def test_default_optimum_and_surface_modes():
    app=study()
    assert [t.label for t in app.tabs]==["Lagrangien et dérivées","Construire le graphe","Optimum et flux","Nappes"]
    assert float(app.metric[0].value)==.203125
    assert float(app.metric[1].value)==.3125
    assert float(app.metric[2].value)<=1e-6
    app.toggle(key="s05-directed").set_value(True).run();ready(app)
    figure=chart(app,"s05g-result-graph")
    assert sum(bool(a.showarrow) for a in figure.layout.annotations)==12
    surface=chart(app,"s05-surface")
    assert list(surface.data[1].x)==[.5] and list(surface.data[1].y)==[0] and list(surface.data[1].z)==[.3125]
    mode=app.radio(key="s05g-surface-mode")
    mode.set_value(mode.options[1]).run();ready(app)
    assert any("selle" in a.value for a in app.warning)
    next(box for box in app.selectbox if box.label=="Axe x").set_value(2).run();ready(app)
    assert next(box for box in app.selectbox if box.label=="Axe y").value!=2


def test_create_triangle_from_future_nodes_and_zero_variables():
    app=study()
    click(app,"Nouveau graphe depuis 1")
    neighbors(app,"2, 3")
    assert float(app.metric[1].value)==.3125
    assert app.session_state["s05g-draft"]["n"]==3
    app.selectbox(key="s05g-node").set_value(2).run();ready(app)
    neighbors(app,"1, 3")
    click(app,"Analyser ce graphe")
    assert app.session_state["s05g-active"]["n"]==3
    assert float(app.metric[1].value)==.75
    assert float(app.metric[2].value)==0
    assert any("Aucune nappe" in item.value for item in app.info)
    assert not any(box.label=="Axe x" for box in app.selectbox)
    assert app.button(key="s05g-search").disabled


def test_invalid_chain_keeps_active_graph_and_can_be_corrected():
    app=study();click(app,"Nouveau graphe depuis 1")
    neighbors(app,"2")
    app.selectbox(key="s05g-node").set_value(2).run()
    neighbors(app,"1, 3")
    click(app,"Analyser ce graphe",valid=False)
    assert app.error and "Aucune matrice" in app.error[0].value
    assert app.session_state["s05g-active"]["n"]==8 and float(app.metric[1].value)==.3125
    app.selectbox(key="s05g-node").set_value(1).run()
    neighbors(app,"2, 3")
    click(app,"Analyser ce graphe")
    assert app.session_state["s05g-active"]["n"]==3


def test_one_variable_curve_and_search():
    app=study()
    app.selectbox(key="s05g-preset").set_value("Cycle à 4 nœuds · une variable").run()
    click(app,"Charger cet exemple dans le brouillon")
    click(app,"Analyser ce graphe")
    assert any("Une seule variable" in item.value for item in app.info)
    assert chart(app,"s05g-curve")
    click(app,"Rechercher le maximum")
    assert float(app.metric[1].value)==1
    assert float(app.metric[2].value)==0


def test_add_remove_and_order_validation():
    app=study();click(app,"Nouveau graphe depuis 1")
    click(app,"Ajouter le nœud suivant")
    click(app,"Retirer le dernier nœud du brouillon")
    assert app.session_state["s05g-draft"]=={"version":1,"n":1,"edges":[],"order":[1]}
    neighbors(app,"2")
    order=next(t for t in app.text_input if t.label=="Ordre de calcul, de 1 au terminal")
    order.set_value("2, 1")
    click(app,"Enregistrer l’ordre de calcul",valid=False)
    assert app.error
    assert app.session_state["s05g-draft"]["order"]==[1,2]


def test_24_nodes_analysis_search_and_navigation():
    app=study()
    app.selectbox(key="s05g-preset").set_value("Échelle à 24 nœuds").run()
    click(app,"Charger cet exemple dans le brouillon")
    click(app,"Analyser ce graphe")
    assert app.session_state["s05g-active"]["n"]==24
    assert any("11 variables libres" in x.value for x in app.markdown)
    app.number_input(key="s05g-starts-11").set_value(2)
    app.number_input(key="s05g-maxiter-11").set_value(20)
    app.number_input(key="s05g-budget-False").set_value(100).run();ready(app)
    click(app,"Rechercher le maximum")
    result=app.session_state["s05g-result"][1]
    assert result["bound"]["lower"]<=result["objective"]<=result["bound"]["upper"]
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run();ready(app)
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[4]).run();ready(app)
    assert app.session_state["s05g-active"]["n"]==24
