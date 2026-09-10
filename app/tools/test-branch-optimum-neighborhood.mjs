import assert from 'node:assert/strict';
import test from 'node:test';
import {createBranchesScenario, evaluateBranches} from '../public/scripts/branches-engine.mjs';
import {modelForState, sampleFlowSurface, verticalRange} from '../public/scripts/branch-surfaces-engine.mjs';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const model=createBranchesScenario();
const controls={s1:.8,s2:0,s5:0,s3:0,s7:0};
const optimum=evaluateBranches(model,controls);
const points=surface=>surface.points.flat();
// Independent closed form of the default production, not the coefficient f.
const g=x=>x<=.3?0:x<=.8?1.8*x*x-.54*x:2.1*x-1.5*x*x;

test('the flow coordinates preserve the network and the three frozen shares without mutating the state',()=>{
    const saved=JSON.stringify(optimum);
    const surface=sampleFlowSurface(optimum,{steps:8});
    assert.equal(surface.kind,'flows');
    assert.deepEqual(surface.frozen,[{key:'s5',value:0},{key:'s3',value:0},{key:'s7',value:0}]);
    for(const point of points(surface)) {
        assert.equal(point.feasible,true);
        close(point.available2,g(point.x));
        close(point.s2,point.y/g(point.x));
        close(point.z,g(g(point.x)-point.y));
        const recalculated=evaluateBranches(model,{...controls,s1:point.x,s2:point.s2});
        close(recalculated.branches.find(branch=>branch.id==='2-3').input,point.y);
        close(recalculated.production,point.z);
    }
    assert.equal(JSON.stringify(optimum),saved);
});

test('reference, parameter knot and comparison coordinates are inserted exactly in the sampling',()=>{
    const reference=evaluateBranches(model,{...controls,s1:.793,s2:.017});
    const comparison=evaluateBranches(model,{...controls,s1:.811,s2:.027});
    const surface=sampleFlowSurface(reference,{radius:.03,steps:4,comparison});
    const center=surface.markers[0],grid=surface.markers.find(point=>point.kind==='grid');
    assert.equal(center.x,.793);
    assert.equal(center.y,reference.branches.find(branch=>branch.id==='2-3').input);
    close(center.z,reference.production);
    assert.equal(grid.x,.811);
    assert.equal(grid.y,comparison.branches.find(branch=>branch.id==='2-3').input);
    close(grid.z,comparison.production);
    assert.equal(surface.comparisonStatus,'same-slice');
    for(const marker of surface.markers)assert.ok(points(surface).some(point=>point.x===marker.x&&point.y===marker.y&&point.z===marker.z));
    assert.ok(points(surface).some(point=>point.x===.8));
    assert.ok(surface.profiles.x.some(point=>point.x===.8));
    const outside=sampleFlowSurface(reference,{radius:.001,steps:4,comparison});
    assert.equal(outside.comparisonStatus,'same-slice-outside');
    assert.equal(outside.markers.length,1);
});

test('two orthogonal profiles and the five neighbors retain the actual cusp and one-sided boundary',()=>{
    const surface=sampleFlowSurface(optimum,{radius:.03,steps:7});
    assert.ok(surface.profiles.x.every(point=>point.y===0));
    assert.ok(surface.profiles.y.every(point=>point.x===.8));
    for(const profile of Object.values(surface.profiles))assert.ok(profile.some(point=>point.x===.8&&point.y===0));
    const [center,left,right,below,above]=surface.neighbors;
    close(center.z,.54432);
    close(left.x,.79);close(left.z,.49764306312);
    close(right.x,.81);close(right.z,.5378740605);
    assert.equal(below.feasible,false);assert.equal(below.z,null);close(below.y,-.01);
    assert.ok(below.reason.length>0);
    close(above.y,.01);close(above.z,.52398);
    const h=1e-7;
    close((g(g(.8))-g(g(.8-h)))/h,4.80168,2e-5);
    close((g(g(.8+h))-g(g(.8)))/h,-.6156,2e-5);
    close((g(g(.8)-h)-g(g(.8)))/h,-2.052,2e-5);
});

