import assert from 'node:assert/strict';
import test from 'node:test';
import {CONCORDANCE_RANDOM_ALGORITHM,randomizeConcordance,createNegativeConcordanceScenario} from '../public/scripts/concordance-scenarios.mjs';
import {CONCORDANCE_GRAPH,createConcordanceScenario,evaluateConcordance,validateConcordanceModel} from '../public/scripts/concordance-engine.mjs';
import {CONCORDANCE_SAMPLE_RESULTS} from '../public/scripts/concordance-sample-results.mjs';

const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const ids=Array.from({length:8},(_,i)=>String(i+1));
const keys=CONCORDANCE_GRAPH.controls;
const active=new Set(CONCORDANCE_GRAPH.edges.map(edge=>`${edge.to}-${edge.from}`));

test('a seeded draw is reproducible, records its algorithm and preserves environments and shares',()=>{
    const model=createConcordanceScenario();model.environments['3']=.37;model.initialControls.s5=.23;
    const original=structuredClone(model),first=randomizeConcordance(model,42),second=randomizeConcordance(model,42);
    assert.deepEqual(first,second);assert.deepEqual(model,original);
    assert.deepEqual(first.environments,model.environments);assert.deepEqual(first.initialControls,model.initialControls);
    assert.equal(first.source,1);assert.deepEqual(first.provenance,{kind:'random-matrix',seed:42,algorithm:CONCORDANCE_RANDOM_ALGORITHM});
    assert.notDeepEqual(first.epsilon,randomizeConcordance(model,43).epsilon);
    first.environments['3']=0;first.initialControls.s5=0;
    assert.deepEqual(model,original);
});

test('the full matrix contains 56 bounded off-diagonal values and eight zeros without inventing arcs',()=>{
    for(const seed of [0,1,42,4294967295]) {
        const matrix=randomizeConcordance(createConcordanceScenario(),seed).epsilon;
        assert.deepEqual(Object.keys(matrix),ids);let drawn=0,inactive=0;
        for(const to of ids){assert.deepEqual(Object.keys(matrix[to]),ids);for(const from of ids){
            const value=matrix[to][from];assert.ok(Number.isFinite(value));
            if(to===from)assert.equal(value,0);
            else {drawn++;assert.ok(value>=-1&&value<1);if(!active.has(`${to}-${from}`))inactive++;}
        }}
        assert.equal(drawn,56);assert.equal(inactive,44);
    }
});

test('known integer states pin the algorithm, traversal and diagonal draw convention',()=>{
    const matrix=randomizeConcordance(createConcordanceScenario(),0).epsilon;
    const values=ids.flatMap(to=>ids.filter(from=>from!==to).map(from=>matrix[to][from]));
    const states=[1013904223,1196435762,3519870697,2868466484];
    assert.deepEqual(values.slice(0,4),states.map(value=>2*value/4294967296-1));
    assert.equal(matrix['1']['1'],0);assert.equal(matrix['1']['2'],values[0]);
    assert.equal(matrix['2']['1'],values[7]);assert.equal(matrix['2']['3'],values[8]);
});

test('invalid seeds are rejected rather than silently wrapped or rounded',()=>{
    for(const seed of [-1,4294967296,.5,NaN,Infinity,'42',null,undefined])assert.throws(()=>randomizeConcordance(createConcordanceScenario(),seed),RangeError);
    const invalid=createConcordanceScenario();invalid.environments['2']=2;
    assert.throws(()=>randomizeConcordance(invalid,42),RangeError);
});

test('the engine retains a random full matrix, but 44 inactive values do not change either mode',()=>{
    const full=randomizeConcordance(createConcordanceScenario(),2026),sparse=structuredClone(full);
    for(const to of ids)for(const from of ids)if(!active.has(`${to}-${from}`))sparse.epsilon[to][from]=0;
    assert.deepEqual(validateConcordanceModel(full).epsilon,full.epsilon);
    for(const domain of ['rectified','signed']) {
        const a=evaluateConcordance(full,full.initialControls,{domain}),b=evaluateConcordance(sparse,sparse.initialControls,{domain});
        assert.equal(a.feasible,true);assert.equal(a.objective,b.objective);
        assert.deepEqual(a.flows,b.flows);assert.deepEqual(a.nodes,b.nodes);
    }
});

