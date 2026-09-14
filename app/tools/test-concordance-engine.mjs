import assert from 'node:assert/strict';
import test from 'node:test';
import {CONCORDANCE_GRAPH,createConcordanceScenario,validateConcordanceModel,evaluateConcordance,boundConcordanceBox,searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal,concordanceWitnessPoint,evaluateConcordanceLagrangian,explainConcordanceLagrangian} from '../public/scripts/concordance-engine.mjs';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const model=createConcordanceScenario(),keys=CONCORDANCE_GRAPH.controls;
const whole=()=>Array.from({length:5},()=>[0,1]);
const influenced=()=>{const result=createConcordanceScenario();result.environments['8']=.2;Object.assign(result.epsilon['8'],{'2':.4,'4':.1,'6':.3});return result;};

test('the nodal model conserves each split and adds incoming flows before transforming once',()=>{
    const state=evaluateConcordance(model);
    assert.equal(state.objectiveKind,'output');assert.equal(state.domain,'rectified');assert.equal(state.feasible,true);
    assert.equal(state.nodes.length,8);assert.equal(state.flows.length,12);
    close(state.objectives.arrivals,.5);close(state.objectives.output,.5);
    for(const node of state.nodes) {
        if(node.id!=='1')close(node.input,state.flows.filter(flow=>flow.to===node.id).reduce((sum,flow)=>sum+flow.value,0));
        if(node.id!=='8')close(node.output,state.flows.filter(flow=>flow.from===node.id).reduce((sum,flow)=>sum+flow.value,0));
    }
    close(state.nodes.find(node=>node.id==='3').input,.25);
    close(state.nodes.find(node=>node.id==='7').output,.125);
    close(state.nodes.find(node=>node.id==='4').output,.1875);
    assert.ok(state.flows.every(flow=>flow.value>=0));
});

test('destination-first epsilon and the final environment affect output while preserving the incoming comparison',()=>{
    const state=evaluateConcordance(influenced());
    close(state.objectives.arrivals,.5);close(state.nodes.find(node=>node.id==='8').coefficient,.325);close(state.objective,.1625);
    close(evaluateConcordance(influenced(),model.initialControls,{objective:'arrivals'}).objective,.5);
    const changed=influenced();changed.epsilon['8']['2']=.8;
    close(evaluateConcordance(changed).objective,.1875);
});

test('negative production is set to zero without propagating signed flows or imposing an upper cap',()=>{
    const blocked=createConcordanceScenario();blocked.environments['2']=0;
    const state=evaluateConcordance(blocked),node=state.nodes.find(node=>node.id==='2');
    close(node.rawOutput,-.25);assert.equal(node.output,0);assert.equal(node.rectified,true);
    assert.ok(state.flows.filter(flow=>flow.from==='2').every(flow=>flow.value===0));
    close(state.objective,.25);
    assert.equal(state.derivatives.differentiable,true);
    const amplified=createConcordanceScenario();for(const row of Object.values(amplified.epsilon))for(const key of Object.keys(row))row[key]=1;
    const controls={s1:1,s2:1,s5:.5,s3:1,s7:.5},gain=evaluateConcordance(amplified,controls);
    close(gain.objectives.arrivals,42);close(gain.objectives.output,1806);
    assert.equal(gain.feasible,true);assert.ok(gain.nodes.some(item=>item.coefficient>1));
    assert.equal(evaluateConcordance(amplified,controls,{domain:'efficiency'}).feasible,false);
});

test('the demonstration is the source parabola for all downstream shares, with analytic derivatives',()=>{
    for(const s1 of [.1,.3,.5,.8])for(const v of [.15,.6,.9]) {
        const state=evaluateConcordance(model,{s1,s2:v,s5:1-v,s3:.4,s7:.7});
        close(state.objective,2*s1*(1-s1));
        assert.equal(state.derivatives.differentiable,true);
        close(state.derivatives.gradient[0],2-4*s1);
        for(let i=1;i<5;i++)close(state.derivatives.gradient[i],0);
        state.derivatives.hessian.forEach((row,i)=>row.forEach((value,j)=>close(value,i===0&&j===0?-4:0)));
    }
});

