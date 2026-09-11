import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateBranches,branchProductionRate} from '../public/scripts/branches-engine.mjs';
import {createActiveBranchesScenario} from '../public/scripts/branch-active-example.mjs';
import {explainActiveLagrangian,evaluateActiveLagrangianPoint,sampleActiveLagrangianSurface} from '../public/scripts/branch-active-lagrangian.mjs';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const model=createActiveBranchesScenario(),state=evaluateBranches(model),diagnostic=explainActiveLagrangian(state);
const mu=[.35,.41,.44,.48,.41,.48,.44,1],upper=.447553125;
const ix=id=>diagnostic.variables.find(variable=>variable.branch===id&&variable.quantity==='input').index;
const coeff=parameters=>{const beta=(parameters.c-parameters.d)/(1-parameters.b);return {alpha:parameters.c+beta*parameters.b,beta};};

test('the initial witness activates all twelve branches and the seven node outputs satisfy the requested contrast',()=>{
    assert.equal(diagnostic.available,true);
    assert.ok(state.branches.every(branch=>branch.input>0&&branch.output>0));
    const expected={'2':.45,'3':.320625,'4':.30459375,'5':.45,'6':.30459375,'7':.320625,'8':upper};
    for(const [id,value] of Object.entries(expected))close(state.available[id],value);
    const outputs=Object.entries(state.available).filter(([id])=>id!=='1').map(([,value])=>value);
    close(Math.max(...outputs)/Math.min(...outputs),1600/1083);
    assert.ok(Math.max(...outputs)/Math.min(...outputs)<1.5);
    assert.ok(Math.max(...outputs)/Math.min(...outputs)>1);
    assert.ok(Object.values(state.controls).every(value=>value>0&&value<1));
    assert.equal(diagnostic.variables.length,24);
    assert.deepEqual(diagnostic.multipliers.balances.map(item=>item.value),mu.slice(0,7));
    for(const multiplier of diagnostic.multipliers.laws)assert.equal(multiplier.value,mu[Number(multiplier.id.split('-')[1])-1]);
    assert.equal(diagnostic.atWitness.feasible,true);
    close(diagnostic.atWitness.lagrangian,upper);
    close(diagnostic.certificate.upperBound,upper);
});

test('the 24 free stationarity equations vanish at an interior witness without bound multipliers',()=>{
    assert.ok(diagnostic.witnessPoint.every(value=>value>0&&value<1));
    assert.ok(diagnostic.atWitness.boundStatus.every(value=>value==='interior'));
    assert.ok(diagnostic.atWitness.gradient.every(value=>Math.abs(value)<1e-12));
    assert.ok(diagnostic.stationarity.lowerMultipliers.every(value=>value===0));
    assert.ok(diagnostic.stationarity.upperMultipliers.every(value=>value===0));
    close(diagnostic.stationarity.residual,0);
    assert.equal(diagnostic.stationarity.complementarityResidual,0);
    assert.ok(diagnostic.atWitness.hessian.slice(0,12).every((row,i)=>row[i]<0));
});

test('each global certificate term bounds the entire piecewise law including the convex initial portion',()=>{
    const certificate=diagnostic.certificate;
    assert.equal(certificate.constant,.35);assert.equal(certificate.terms.length,12);
    close(certificate.computedBoxSupremum,upper);
    assert.ok(certificate.numericalUpperBound>=certificate.computedBoxSupremum);
    assert.ok(certificate.numericalMargin>0);
    assert.match(certificate.provenance,/aucun multiplicateur de PL/);
    for(const term of certificate.terms) {
        const branch=model.branches.find(item=>item.id===term.id),{alpha,beta}=coeff(branch);
        assert.ok(alpha>0&&beta>0);
        assert.ok(term.argmax>branch.b&&term.argmax<1);
        close(term.argmax,term.witnessInput);
        for(const x of [0,branch.b/2,branch.b,branch.b*2,term.argmax,.4,.8,1]) {
            const actual=branchProductionRate(x,branch),quadratic=alpha*x-beta*x*x;
            assert.ok(actual<=quadratic+1e-14);
            if(x<branch.b)close(quadratic-actual,alpha*x*(1-x/branch.b));
            const contribution=term.destinationMultiplier*actual-term.sourceMultiplier*x;
            assert.ok(contribution<=term.upperBound+1e-14);
            if(x===term.argmax)close(contribution,term.upperBound);
        }
    }
});

