import assert from 'node:assert/strict';
import test from 'node:test';
import {createBranchesScenario,evaluateBranches,branchProductionRate} from '../public/scripts/branches-engine.mjs';
import {createActiveBranchesScenario} from '../public/scripts/branch-active-example.mjs';
import {certifySmoothWitness,boundBranchPotential} from '../public/scripts/branches-smooth-certificate.mjs';

const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const active=createActiveBranchesScenario(),witness=evaluateBranches(active);

test('computed potentials close the active witness using a global numerical supremum rather than preset multipliers',()=>{
    const result=certifySmoothWitness(active,witness);
    assert.equal(result.available,true);assert.equal(result.status,'certified');
    [.35,.41,.44,.48,.41,.48,.44,1].forEach((value,i)=>close(result.potentials[i],value));
    close(result.production,.447553125);
    assert.ok(result.upperBound>=result.production);
    assert.ok(result.gap<1e-8);
    assert.ok(result.certificate.numericalMargin>0);
    close(result.upperBound,result.certificate.rawUpperBound+result.certificate.numericalMargin);
    assert.ok(result.residuals.stationarity<1e-12);
    assert.ok(result.residuals.lagrangianIdentity<1e-12);
    assert.equal(result.leastSquares.rank,7);
    assert.equal(result.leastSquares.A.length,12);
    assert.equal(result.terms.length,12);
    assert.match(result.certificate.provenance,/aucun preset/);
    const tight=certifySmoothWitness(active,witness,{tolerance:1e-12});
    assert.equal(tight.status,'unresolved');
    assert.ok(tight.gap>tight.tolerance);
});

test('the QR trace reproduces the raw and weighted stationarity residuals',()=>{
    const result=certifySmoothWitness(active,evaluateBranches(active,{...active.initialControls,s2:.6}));
    assert.equal(result.available,true);assert.equal(result.status,'unresolved');
    assert.ok(result.production<witness.production);
    assert.ok(result.upperBound>=witness.production);
    assert.ok(result.residuals.stationarity>1e-3);
    const {A,b,rowScales,scaledA,scaledB,columnPermutation}=result.leastSquares;
    assert.equal(new Set(columnPermutation).size,7);
    A.forEach((row,i)=>{
        const residual=row.reduce((sum,value,j)=>sum+value*result.potentials[j],0)-b[i];
        close(residual,result.residuals.stationarityVector[i]);
        row.forEach((value,j)=>close(scaledA[i][j],value/rowScales[i]));
        close(scaledB[i],b[i]/rowScales[i]);
    });
    assert.ok(result.gap>1e-4);
});

test('piecewise suprema handle concave, linear and negatively weighted convex portions',()=>{
    let result=boundBranchPotential({a:0,b:.2,c:1,d:0},{sourcePotential:0,destinationPotential:1});
    close(result.rawMaximum,.3125);assert.ok(result.maximizers.includes(.5));
    result=boundBranchPotential({a:0,b:.2,c:1,d:1},{sourcePotential:-.4,destinationPotential:-1});
    close(result.rawMaximum,.008);assert.ok(result.maximizers.some(x=>Math.abs(x-.04)<1e-12));
    assert.ok(result.pieces[1].weightedA<0);
    result=boundBranchPotential({a:.2,b:.8,c:.7,d:.4},{sourcePotential:-.1,destinationPotential:-1});
    close(result.rawMaximum,.02);assert.ok(result.maximizers.includes(.2));
    result=boundBranchPotential({a:.2,b:.8,c:.7,d:.4},{sourcePotential:-1,destinationPotential:0});
    close(result.rawMaximum,1);
    result=boundBranchPotential({a:.2,b:.8,c:.7,d:.4},{sourcePotential:1,destinationPotential:0});
    close(result.rawMaximum,0);
});