test('jets match finite differences for five gradients and all Hessian entries in a smooth coupled case',()=>{
    const current=influenced(),controls={s1:.4,s2:.35,s5:.55,s3:.6,s7:.3};
    const state=evaluateConcordance(current,controls),h=1e-6;
    assert.equal(state.derivatives.differentiable,true);
    for(let j=0;j<5;j++) {
        const before=evaluateConcordance(current,{...controls,[keys[j]]:controls[keys[j]]-h}),after=evaluateConcordance(current,{...controls,[keys[j]]:controls[keys[j]]+h});
        close(state.derivatives.gradient[j],(after.objective-before.objective)/(2*h),2e-8);
        for(let i=0;i<5;i++)close(state.derivatives.hessian[i][j],(after.derivatives.gradient[i]-before.derivatives.gradient[i])/(2*h),2e-8);
    }
});

test('a genuine rectification threshold has no fabricated zero gradient or Hessian',()=>{
    const threshold=createConcordanceScenario();threshold.environments['2']=.5;
    const state=evaluateConcordance(threshold);
    assert.equal(state.nodes.find(node=>node.id==='2').rawOutput,0);
    assert.equal(state.derivatives.differentiable,false);assert.equal(state.derivatives.gradient,null);assert.equal(state.derivatives.hessian,null);
    assert.ok(state.derivatives.kinks.some(kink=>kink.node==='2'));
    const constant=createConcordanceScenario();constant.environments['8']=0;
    assert.equal(evaluateConcordance(constant).derivatives.differentiable,true);
    assert.ok(evaluateConcordance(constant).derivatives.gradient.every(value=>value===0));
});

test('outward interval and cut bounds certify the default independently of its symbolic description',()=>{
    const bound=boundConcordanceBox(model,whole());
    assert.ok(bound.upperBound>=.5);assert.ok(bound.upperBound<.500000000001);
    close(bound.cutBounds.sourceOutputs,.5);
    const result=searchConcordanceGlobal(model,{maxNodes:0});
    assert.equal(result.status,'certified');assert.equal(result.complete,true);assert.equal(result.processedNodes,0);
    close(result.best.objective,.5);assert.ok(result.gap<1e-12);
    assert.equal(result.certificate.type,'interval-propagation-dag');
    assert.equal(result.certificate.scope.objective,'output');
});

test('interval bounds dominate independent samples with amplification, inhibition and narrow boxes',()=>{
    let seed=748521;
    const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let trial=0;trial<30;trial++) {
        const varied=createConcordanceScenario();
        for(const id of Object.keys(varied.environments)){varied.environments[id]=random();for(const from of Object.keys(varied.epsilon[id]))varied.epsilon[id][from]=2*random()-1;}
        const box=keys.map(()=>{const a=random(),b=random();return trial%3===0?[a,Math.min(1,a+1e-12)]:[Math.min(a,b),Math.max(a,b)];});
        for(const objective of ['arrivals','output']) {
            const bound=boundConcordanceBox(varied,box,{objective});
            for(let sample=0;sample<25;sample++) {
                const controls=Object.fromEntries(keys.map((key,i)=>[key,box[i][0]+random()*(box[i][1]-box[i][0])]));
                const state=evaluateConcordance(varied,controls,{objective});
                assert.ok(state.objective<=bound.upperBound,`${state.objective} exceeds ${bound.upperBound}`);
            }
        }
    }
});

test('global budgets preserve a real upper bound without certifying an unclosed amplified problem',()=>{
    const gain=createConcordanceScenario();for(const row of Object.values(gain.epsilon))for(const from of Object.keys(row))row[from]=1;
    const limited=searchConcordanceGlobal(gain,{maxNodes:0});
    assert.equal(limited.status,'node-limit');assert.equal(limited.complete,false);
    assert.ok(limited.upperBound>=1806);assert.ok(limited.gap>1e-5);assert.ok(limited.certificate.frontier.length>0);
    const partial=searchConcordanceGlobal(gain,{maxNodes:8});
    assert.ok(partial.upperBound>=1806);assert.ok(partial.upperBound<=limited.upperBound);assert.ok(partial.best.objective>=limited.best.objective);
    assert.ok(partial.processedNodes<=8);
});

test('the default finite grid is exhaustive, deterministic and returns a detailed best state',()=>{
    const events=[],result=searchConcordanceGrid(model,{divisions:10,onProgress:event=>events.push(event)});
    assert.equal(result.total,161051);assert.equal(result.evaluations,161051);assert.equal(result.feasibleCount,161051);
    assert.equal(result.status,'complete');assert.equal(result.complete,true);close(result.best.objective,.5);
    assert.ok(result.best.derivatives.computed!==false);assert.equal(events.at(-1),result);
    const prefix=searchConcordanceGrid(model,{divisions:10,maxEvaluations:3});
    assert.equal(prefix.complete,false);assert.equal(prefix.status,'evaluation-limit');assert.equal(prefix.evaluations,3);assert.equal(prefix.upperBound,null);
});