test('the expanded L, direct equalities and upper bound agree at arbitrary points of the 24-dimensional box',()=>{
    let seed=829374;
    const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let sample=0;sample<100;sample++) {
        const point=Array.from({length:24},random);
        if(sample%3===0)point[sample%12]=.0005;
        const actual=evaluateActiveLagrangianPoint(diagnostic,point),x=point.slice(0,12),y=point.slice(12);
        const balances=Array(7).fill(0);balances[0]=1;
        let expanded=.35,objective=0;
        model.branches.forEach((branch,i)=>{
            const production=branchProductionRate(x[i],branch),source=Number(branch.from)-1,destination=Number(branch.to)-1;
            balances[source]-=x[i];
            if(destination===7)objective+=y[i];else balances[destination]+=y[i];
            close(actual.constraints.laws[i].value,production-y[i]);
            expanded+=mu[destination]*production-mu[source]*x[i];
        });
        actual.constraints.balances.forEach((item,i)=>close(item.value,balances[i]));
        close(actual.objective,objective);close(actual.lagrangian,expanded);close(actual.expandedLagrangian,expanded);
        assert.ok(actual.lagrangian<=diagnostic.certificate.numericalUpperBound);
        assert.ok(actual.gradient.slice(12).every(value=>value===0));
        const replacedOutputs=[...x,...Array.from({length:12},random)];
        close(evaluateActiveLagrangianPoint(diagnostic,replacedOutputs).lagrangian,actual.lagrangian);
    }
});

test('all gradients and diagonal Hessian entries agree with independent finite differences away from kinks',()=>{
    const point=[.42,.5,.12,.15,.0004,.004,.3,.02,.0018,.05,.8,.0007,...Array(12).fill(.17)];
    const actual=evaluateActiveLagrangianPoint(diagnostic,point),h=1e-7;
    for(let j=0;j<24;j++) {
        const left=[...point],right=[...point];left[j]-=h;right[j]+=h;
        const before=evaluateActiveLagrangianPoint(diagnostic,left),after=evaluateActiveLagrangianPoint(diagnostic,right);
        close(actual.gradient[j],(after.lagrangian-before.lagrangian)/(2*h),2e-8);
        close(actual.hessian[j][j],(after.gradient[j]-before.gradient[j])/(2*h),2e-6);
        for(let k=0;k<24;k++)if(k!==j)assert.equal(actual.hessian[j][k],0);
    }
});

test('all five shares affect the optimum and L equals production only after the full constraints are restored',()=>{
    for(const key of ['s1','s2','s5','s3','s7'])for(const delta of [-.01,.01]) {
        const other=evaluateBranches(model,{...state.controls,[key]:state.controls[key]+delta});
        assert.ok(other.production<state.production-1e-7);
        const explanation=explainActiveLagrangian(other);
        assert.equal(explanation.available,true);assert.equal(explanation.atReference.feasible,true);
        close(explanation.atReference.lagrangian,other.production);
    }
    const free=[...diagnostic.referencePoint];free[ix('1-2')]+=.02;free[ix('2-3')]+=.01;
    const inspected=evaluateActiveLagrangianPoint(diagnostic,free);
    assert.equal(inspected.feasible,false);assert.ok(inspected.residual>.005);
    assert.ok(Math.abs(inspected.lagrangian-inspected.objective)>1e-6);
});

