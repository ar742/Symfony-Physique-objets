import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateBranches} from '../public/scripts/branches-engine.mjs';
import {createInteriorPeakScenario} from '../public/scripts/branch-interior-example.mjs';
import {explainExactLagrangian,evaluateExactLagrangianPoint,sampleExactLagrangianSurface} from '../public/scripts/branches-exact-lagrangian.mjs';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const model=createInteriorPeakScenario(),state=evaluateBranches(model),diagnostic=explainExactLagrangian(state);
const ix=id=>diagnostic.variables.find(variable=>variable.branch===id&&variable.quantity==='input').index;
const source=x=>x<=.1?9*x*x:x*(1-x);
const q=x=>x<=.01?99*x*x:x*(1-x);
const transmit=x=>x<=.001?1000*x*x:x;
const production=(id,x)=>id==='1-2'?source(x):id==='1-5'?0:['2-3','2-8'].includes(id)?q(x):transmit(x);
const canonical=point=>{
    const x=point.slice(0,12);
    return .75*source(x[ix('1-2')])+q(x[ix('2-3')])-.75*x[ix('2-3')]+q(x[ix('2-8')])-.75*x[ix('2-8')]
        +model.branches.filter(branch=>!['1-2','1-5','2-3','2-8'].includes(branch.id)).reduce((sum,branch)=>sum+transmit(x[ix(branch.id)])-x[ix(branch.id)],0);
};

test('the analytic certificate contains the 24 variables, 19 multipliers and a compatible equality witness',()=>{
    assert.equal(diagnostic.available,true);
    assert.equal(diagnostic.variables.length,24);
    assert.equal(new Set(diagnostic.variableNames).size,24);
    assert.deepEqual(diagnostic.multipliers.balances.map(item=>item.value),[0,.75,1,1,1,1,1]);
    assert.equal(diagnostic.multipliers.laws.length,12);
    for(const multiplier of diagnostic.multipliers.laws)assert.equal(multiplier.value,multiplier.id==='1-2'?.75:1);
    assert.equal(diagnostic.certificate.upperBound,7/32);
    assert.equal(diagnostic.certificate.terms.reduce((sum,term)=>sum+term.upperBound,0),7/32);
    assert.match(diagnostic.certificate.provenance,/aucun multiplicateur de PL/);
    assert.equal(diagnostic.atWitness.feasible,true);
    close(diagnostic.atWitness.objective,7/32);
    close(diagnostic.atWitness.lagrangian,7/32);
    assert.equal(diagnostic.atWitness.constraints.balances.length,7);
    assert.equal(diagnostic.atWitness.constraints.laws.length,12);
});

test('free derivatives at the six zero downstream inputs are corrected by lower-bound multipliers',()=>{
    const activeBounds=['5-3','5-7','7-6','7-4','3-6','6-8'];
    const stationarity=diagnostic.stationarity;
    assert.equal(stationarity.lowerMultipliers.filter(value=>value!==0).length,6);
    for(const id of activeBounds) {
        const index=ix(id);
        assert.equal(diagnostic.witnessPoint[index],0);
        assert.equal(diagnostic.atWitness.gradient[index],-1);
        assert.equal(diagnostic.atWitness.derivativeDetails[index].side,'right');
        assert.equal(stationarity.lowerMultipliers[index],1);
    }
    close(stationarity.residual,0);
    close(stationarity.complementarityResidual,0);
    assert.ok(stationarity.correctedGradient.every(value=>Math.abs(value)<1e-12));
    assert.ok(stationarity.upperMultipliers.every(value=>value===0));
});

test('the full L, direct constraints and independent separable expression agree throughout the box',()=>{
    let seed=58273;
    const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let sample=0;sample<120;sample++) {
        const point=Array.from({length:24},random),actual=evaluateExactLagrangianPoint(diagnostic,point);
        const x=point.slice(0,12),y=point.slice(12);
        const balances=Array(7).fill(0);balances[0]=1;
        let objective=0;
        model.branches.forEach((branch,i)=>{
            balances[Number(branch.from)-1]-=x[i];
            if(branch.to==='8')objective+=y[i];else balances[Number(branch.to)-1]+=y[i];
            close(actual.constraints.laws[i].value,production(branch.id,x[i])-y[i]);
        });
        actual.constraints.balances.forEach((item,i)=>close(item.value,balances[i]));
        close(actual.objective,objective);
        close(actual.lagrangian,canonical(point));
        assert.ok(actual.lagrangian<=7/32+1e-12);
        assert.ok(actual.gradient.slice(12).every(value=>value===0));
        const changedOutputs=[...x,...Array.from({length:12},random)];
        close(evaluateExactLagrangianPoint(diagnostic,changedOutputs).lagrangian,actual.lagrangian);
    }
});

