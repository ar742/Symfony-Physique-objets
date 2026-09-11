import test from 'node:test';
import assert from 'node:assert/strict';
import { optimiseBranchesStudy } from '../public/scripts/branches-global-study.mjs';
import { createActiveBranchesScenario } from '../public/scripts/branch-active-example.mjs';
import { createInteriorPeakScenario } from '../public/scripts/branch-interior-example.mjs';
import { createBranchesScenario, evaluateBranches, optimiseBranchesGlobal, branchesProblemSignature } from '../public/scripts/branches-engine.mjs';

const active = createActiveBranchesScenario(), target = 143217 / 320000;
const close = (x, y, tol = 1e-12) => assert.ok(Math.abs(x - y) <= tol, `${x} != ${y}`);
const boxesOf = model => Object.fromEntries(model.branches.map(edge => [edge.id,
    Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, [edge[key], edge[key]]]))]));

test('the active model is certified with computed potentials and no preset certificate or LP record', () => {
    const result = optimiseBranchesStudy(active);
    assert.equal(result.status, 'certified'); assert.equal(result.globalMethod, 'smooth-witness-lagrangian');
    assert.equal(result.complete, true); assert.equal(result.processedNodes, 0); assert.equal(result.openNodes, 0);
    close(result.best.production, target); assert.ok(result.upperBound >= target && result.gap <= result.tolerance);
    assert.deepEqual(result.certificates.records, []); assert.deepEqual(result.certificates.frontier, []);
    assert.equal(result.certificates.unresolved, 0); close(result.certificates.closedUpper, result.upperBound);
    assert.equal(result.certificates.smoothWitness.certificate.type, 'computed-smooth-witness-nlp');
    assert.equal(result.certificates.smoothWitness.leastSquares.method, 'column-pivoted-householder-qr');
    assert.equal(result.certificates.problemSignature, branchesProblemSignature(active));
});

test('a zero LP budget permits the computed dual check, and progress reports the complete result once', () => {
    const events = [], snapshot = JSON.stringify(active);
    const result = optimiseBranchesStudy(active, { maxNodes: 0, onProgress: state => events.push(state) });
    assert.equal(result.status, 'certified'); assert.equal(result.processedNodes, 0);
    assert.equal(events.length, 1); assert.equal(events[0], result);
    assert.equal(JSON.stringify(active), snapshot);
});

test('an immediate cancellation prevents the dual check, also with a zero LP budget', () => {
    for (const maxNodes of [0, 10000]) {
        const events = [], result = optimiseBranchesStudy(active, { maxNodes, shouldCancel: () => true, onProgress: event => events.push(event) });
        assert.equal(result.status, 'cancelled'); assert.equal(result.complete, false); assert.equal(result.processedNodes, 0);
        assert.equal(result.certificates.smoothWitness, undefined); assert.equal(events.length, 1);
    }
});

test('a cancellation requested during preparation wins over a potential fast certificate', () => {
    let checks = 0;
    const result = optimiseBranchesStudy(active, { shouldCancel: () => ++checks >= 2 });
    assert.equal(result.status, 'cancelled'); assert.equal(result.processedNodes, 0);
    assert.equal(result.certificates.smoothWitness, undefined);
});

test('the previous interior example keeps actual spatial LP records and its original result', () => {
    const model = createInteriorPeakScenario(), result = optimiseBranchesStudy(model), spatial = optimiseBranchesGlobal(model);
    assert.deepEqual(result, spatial); assert.equal(result.status, 'certified');
    assert.ok(result.processedNodes > 0 && result.certificates.records.some(record => record.lpPoint));
    assert.equal(result.certificates.smoothWitness, undefined);
});

test('a changed initial point is respected and a local residual does not fake certification', () => {
    const initialControls = { ...active.initialControls, s5: .3 };
    const result = optimiseBranchesStudy(active, { initialControls, maxNodes: 0 });
    assert.deepEqual(result.best.controls, initialControls);
    close(result.best.production, evaluateBranches(active, initialControls).production);
    assert.equal(result.status, 'node-limit'); assert.equal(result.certificates.smoothWitness, undefined);
    const model = { ...active, initialControls };
    assert.deepEqual(optimiseBranchesStudy(model, { maxNodes: 0 }).best.controls, initialControls);
});

test('changed laws are evaluated as their own problem, without borrowing the active example bound', () => {
    const model = createActiveBranchesScenario(); model.branches.find(edge => edge.id === '2-8').d = .25;
    const result = optimiseBranchesStudy(model, { maxNodes: 0 });
    assert.equal(result.status, 'node-limit'); assert.equal(result.certificates.smoothWitness, undefined);
    assert.equal(result.certificates.problemSignature, branchesProblemSignature(model));
    assert.ok(result.best.production > target);
});

test('expanded boxes never receive the fixed-law dual certificate even when their midpoint is the active model', () => {
    const boxes = boxesOf(active), edge = active.branches.find(edge => edge.id === '2-8');
    boxes['2-8'].d = [edge.d - .01, edge.d + .01];
    const result = optimiseBranchesStudy(active, { parameterBoxes: boxes, maxNodes: 0 });
    assert.equal(result.parameterMode, 'bounded'); assert.equal(result.status, 'node-limit');
    assert.equal(result.certificates.smoothWitness, undefined);
    assert.equal(result.certificates.problemSignature, branchesProblemSignature(active, { parameterBoxes: boxes }));
});

test('singleton boxes can certify their effective active laws, even if the nominal model is different', () => {
    const boxes = boxesOf(active), nominal = createBranchesScenario();
    const result = optimiseBranchesStudy(nominal, { parameterBoxes: boxes, initialControls: active.initialControls, maxNodes: 0 });
    assert.equal(result.status, 'certified'); assert.equal(result.parameterMode, 'bounded');
    assert.equal(result.globalMethod, 'smooth-witness-lagrangian'); close(result.best.production, target);
    for (const edge of result.best.branches) for (const key of ['a', 'b', 'c', 'd']) close(edge.parameters[key], boxes[edge.id][key][0]);
    assert.equal(result.certificates.problemSignature, branchesProblemSignature(nominal, { parameterBoxes: boxes }));
});

test('invalid option shapes, overridden budgets and callbacks are rejected rather than masked by preparation', () => {
    for (const options of [null, [], 5, { maxNodes: -1 }, { maxNodes: 1.5 }, { maxNodes: Infinity }, { maxNodes: 1000001 },
        { onProgress: true }, { onProgress: null }, { shouldCancel: true }, { unexpected: 1 }]) assert.throws(() => optimiseBranchesStudy(active, options));
});

test('invalid model and controls still use the engines validation and never become a certificate', () => {
    for (const model of [null, { ...active, source: .9 }, { ...active, branches: active.branches.slice(1) }]) assert.throws(() => optimiseBranchesStudy(model));
    for (const initialControls of [{}, { ...active.initialControls, s5: -1 }, { ...active.initialControls, s1: NaN }])
        assert.throws(() => optimiseBranchesStudy(active, { initialControls }));
});

test('invalid tolerances and parameter boxes are rejected before any progress result', () => {
    const badBox = boxesOf(active); badBox['1-2'].a = [.01, .01];
    for (const options of [{ tolerance: 0 }, { tolerance: NaN }, { tolerance: .01 }, { parameterBoxes: {} }, { parameterBoxes: badBox }]) {
        const events = [];
        assert.throws(() => optimiseBranchesStudy(active, { ...options, onProgress: event => events.push(event) }));
        assert.deepEqual(events, []);
    }
});