test('local variations improve a specified initial point and expose their finite stopping rule',()=>{
    const result=searchConcordanceLocal(model,{initialControls:{...model.initialControls,s1:.2},initialStep:.1,minStep:1e-4,maxEvaluations:1000});
    close(result.best.objective,.5);assert.equal(result.status,'local-stop');assert.ok(result.evaluations<=1000);
    for(let i=1;i<result.history.length;i++)assert.ok(result.history[i].objective>=result.history[i-1].objective);
    assert.equal(result.upperBound,null);assert.equal(result.gap,null);
});

test('searches respect cancellation and zero budgets',()=>{
    for(const method of [searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal]) {
        const events=[],result=method(model,{shouldCancel:()=>true,onProgress:event=>events.push(event)});
        assert.equal(result.status,'cancelled');assert.equal(result.complete,false);assert.equal(result.evaluations,0);assert.equal(result.best,null);assert.equal(events.at(-1),result);
    }
    assert.equal(searchConcordanceGrid(model,{maxEvaluations:0}).best,null);
    assert.equal(searchConcordanceLocal(model,{maxEvaluations:0}).best,null);
});

test('the 26-coordinate L uses 21 signed equalities and equals the selected objective at a witness',()=>{
    const state=evaluateConcordance(influenced()),point=concordanceWitnessPoint(state),multipliers=Array.from({length:21},(_,i)=>(i-10)/20);
    assert.equal(point.length,26);
    for(const objective of ['arrivals','output']) {
        const value=evaluateConcordanceLagrangian(influenced(),point,{objective,multipliers});
        assert.equal(value.constraints.length,21);assert.equal(value.feasible,true);close(value.residual,0);close(value.lagrangian,state.objectives[objective]);
    }
    const negative=[...point];negative[CONCORDANCE_GRAPH.edges.findIndex(edge=>edge.id==='2-8')]=-.125;
    const free=evaluateConcordanceLagrangian(influenced(),negative,{objective:'arrivals'});
    close(free.objective,.5);assert.equal(free.feasible,false);
});

test('the free L gradient and bilinear Hessian match finite differences away from thresholds',()=>{
    const current=influenced(),state=evaluateConcordance(current,{s1:.4,s2:.35,s5:.55,s3:.6,s7:.3}),point=concordanceWitnessPoint(state),multipliers=Array.from({length:21},(_,i)=>(i-10)/20);
    const actual=evaluateConcordanceLagrangian(current,point,{multipliers}),h=1e-6;
    assert.equal(actual.differentiable,true);
    for(let j=0;j<26;j++) {
        const before=[...point],after=[...point];before[j]-=h;after[j]+=h;
        const left=evaluateConcordanceLagrangian(current,before,{multipliers}),right=evaluateConcordanceLagrangian(current,after,{multipliers});
        close(actual.gradient[j],(right.lagrangian-left.lagrangian)/(2*h),2e-8);
        for(let i=0;i<26;i++)close(actual.hessian[i][j],(right.gradient[i]-left.gradient[i])/(2*h),2e-8);
    }
});

test('adjoints agree with five share derivatives and remain a diagnostic rather than a global proof',()=>{
    const current=influenced(),state=evaluateConcordance(current,{s1:.4,s2:.35,s5:.55,s3:.6,s7:.3}),explanation=explainConcordanceLagrangian(current,state);
    assert.equal(explanation.globalCertificate,false);assert.equal(explanation.multipliers.length,21);
    close(explanation.atReference.lagrangian,state.objective);
    for(let j=12;j<26;j++)close(explanation.atReference.gradient[j],0);
    for(let j=0;j<5;j++) {
        const id=keys[j].slice(1),outgoing=state.flows.filter(flow=>flow.from===id),supply=state.nodes.find(node=>node.id===id).output;
        close(state.derivatives.gradient[j],supply*(explanation.edgeValues[outgoing[0].id]-explanation.edgeValues[outgoing[1].id]));
    }
    const optimum=explainConcordanceLagrangian(model,evaluateConcordance(model));close(optimum.maxSelectedGradient,0);
    const threshold=createConcordanceScenario();threshold.environments['2']=.5;
    const chosen=explainConcordanceLagrangian(threshold,evaluateConcordance(threshold));
    assert.equal(chosen.atReference.differentiable,false);assert.equal(chosen.atReference.gradient,null);assert.ok(chosen.selections.length>0);
});

