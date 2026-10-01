"""Frontière dessin/Python : aucun geste ne modifie directement l'étude validée."""
from copy import deepcopy
from unittest.mock import patch

import pytest
import graph_editor as editor


def sample(n=4):
    model={"version":1,"n":n,"edges":[],"order":list(range(1,n+1))}
    return model,{"revision":3,"edges":[[1,2]],"positions":editor.positions_for(model)}


def test_drawing_keeps_ids_order_and_canonicalizes_links():
    model,payload=sample()
    payload["edges"]=[[2,1],[1,2],[3,4]]
    payload["n"]=24;payload["order"]=[4,3,2,1]
    result,positions=editor.validate_drawing(payload,model,3)
    assert result=={**model,"edges":[[1,2],[3,4]]}
    assert positions==payload["positions"] and model["edges"]==[]


@pytest.mark.parametrize("change",[
    {"revision":2},{"revision":True},{"edges":[[1,1]]},{"edges":[[1,5]]},
    {"positions":{}},{"positions":{"1":[float('nan'),50]}},
])
def test_invalid_or_outdated_drawing_is_refused(change):
    model,payload=sample();payload.update(change)
    with pytest.raises(ValueError):editor.validate_drawing(payload,model,3)


@pytest.mark.parametrize("point",[[0,50],[40,451],[True,50],[float('nan'),50],[40,float('inf')],[40],"<script>",[10**400,50]])
def test_coordinates_are_finite_in_frame_numbers(point):
    model,payload=sample();payload["positions"]["2"]=point
    with pytest.raises(ValueError):editor.validate_drawing(payload,model,3)


def test_24_nodes_positions_roundtrip():
    model,payload=sample(24)
    assert len({tuple(p) for p in payload["positions"].values()})==24
    assert editor.validate_drawing(payload,model,3)[0]["n"]==24


def test_drawing_callback_preserves_active_study_and_records_undo():
    model,payload=sample();active=deepcopy(model)
    state={"s05g-draft":model,"s05g-active":active,"s05g-revision":3,
           "s05g-drawing":{"drawing":payload},"s05g-result":{"proof":"preserved"}}
    with patch.object(editor.st,"session_state",state):editor.receive_drawing()
    assert state["s05g-draft"]["edges"]==[[1,2]]
    assert state["s05g-active"]==active and state["s05g-result"]=={"proof":"preserved"}
    assert state["s05g-drawing-history"]==[(model,editor.positions_for(model))]
    assert state["s05g-revision"]==4
    with patch.object(editor.st,"session_state",state):editor.receive_drawing()
    assert len(state["s05g-drawing-history"])==1 and "entre-temps" in state["s05g-drawing-error"]