test('bounds dominate an independent dense oracle for varied laws and potentials of both signs',()=>{
    let seed=39501;
    const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let sample=0;sample<60;sample++) {
        const a=.65*random(),b=a+.03+(1-a-.04)*random(),c=.05+.95*random(),d=c*random();
        const parameters={a,b,c,d},sourcePotential=6*random()-3,destinationPotential=6*random()-3;
        const result=boundBranchPotential(parameters,{sourcePotential,destinationPotential});
        let dense=-Infinity;
        for(let k=0;k<=2000;k++) {
            const x=k/2000,value=destinationPotential*branchProductionRate(x,parameters)-sourcePotential*x;
            dense=Math.max(dense,value);
            assert.ok(value<=result.upperBound,`${value} exceeds ${result.upperBound}`);
        }
        assert.ok(result.rawMaximum>=dense-1e-12);
        assert.ok(result.numericalMargin>0);
        for(const piece of result.pieces)for(const candidate of piece.candidates) {
            assert.ok(candidate.x>=piece.lower&&candidate.x<=piece.upper);
            close(candidate.value,destinationPotential*branchProductionRate(candidate.x,parameters)-sourcePotential*candidate.x);
        }
    }
});

test('different linear laws provide a valid but unresolved bound at a nonoptimal interior point',()=>{
    const model=createBranchesScenario();model.branches.forEach(branch=>Object.assign(branch,{a:0,b:.001,c:.8,d:.8}));
    const state=evaluateBranches(model),improved=evaluateBranches(model,{...model.initialControls,s2:.4});
    assert.ok(improved.production>state.production+1e-4);
    const result=certifySmoothWitness(model,state);
    assert.equal(result.available,true);assert.equal(result.status,'unresolved');
    assert.ok(result.upperBound>=improved.production);
    assert.ok(result.gap>1e-4);
    assert.ok(result.terms.some(term=>term.pieces.some(piece=>piece.weightedA===0)));
});

test('certificates computed for varied models dominate independent feasible configurations',()=>{
    let seed=27501;
    const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
    for(let sample=0;sample<15;sample++) {
        const model=createBranchesScenario();
        model.branches.forEach(branch=>{const c=.75+.2*random();Object.assign(branch,{a:0,b:.002+.008*random(),c,d:.65+(c-.65)*random()});});
        const state=evaluateBranches(model),result=certifySmoothWitness(model,state);
        assert.equal(result.available,true);
        for(let trial=0;trial<20;trial++) {
            const controls=Object.fromEntries(['s1','s2','s5','s3','s7'].map(key=>[key,random()]));
            const other=evaluateBranches(model,controls);
            assert.ok(other.production<=result.upperBound+1e-12);
        }
        close(result.certificate.constant+result.terms.reduce((sum,term)=>sum+term.rawMaximum,0),result.certificate.rawUpperBound);
    }
});

test('a changed model or inconsistent snapshot cannot reuse a witness and reversed branch ordering is harmless',()=>{
    const changed=structuredClone(active);changed.branches[0].c-=.001;
    const mismatch=certifySmoothWitness(changed,witness);
    assert.equal(mismatch.available,false);assert.equal(mismatch.reason,'model-witness-mismatch');
    const forged=structuredClone(witness);forged.branches[0].output+=.01;
    assert.equal(certifySmoothWitness(active,forged).available,false);
    const reversedModel=structuredClone(active),reversedState=structuredClone(witness);reversedModel.branches.reverse();reversedState.branches.reverse();
    const original=certifySmoothWitness(active,witness),reversed=certifySmoothWitness(reversedModel,reversedState);
    assert.equal(reversed.status,'certified');close(reversed.upperBound,original.upperBound);
});

test('boundary and nonsmooth witnesses are rejected instead of receiving fabricated derivatives',()=>{
    const boundary=evaluateBranches(active,{...active.initialControls,s2:0});
    assert.equal(certifySmoothWitness(active,boundary).reason,'witness-not-interior');
    const atKink=structuredClone(active);atKink.branches.find(branch=>branch.id==='1-2').b=.5;
    const result=certifySmoothWitness(atKink,evaluateBranches(atKink));
    assert.equal(result.available,false);assert.equal(result.reason,'witness-at-kink');
    assert.equal(certifySmoothWitness(active,{feasible:false}).available,false);
    for(const tolerance of [0,-1,NaN,Infinity])assert.throws(()=>certifySmoothWitness(active,witness,{tolerance}));
    assert.throws(()=>boundBranchPotential({a:.5,b:.2,c:1,d:0},{sourcePotential:0,destinationPotential:1}));
    assert.throws(()=>boundBranchPotential({a:0,b:.2,c:1,d:0},{sourcePotential:NaN,destinationPotential:1}));
});