test('validation rejects invalid parameters, diagonal influences and malformed independent coordinates',()=>{
    for(const mutate of [m=>m.source=.9,m=>m.environments['8']=1.1,m=>m.epsilon['8']['2']=-1.1,m=>m.epsilon['3']['8']=1.2,m=>m.epsilon['1']={'1':.1},m=>m.initialControls.s3=2,m=>m.epsilon['9']={},m=>m.epsilon['3']['9']=0]) {
        const bad=createConcordanceScenario();mutate(bad);assert.throws(()=>validateConcordanceModel(bad));
    }
    assert.throws(()=>evaluateConcordance(model,model.initialControls,{domain:'unknown'}));
    assert.throws(()=>evaluateConcordance(model,model.initialControls,{objective:'abs-output'}));
    for(const method of [searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal])assert.throws(()=>method(model,{unexpected:1}));
    assert.throws(()=>searchConcordanceGlobal(model,{maxNodes:-1}));
    assert.throws(()=>searchConcordanceGlobal(model,{tolerance:0}));
    assert.throws(()=>searchConcordanceGrid(model,{divisions:0}));
    assert.throws(()=>searchConcordanceLocal(model,{minStep:.2,initialStep:.1}));
    assert.throws(()=>boundConcordanceBox(model,[[0,1]]));
    assert.throws(()=>evaluateConcordanceLagrangian(model,Array(25).fill(0)));
    assert.throws(()=>evaluateConcordanceLagrangian(model,Array(26).fill(0),{multipliers:[0]}));
});

const signedMixed=()=>{
    const current=influenced();current.environments['2']=0;current.epsilon['5']['1']=0;return current;
};
const negativeMaximum=()=>{
    const current=createConcordanceScenario();
    for(const row of Object.values(current.epsilon))for(const from of Object.keys(row))row[from]=0;
    current.environments['8']=0;
    for(const from of Object.keys(current.epsilon['8']))current.epsilon['8'][from]=-1;
    return current;
};

test('complete destination-first epsilon matrices preserve 56 coefficients while non-edges remain inactive',()=>{
    const full=createConcordanceScenario();
    full.epsilon=Object.fromEntries(CONCORDANCE_GRAPH.nodes.map(({id})=>[id,Object.fromEntries(CONCORDANCE_GRAPH.nodes.map(({id:from})=>[from,id===from?0:(Number(id)+Number(from))/16]))]));
    for(const edge of CONCORDANCE_GRAPH.edges)full.epsilon[edge.to][edge.from]=model.epsilon[edge.to][edge.from];
    const canonical=validateConcordanceModel(full);
    assert.equal(Object.values(canonical.epsilon).reduce((total,row)=>total+Object.keys(row).length,0),64);
    assert.equal(canonical.epsilon['1']['8'],9/16);
    for(const domain of ['signed','rectified','efficiency']) {
        const before=evaluateConcordance(model,model.initialControls,{domain}),after=evaluateConcordance(full,full.initialControls,{domain});
        assert.deepEqual(after,before);
    }
    full.epsilon['1']['8']=-1;assert.equal(canonical.epsilon['1']['8'],9/16);
    for(const badValue of [NaN,Infinity,-1.1,1.1]) {const invalid=structuredClone(full);invalid.epsilon['1']['8']=badValue;assert.throws(()=>validateConcordanceModel(invalid));}
    const missing=createConcordanceScenario();delete missing.epsilon['8']['2'];assert.throws(()=>validateConcordanceModel(missing));
});

test('signed transfers subtract at junctions and distinguish algebraic, absolute and transformed arrivals',()=>{
    const current=createConcordanceScenario();current.environments['2']=0;current.epsilon['5']['1']=0;
    const controls={s1:.5,s2:.8,s5:.1,s3:.6,s7:.3},state=evaluateConcordance(current,controls,{domain:'signed'});
    assert.equal(state.feasible,true);assert.ok(state.flows.some(flow=>flow.value<0));
    close(state.nodes.find(node=>node.id==='2').output,-.25);close(state.nodes.find(node=>node.id==='3').input,-.15);
    close(state.objectives.algebraicArrivals,.25);close(state.objectives.arrivals,.35);close(state.objectives.output,.25);
    assert.ok(state.nodes.every(node=>node.rectified===false));
    for(const node of state.nodes.filter(node=>node.id!=='8')) {
        const outgoing=state.flows.filter(flow=>flow.from===node.id);
        close(outgoing.reduce((sum,flow)=>sum+flow.value,0),node.output);
        for(const flow of outgoing)close(flow.value,node.output*flow.fraction);
    }
    close(evaluateConcordance(current,controls,{domain:'rectified'}).objective,.5);
    close(evaluateConcordance(current,controls,{domain:'signed',objective:'arrivals'}).objective,.35);
});