test('the three free surfaces have the predicted negative curvature and stationary coordinates',()=>{
    const curvature={'1-2':.038,'2-3':8/225,'2-8':.4};
    for(const [x,y] of [['1-2','2-3'],['1-2','2-8'],['2-3','2-8']]) {
        const surface=sampleActiveLagrangianSurface(state,{x,y,steps:6}),cx=diagnostic.witnessPoint[ix(x)],cy=diagnostic.witnessPoint[ix(y)];
        assert.equal(surface.kind,'nlp');assert.equal(surface.frozen.length,22);
        close(surface.peak.x,cx);close(surface.peak.y,cy);close(surface.peak.z,upper);
        assert.equal(surface.peak.feasible,true);assert.equal(surface.peak.attainsGlobalBound,true);
        assert.ok(surface.peak.gradient.every(value=>Math.abs(value)<1e-12));
        close(surface.peak.hessian[0][0],-2*curvature[x]);close(surface.peak.hessian[1][1],-2*curvature[y]);
        assert.ok(surface.points.flat().some(point=>!point.feasible));
        for(const point of surface.points.flat()) {
            close(point.z,upper-curvature[x]*(point.x-cx)**2-curvature[y]*(point.y-cy)**2);
            close(point.gradient[0],-2*curvature[x]*(point.x-cx));close(point.gradient[1],-2*curvature[y]*(point.y-cy));
            assert.ok(Number.isFinite(point.z));
        }
        const center=surface.markers[0];
        assert.ok(surface.points.flat().some(point=>point.x===center.x&&point.y===center.y&&point.z===center.z));
        assert.match(surface.derivativeFormula.dx,/non définie/);
    }
});

test('the maximum of a slice retains the actual lower height imposed by different frozen inputs',()=>{
    const other=evaluateBranches(model,{...state.controls,s2:.6}),surface=sampleActiveLagrangianSurface(other,{steps:4});
    const point=[...surface.diagnostic.referencePoint];point[ix('1-2')]=diagnostic.witnessPoint[ix('1-2')];point[ix('2-3')]=diagnostic.witnessPoint[ix('2-3')];
    close(surface.peak.z,evaluateActiveLagrangianPoint(diagnostic,point).lagrangian);
    assert.ok(surface.peak.z<upper-1e-5);
    assert.equal(surface.peak.attainsGlobalBound,false);assert.equal(surface.peak.feasible,false);
    assert.ok(surface.peak.gradient.every(value=>Math.abs(value)<1e-12));
    close(surface.markers[0].z,other.production);
    assert.equal(surface.frozen.find(variable=>variable.key==='x_2_8').value,other.branches.find(branch=>branch.id==='2-8').input);
});

test('kinks are explicitly undefined and endpoint derivatives are one-sided without clamping',()=>{
    for(const branch of model.branches) {
        const point=[...diagnostic.referencePoint],index=ix(branch.id);point[index]=branch.b;
        const inspected=evaluateActiveLagrangianPoint(diagnostic,point);
        assert.equal(inspected.gradient[index],null);assert.equal(inspected.hessian[index][index],null);
        assert.equal(inspected.derivativeDetails[index].kink,true);
    }
    const surface=sampleActiveLagrangianSurface(state,{x:'2-3',y:'2-8',radius:.3,steps:7});
    const point=surface.points.flat().find(item=>item.x===.001&&item.y===surface.markers[0].y);
    assert.ok(point);assert.equal(point.gradient[0],null);
    const atZero=surface.points.flat().find(item=>item.x===0&&item.y===surface.markers[0].y);
    assert.equal(atZero.derivativeSides[0],'right');close(atZero.gradient[0],-.41);
});

test('changed laws, forged states, invalid boxes and unsupported axes cannot reuse the analytic certificate',()=>{
    const changed=createActiveBranchesScenario();changed.branches[0].c-=.0001;
    assert.equal(explainActiveLagrangian(evaluateBranches(changed)).available,false);
    const forged=structuredClone(state);forged.branches[0].output+=.001;
    assert.equal(explainActiveLagrangian(forged).available,false);
    const reversed=structuredClone(state);reversed.branches.reverse();
    assert.equal(explainActiveLagrangian(reversed).available,true);
    assert.equal(explainActiveLagrangian({feasible:false}).available,false);
    for(const point of [[],Array(24).fill(NaN),[-.01,...diagnostic.referencePoint.slice(1)],[1.01,...diagnostic.referencePoint.slice(1)]])assert.throws(()=>evaluateActiveLagrangianPoint(diagnostic,point));
    assert.throws(()=>evaluateActiveLagrangianPoint({available:false},diagnostic.referencePoint));
    for(const options of [{x:'1-5'},{x:'1-2',y:'1-2'},{radius:0},{radius:NaN},{steps:61},{steps:2.5}])assert.throws(()=>sampleActiveLagrangianSurface(state,options));
});