test('the negative example fixes the terminal coefficient without borrowing an optimum from metadata',()=>{
    const model=createNegativeConcordanceScenario();assert.equal(model.environments['8'],0);
    for(const id of ids.filter(id=>!['1','8'].includes(id)))assert.equal(model.environments[id],1);
    for(const to of ids)for(const from of ids)assert.equal(model.epsilon[to][from],to==='8'&&['2','4','6'].includes(from)?-1:0);
    assert.ok(!Object.hasOwn(model,'optimum'));assert.deepEqual(model.initialControls,Object.fromEntries(keys.map(key=>[key,.5])));
});

test('every tested share transfers one unit into node 8, giving signed -1 and rectified zero',()=>{
    const model=createNegativeConcordanceScenario();
    const points=[model.initialControls,...Array.from({length:32},(_,n)=>Object.fromEntries(keys.map((key,i)=>[key,(n>>i)&1]))),
        {s1:.17,s2:.23,s5:.61,s3:.82,s7:.39}];
    for(const controls of points)for(const domain of ['signed','rectified']) {
        const state=evaluateConcordance(model,controls,{domain});assert.equal(state.feasible,true);
        const terminal=state.nodes.find(node=>node.id==='8');
        close(terminal.input,1);close(terminal.coefficient,-1);close(terminal.rawOutput,-1);
        close(state.objectives.arrivals,1);close(state.objective,domain==='signed'?-1:0);
        if(state.derivatives.differentiable)state.derivatives.gradient.forEach(value=>close(value,0));
        for(const node of state.nodes.filter(node=>!['1','8'].includes(node.id)))close(node.output,node.input);
    }
});

test('the published sample dataset replays every reported state with the same matrix and mode',()=>{
    const data=CONCORDANCE_SAMPLE_RESULTS;
    assert.equal(data.algorithm,CONCORDANCE_RANDOM_ALGORITHM);assert.equal(data.objective,'output');
    const base={...createConcordanceScenario(),environments:data.model.environments,initialControls:data.model.initialControls};
    assert.deepEqual(data.cases.map(item=>item.seed),[7,8,34]);
    for(const item of data.cases)for(const domain of ['rectified','signed']) {
        const model=randomizeConcordance(base,item.seed),row=item.modes[domain];
        for(const recorded of [row.initial,row.grid.best,row.local.best,row.global.best,row.bestObtained]) {
            const state=evaluateConcordance(model,recorded.controls,{domain});
            close(state.objective,recorded.objective);assert.deepEqual(state.nodes.filter(node=>node.output<0).map(node=>node.id),recorded.negativeOutputNodes);
        }
        assert.ok(row.global.upperBound>=row.bestObtained.objective);
        close(row.gapToBestObtained,row.global.upperBound-row.bestObtained.objective);
        assert.ok(row.grid.evaluations<=data.settings.grid.maxEvaluations);
        assert.ok(row.local.evaluations<=data.settings.local.maxEvaluations);
        assert.ok(row.global.processedNodes<=data.settings.global.maxNodes);
    }
});

test('sample comparisons distinguish a certified result from an open bound and a strict ordering witness',()=>{
    const cases=Object.fromEntries(CONCORDANCE_SAMPLE_RESULTS.cases.map(item=>[item.seed,item.modes]));
    assert.equal(cases[8].rectified.global.status,'certified');assert.equal(cases[8].signed.global.status,'node-limit');
    assert.ok(cases[34].signed.bestObtained.objective>cases[34].rectified.global.upperBound);
    assert.ok(cases[34].signed.bestObtained.negativeOutputNodes.length>0);
    assert.ok(cases[7].rectified.bestObtained.objective<cases[7].signed.global.upperBound);
});