test('unavailable branch input is rejected explicitly and zero supply preserves the unidentified split',()=>{
    const reference=evaluateBranches(model,{...controls,s1:.2,s2:.731});
    const surface=sampleFlowSurface(reference,{radius:.03,steps:4});
    assert.equal(surface.markers[0].available2,0);
    assert.equal(surface.markers[0].s2,.731);
    for(const point of points(surface)) {
        if(point.y===0) {
            assert.equal(point.feasible,true);assert.equal(point.available2,0);assert.equal(point.s2,.731);
        } else {
            assert.equal(point.feasible,false);assert.equal(point.z,null);assert.match(point.reason,/dépasse/);
        }
    }
    assert.ok(Object.values(surface.ranges).flat().every(Number.isFinite));
    const nearThreshold=evaluateBranches(model,{...controls,s1:.31,s2:.5});
    const mixed=sampleFlowSurface(nearThreshold,{radius:.03,steps:6});
    assert.ok(points(mixed).some(point=>point.feasible));
    assert.ok(points(mixed).some(point=>!point.feasible));
    for(const point of points(mixed).filter(point=>!point.feasible))assert.equal(point.z,null);
});

test('effective designed laws are retained and a comparison on different frozen shares is recomputed',()=>{
    const custom=createBranchesScenario();
    custom.branches.forEach(branch=>Object.assign(branch,{a:0,b:.5,c:1,d:1}));
    const reference=evaluateBranches(custom,{s1:.5,s2:0,s5:0,s3:0,s7:0});
    const comparison=evaluateBranches(custom,{s1:.6,s2:.2,s5:.5,s3:.5,s7:.5});
    const surface=sampleFlowSurface(reference,{radius:.2,steps:5,comparison});
    const effective=modelForState(reference);
    for(const point of points(surface).filter(point=>point.feasible)) {
        const actual=evaluateBranches(effective,{...reference.controls,s1:point.x,s2:point.s2});
        close(point.z,actual.production);
    }
    const marker=surface.markers.find(point=>point.kind==='grid');
    assert.equal(surface.comparisonStatus,'projected');
    assert.equal(marker.projected,true);
    assert.equal(marker.originalYield,comparison.production);
    close(marker.z,evaluateBranches(custom,{...reference.controls,s1:comparison.controls.s1,s2:comparison.controls.s2}).production);
    assert.ok(Math.abs(marker.z-marker.originalYield)>.01);
    const different=evaluateBranches(model,controls);
    const excluded=sampleFlowSurface(reference,{comparison:different,steps:4});
    assert.equal(excluded.comparisonStatus,'different-laws');
    assert.equal(excluded.markers.length,1);
});

test('A7 vanishes over the optimum neighborhood even while the source share and downstream shares vary',()=>{
    const alpha=(.54+Math.sqrt(.54**2+4*1.8*.3))/(2*1.8);
    close(alpha,.5849329450233297);
    for(const s1 of [1-alpha+1e-12,.5,.7,.77,.8,.83,1])for(const s5 of [0,.2,.8,1]) {
        const state=evaluateBranches(model,{s1,s2:.03,s5,s3:.4,s7:.6});
        assert.equal(state.available['7'],0);
    }
    assert.ok(evaluateBranches(model,{...controls,s1:.77}).available['2']!==evaluateBranches(model,{...controls,s1:.83}).available['2']);
});

test('local vertical zoom uses absolute finite values and markers, with padding and a nonzero flat span',()=>{
    const surface={points:[[{z:.4},{z:.5},{z:null},{z:NaN},{z:Infinity}]],markers:[{z:.6}]};
    const local=verticalRange(surface,{mode:'local'});
    close(local[0],.38);close(local[1],.62);
    assert.deepEqual(verticalRange(surface,{mode:'global'}),[0,1]);
    const flat=verticalRange({points:[[{z:.54432}]],markers:[]});
    close(flat[0],.54426);close(flat[1],.54438);
    const actual=sampleFlowSurface(optimum,{steps:4});
    const zoom=verticalRange(actual);
    assert.ok(zoom[0]>.3&&zoom[1]<.6);
    for(const point of [...points(actual),...actual.markers].filter(point=>Number.isFinite(point.z)))assert.ok(point.z>=zoom[0]&&point.z<=zoom[1]);
});

test('the global vertical frame extends for real affine L values and invalid inputs are explicit',()=>{
    assert.deepEqual(verticalRange({points:[[{z:-.3},{z:1.4}]],markers:[{z:1.7}]},{mode:'global'}),[-.3,1.7]);
    assert.deepEqual(verticalRange({points:[[{z:null}]]},{mode:'global'}),[0,1]);
    assert.throws(()=>verticalRange({points:[[{z:null}]]}),/finie/);
    assert.throws(()=>verticalRange(null),/surface/);
    assert.throws(()=>verticalRange({points:[]},{mode:'normalised'}),/verticale/);
    for(const options of [{radius:0},{radius:NaN},{radius:1.01},{steps:1},{steps:61},{steps:3.5}])assert.throws(()=>sampleFlowSurface(optimum,options));
    assert.throws(()=>sampleFlowSurface({feasible:false}),/compatible/);
});
