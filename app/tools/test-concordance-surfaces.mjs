import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcordanceScenario,evaluateConcordance} from '../public/scripts/concordance-engine.mjs';
import {sampleConcordanceSurface} from '../public/scripts/concordance-surfaces.mjs';

test('La nappe du cas de référence suit sa formule indépendante sur toute la fenêtre',()=>{
    const model=createConcordanceScenario(),state=evaluateConcordance(model);
    const surface=sampleConcordanceSurface(model,state,{x:'s1',y:'s2',radius:.4,steps:30});
    for(const p of surface.points.flat()){
        assert.ok(p.feasible);assert.ok(Math.abs(p.z-2*p.x*(1-p.x))<1e-14);
    }
    assert.equal(surface.reference.z,.5);
    assert.equal(surface.profiles.x.find(p=>p.x===.5).z,.5);
    assert.ok(surface.profiles.y.every(p=>Math.abs(p.z-.5)<1e-14));
    assert.deepEqual(surface.frozen,{s5:.5,s3:.5,s7:.5});
});

test('Le voisinage recalcule TH8 et la mise à zéro, sans réutiliser les arrivées comme objectif',()=>{
    const model=createConcordanceScenario();model.environments['8']=.1;
    model.epsilon['8']={'2':-1,'4':-1,'6':-1};
    const state=evaluateConcordance(model),surface=sampleConcordanceSurface(model,state,{radius:.5,steps:20});
    assert.equal(state.objectives.arrivals,.5);assert.equal(state.objective,0);
    for(const p of surface.points.flat()){
        const input=2*p.x*(1-p.x),expected=Math.max(0,input*(.1-input));
        assert.ok(Math.abs(p.z-expected)<1e-14);
    }
    assert.ok(surface.points.flat().some(p=>p.z>0));
});

test('Les axes distincts, frontières et fenêtres invalides sont traités explicitement',()=>{
    const model=createConcordanceScenario();model.initialControls.s1=0;
    const state=evaluateConcordance(model),surface=sampleConcordanceSurface(model,state,{radius:.1,steps:10});
    assert.deepEqual(surface.ranges.x,[0,.1]);
    assert.ok(surface.points.flat().every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
    for(const radius of [0,-.1,NaN,Infinity,1.1])assert.throws(()=>sampleConcordanceSurface(model,state,{radius}));
    assert.throws(()=>sampleConcordanceSurface(model,state,{x:'s1',y:'s1'}));
    assert.throws(()=>sampleConcordanceSurface(model,state,{x:'source'}));
});