test('signed output is polynomial through zero while the optional absolute-arrival objective declares its kink',()=>{
    const threshold=createConcordanceScenario();threshold.environments['2']=.5;
    const signed=evaluateConcordance(threshold,threshold.initialControls,{domain:'signed'});
    assert.equal(signed.derivatives.differentiable,true);assert.deepEqual(signed.derivatives.kinks,[]);
    close(signed.derivatives.gradient[0],-.5);close(signed.derivatives.hessian[0][0],-4);
    const absolute=evaluateConcordance(threshold,threshold.initialControls,{domain:'signed',objective:'arrivals'});
    assert.equal(absolute.derivatives.differentiable,false);assert.equal(absolute.derivatives.gradient,null);
    assert.ok(absolute.derivatives.kinks.some(kink=>kink.edge==='2-8'));
    const explained=explainConcordanceLagrangian(threshold,signed);
    assert.equal(explained.atReference.differentiable,true);assert.deepEqual(explained.selections,[]);
});

test('signed jets and adjoints match derivatives with negative supplies and both objectives',()=>{
    const current=signedMixed(),controls={s1:.4,s2:.35,s5:.55,s3:.6,s7:.3},h=1e-6;
    for(const objective of ['output','arrivals']) {
        const options={domain:'signed',objective},state=evaluateConcordance(current,controls,options),explanation=explainConcordanceLagrangian(current,state);
        assert.equal(state.derivatives.differentiable,true);assert.equal(explanation.atReference.feasible,true);assert.equal(explanation.globalCertificate,false);
        close(explanation.atReference.lagrangian,state.objective);
        for(let j=12;j<26;j++)close(explanation.atReference.gradient[j],0);
        for(let j=0;j<5;j++) {
            const before=evaluateConcordance(current,{...controls,[keys[j]]:controls[keys[j]]-h},options),after=evaluateConcordance(current,{...controls,[keys[j]]:controls[keys[j]]+h},options);
            close(state.derivatives.gradient[j],(after.objective-before.objective)/(2*h),2e-8);
            for(let i=0;i<5;i++)close(state.derivatives.hessian[i][j],(after.derivatives.gradient[i]-before.derivatives.gradient[i])/(2*h),2e-8);
            const id=keys[j].slice(1),outgoing=state.flows.filter(flow=>flow.from===id),supply=state.nodes.find(node=>node.id===id).output;
            close(state.derivatives.gradient[j],supply*(explanation.edgeValues[outgoing[0].id]-explanation.edgeValues[outgoing[1].id]));
        }
    }
});

test('signed free L accepts negative compatible supplies, rejects incompatible fractions and retains the bilinear Hessian',()=>{
    const current=signedMixed(),state=evaluateConcordance(current,{s1:.4,s2:.35,s5:.55,s3:.6,s7:.3},{domain:'signed'}),point=concordanceWitnessPoint(state),multipliers=Array.from({length:21},(_,i)=>(i-10)/20),options={domain:'signed',multipliers};
    const actual=evaluateConcordanceLagrangian(current,point,options),h=1e-6;
    assert.equal(actual.feasible,true);assert.equal(actual.constraints.length,21);assert.equal(actual.differentiable,true);
    assert.match(actual.convention,/hY=Y−XC/);close(actual.lagrangian,state.objective);
    for(let j=0;j<26;j++) {
        const before=[...point],after=[...point];before[j]-=h;after[j]+=h;
        const left=evaluateConcordanceLagrangian(current,before,options),right=evaluateConcordanceLagrangian(current,after,options);
        close(actual.gradient[j],(right.lagrangian-left.lagrangian)/(2*h),2e-8);
        for(let i=0;i<26;i++)close(actual.hessian[i][j],(right.gradient[i]-left.gradient[i])/(2*h),2e-8);
    }
    const reversed=[...point];reversed[2]=Math.abs(reversed[2]);assert.equal(evaluateConcordanceLagrangian(current,reversed,options).shareAdmissible,false);
    const excessive=[...point];excessive[2]=2*state.nodes.find(node=>node.id==='2').output;assert.equal(evaluateConcordanceLagrangian(current,excessive,options).shareAdmissible,false);
    const zeroSupply=[...point];zeroSupply[19]=0;assert.equal(evaluateConcordanceLagrangian(current,zeroSupply,options).shareAdmissible,false);
    const zero=Array(26).fill(0),zeroL=evaluateConcordanceLagrangian(current,zero,options);assert.equal(zeroL.differentiable,true);assert.equal(zeroL.feasible,false);
});

