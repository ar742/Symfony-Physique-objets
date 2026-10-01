"""Parcours du point 05 et cohérence des figures avec la recherche courante."""
from pathlib import Path

import plotly.io as pio
from streamlit.testing.v1 import AppTest

APP = Path(__file__).resolve().parents[1]/"app.py"


def ready(app):
    assert not app.exception, [item.message for item in app.exception]
    assert not app.error, [item.value for item in app.error]


def study():
    app = AppTest.from_file(str(APP), default_timeout=60).run()
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[4]).run()
    ready(app)
    return app


def test_default_optimum_graph_and_surface_modes():
    app = study()
    assert float(app.metric[0].value) == .203125
    assert float(app.metric[1].value) == .3125
    assert float(app.metric[2].value) <= 1e-6
    graph = pio.from_json(app.get("plotly_chart")[0].proto.spec)
    assert not any(a.showarrow for a in graph.layout.annotations)
    app.toggle(key="s05-directed").set_value(True).run()
    ready(app)
    graph = pio.from_json(app.get("plotly_chart")[0].proto.spec)
    assert sum(bool(a.showarrow) for a in graph.layout.annotations) == 12
    surface = pio.from_json(app.get("plotly_chart")[1].proto.spec)
    assert list(surface.data[1].x) == [.5]
    assert list(surface.data[1].y) == [0]
    assert list(surface.data[1].z) == [.3125]
    mode = app.radio(key="s05-surface-mode")
    mode.set_value(mode.options[1]).run()
    ready(app)
    assert any("selle" in a.value for a in app.warning)
    assert any("h_x(x_0,y_0)=0" in a.value for a in app.latex)
    app.selectbox(key="s05-x").set_value(2).run()
    ready(app)
    assert app.selectbox(key="s05-y").value != 2


def test_local_only_budget_and_invalid_start():
    app = study()
    app.selectbox(key="s05-method").set_value("local")
    app.number_input(key="s05-budget").set_value(100).run()
    ready(app)
    assert .29765 < float(app.metric[1].value) < .29766
    assert any("borne ouverte" in m.value for m in app.markdown)
    app.number_input(key="s05-initial-a23").set_value(.9)
    next(b for b in app.button if b.label == "Appliquer le départ").click().run()
    assert app.error
    assert float(app.metric[0].value) == .203125
    app.sidebar.radio[0].set_value(app.sidebar.radio[0].options[3]).run()
    ready(app)