test('all 24 free gradients and diagonal Hessian entries match independent finite differences away from kinks',()=>{
    const point=[.42,.5,.12,.15,.0004,.004,.3,.02,.0018,.05,.8,.0007,...Array(12).fill(.17)];
    const actual=evaluateExactLagrangianPoint(diagnostic,point),h=1e-7;
    for(let j=0;j<24;j++) {
        const left=[...point],right=[...point];left[j]-=h;right[j]+=h;
        const before=evaluateExactLagrangianPoint(diagnostic,left),after=evaluateExactLagrangianPoint(diagnostic,right);
        close(actual.gradient[j],(after.lagrangian-before.lagrangian)/(2*h),2e-8);
        close(actual.hessian[j][j],(after.gradient[j]-before.gradient[j])/(2*h),2e-6);
        for(let k=0;k<24;k++)if(k!==j)assert.equal(actual.hessian[j][k],0);
    }
});

test('L equals production on recomputed feasible states and not generally on free-coordinate slices',()=>{
    for(const s1 of [.2,.4,.5,.6,.8])for(const s2 of [.1,.5,.9]) {
        const feasible=evaluateBranches(model,{s1,s2,s3:.4,s5:.3,s7:.6});
        const inspection=explainExactLagrangian(feasible);
        assert.equal(inspection.available,true);
        assert.equal(inspection.atReference.feasible,true);
        close(inspection.atReference.lagrangian,feasible.production);
    }
    const free=[...diagnostic.referencePoint];free[ix('1-2')]=.52;free[ix('2-3')]=.14;
    const value=evaluateExactLagrangianPoint(diagnostic,free);
    assert.equal(value.feasible,false);
    assert.ok(value.residual>.001);
    assert.ok(Math.abs(value.lagrangian-value.objective)>.0001);
});

test('actual kinks have null derivatives, while domain-end derivatives and a zero law are explicit',()=>{
    for(const id of ['1-2','2-3','2-8','3-4']) {
        const point=[...diagnostic.referencePoint],index=ix(id);
        point[index]=model.branches.find(branch=>branch.id===id).b;
        const value=evaluateExactLagrangianPoint(diagnostic,point);
        assert.equal(value.gradient[index],null);
        assert.equal(value.hessian[index][index],null);
        assert.equal(value.derivativeDetails[index].kink,true);
    }
    const zeroLaw=[...diagnostic.referencePoint];zeroLaw[ix('1-5')]=.1;
    assert.equal(evaluateExactLagrangianPoint(diagnostic,zeroLaw).gradient[ix('1-5')],0);
    for(const value of [0,1]) {
        const point=[...diagnostic.referencePoint];point[ix('2-3')]=value;
        const evaluated=evaluateExactLagrangianPoint(diagnostic,point);
        assert.equal(evaluated.derivativeDetails[ix('2-3')].side,value===0?'right':'left');
        close(evaluated.gradient[ix('2-3')],value===0?-.75:-1.75);
    }
});