test('signed interval bounds include cancellations, negative coefficients and narrow boxes without positive cut bounds',()=>{
    let seed=851126;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let trial=0;trial<40;trial++) {
        const varied=createConcordanceScenario();
        for(const id of Object.keys(varied.environments)){varied.environments[id]=random();for(const from of Object.keys(varied.epsilon[id]))varied.epsilon[id][from]=2*random()-1;}
        const box=keys.map(()=>{const a=random(),b=random();return trial%3===0?[a,Math.min(1,a+1e-12)]:[Math.min(a,b),Math.max(a,b)];});
        for(const objective of ['output','arrivals']) {
            const options={domain:'signed',objective},bound=boundConcordanceBox(varied,box,options);
            assert.equal(bound.cutBounds,null);assert.equal(bound.impossible,false);
            for(let sample=0;sample<25;sample++) {
                const controls=Object.fromEntries(keys.map((key,i)=>[key,box[i][0]+random()*(box[i][1]-box[i][0])])),state=evaluateConcordance(varied,controls,options);
                assert.ok(state.objective>=bound.lowerBound&&state.objective<=bound.upperBound,`${state.objective} outside [${bound.lowerBound},${bound.upperBound}]`);
                for(const node of state.nodes)assert.ok(node.output>=bound.nodes[node.id].output[0]&&node.output<=bound.nodes[node.id].output[1]);
            }
        }
    }
});

test('a provably negative global maximum remains a negative best for every search instead of being replaced by zero',()=>{
    // Upstream identity laws preserve total1. Hence X8=1, C8=−1 and Y8=−1
    // for every share vector; this is an independent proof, not a solver shortcut.
    const current=negativeMaximum(),options={domain:'signed'},states=[current.initialControls,{s1:0,s2:1,s5:0,s3:1,s7:0},{s1:.31,s2:.67,s5:.48,s3:.29,s7:.77}];
    for(const controls of states) {
        const state=evaluateConcordance(current,controls,options);
        close(state.objectives.algebraicArrivals,1);close(state.objectives.arrivals,1);close(state.objective,-1);
        assert.equal(state.feasible,true);assert.ok(state.derivatives.gradient.every(value=>Math.abs(value)<1e-12));
    }
    const grid=searchConcordanceGrid(current,{...options,divisions:4}),local=searchConcordanceLocal(current,{...options,maxEvaluations:200}),global=searchConcordanceGlobal(current,{...options,maxNodes:12});
    assert.equal(grid.complete,true);assert.equal(grid.feasibleCount,3125);
    for(const result of [grid,local,global]) {assert.ok(result.best);assert.equal(result.best.domain,'signed');close(result.best.objective,-1);assert.ok(result.best.objective<0);}
    assert.ok(global.upperBound>=-1);assert.equal(global.status,'node-limit');assert.ok(global.gap>global.tolerance);assert.equal(global.complete,false);
    assert.equal(global.certificate.scope.domain,'signed');assert.ok(global.certificate.frontier.length>0);
    close(evaluateConcordance(current,current.initialControls,{domain:'rectified'}).objective,0);
});

test('signed partial searches preserve their budget, objective and inherited bounds',()=>{
    const current=signedMixed(),options={domain:'signed',objective:'arrivals'},events=[];
    const limited=searchConcordanceGlobal(current,{...options,maxNodes:0}),partial=searchConcordanceGlobal(current,{...options,maxNodes:8,onProgress:event=>events.push(event)});
    assert.ok(partial.upperBound<=limited.upperBound);assert.ok(partial.upperBound>=partial.best.objective);
    assert.ok(partial.best.objective>=limited.best.objective);assert.ok(partial.processedNodes<=8);assert.equal(events.at(-1),partial);
    const prefix=searchConcordanceGrid(current,{...options,divisions:10,maxEvaluations:5});
    assert.equal(prefix.evaluations,5);assert.equal(prefix.complete,false);assert.equal(prefix.best.objectiveKind,'arrivals');
    for(const method of [searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal])assert.equal(method(current,{...options,shouldCancel:()=>true}).best,null);
});