test('the three free Lagrangian surfaces use their actual quadratic formulas and stationary coordinates',()=>{
    for(const [x,y] of [['1-2','2-3'],['1-2','2-8'],['2-3','2-8']]) {
        const surface=sampleExactLagrangianSurface(state,{x,y,steps:6});
        assert.equal(surface.kind,'nlp');assert.equal(surface.frozen.length,22);
        assert.equal(surface.peak.x,x==='1-2'?.5:.125);assert.equal(surface.peak.y,.125);
        close(surface.peak.z,7/32);
        assert.ok(surface.peak.gradient.every(value=>Math.abs(value)<1e-12));
        assert.equal(surface.peak.feasible,true);assert.equal(surface.peak.attainsGlobalBound,true);
        close(surface.peak.hessian[0][0],x==='1-2'?-1.5:-2);
        close(surface.peak.hessian[1][1],-2);
        assert.ok(surface.points.flat().some(point=>!point.feasible));
        assert.ok(surface.points.flat().every(point=>Number.isFinite(point.z)));
        for(const point of surface.points.flat()) {
            const expected=x==='1-2'?-.75*point.x**2+.75*point.x-point.y**2+.25*point.y+1/64:-(point.x**2)-point.y**2+.25*(point.x+point.y)+3/16;
            close(point.z,expected);
            close(point.gradient[0],x==='1-2'?.75-1.5*point.x:.25-2*point.x);
            close(point.gradient[1],.25-2*point.y);
        }
        assert.match(surface.derivativeFormula.dx,/non définie/);
        assert.ok(surface.markers[0].gradient.every(value=>Math.abs(value)<1e-12));
        assert.ok(surface.points.flat().some(point=>point.x===surface.markers[0].x&&point.y===surface.markers[0].y));
    }
});

test('the free L curvature differs from the feasible restriction that also changes x28',()=>{
    const surface=sampleExactLagrangianSurface(state,{steps:4}),dv=.02;
    const free=[...diagnostic.referencePoint];free[ix('2-3')]=.125+dv;
    const freeValue=evaluateExactLagrangianPoint(diagnostic,free);
    const feasible=evaluateBranches(model,{...state.controls,s2:(.125+dv)/.25});
    close(freeValue.lagrangian,7/32-dv*dv);
    close(feasible.production,7/32-2*dv*dv);
    assert.equal(freeValue.feasible,false);
    assert.equal(surface.peak.hessian[1][1],-2);
    close(explainExactLagrangian(feasible).atReference.lagrangian,feasible.production);
});

test('the maximum of a slice reports its actual frozen-coordinate height instead of imposing the global bound',()=>{
    const other=evaluateBranches(model,{...state.controls,s2:.4});
    const surface=sampleExactLagrangianSurface(other,{steps:4});
    close(surface.peak.x,.5);close(surface.peak.y,.125);
    close(surface.peak.z,7/32-.025**2);
    assert.equal(surface.peak.attainsGlobalBound,false);
    assert.equal(surface.peak.feasible,false);
    assert.ok(surface.peak.gradient.every(value=>Math.abs(value)<1e-12));
    assert.equal(surface.frozen.find(item=>item.key==='x_2_8').value,other.branches.find(branch=>branch.id==='2-8').input);
    close(surface.markers[0].z,other.production);
});

test('surface sampling inserts actual kinks and reports null rather than a false zero gradient there',()=>{
    const surface=sampleExactLagrangianSurface(state,{x:'2-3',y:'2-8',radius:.2,steps:7});
    const atKink=surface.points.flat().find(point=>point.x===.01&&point.y===.125);
    assert.ok(atKink);assert.equal(atKink.gradient[0],null);assert.equal(atKink.hessian[0][0],null);
    close(atKink.gradient[1],0);
    const atZero=surface.points.flat().find(point=>point.x===0&&point.y===.125);
    assert.equal(atZero.derivativeSides[0],'right');close(atZero.gradient[0],-.75);
});

test('recognition rejects changed laws, forged states and unknown coordinates without extrapolating',()=>{
    const altered=createInteriorPeakScenario();altered.branches[0].c=.89;
    assert.equal(explainExactLagrangian(evaluateBranches(altered)).available,false);
    const forged=structuredClone(state);forged.branches[0].output+=.001;
    assert.equal(explainExactLagrangian(forged).available,false);
    assert.equal(explainExactLagrangian({feasible:false}).available,false);
    const reordered=structuredClone(state);reordered.branches.reverse();
    assert.equal(explainExactLagrangian(reordered).available,true);
    for(const point of [[],Array(24).fill(NaN),[-.01,...diagnostic.referencePoint.slice(1)],[1.01,...diagnostic.referencePoint.slice(1)]])assert.throws(()=>evaluateExactLagrangianPoint(diagnostic,point));
    assert.throws(()=>evaluateExactLagrangianPoint({available:false},diagnostic.referencePoint));
    for(const options of [{x:'1-5'},{x:'1-2',y:'1-2'},{radius:0},{radius:NaN},{steps:61},{steps:2.5}])assert.throws(()=>sampleExactLagrangianSurface(state,options));
});
