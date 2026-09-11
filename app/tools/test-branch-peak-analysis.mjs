import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteriorPeakScenario } from '../public/scripts/branch-interior-example.mjs';
import { createBranchesScenario, evaluateBranches, optimiseBranchesGlobal } from '../public/scripts/branches-engine.mjs';
import { describeInteriorPeakModel, analyseInteriorPeakSurface } from '../public/scripts/branch-peak-analysis.mjs';

const model = createInteriorPeakScenario();
const state = (controls = {}) => evaluateBranches(model, { ...model.initialControls, ...controls });
const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
const edge = (value, id) => value.branches.find(item => item.id === id);
function flowState(u, v, frozen = {}) {
    const A = edge(state({ s1: u }), '1-2').output;
    return state({ ...frozen, s1: u, s2: v / A });
}
function finiteDifferences(fn, x, y, h = 1e-4) {
    const center = fn(x, y), xp = fn(x + h, y), xm = fn(x - h, y), yp = fn(x, y + h), ym = fn(x, y - h);
    const xy = (fn(x + h, y + h) - fn(x + h, y - h) - fn(x - h, y + h) + fn(x - h, y - h)) / (4 * h * h);
    return { gradient: [(xp - xm) / (2 * h), (yp - ym) / (2 * h)],
        hessian: [[(xp - 2 * center + xm) / h ** 2, xy], [xy, (yp - 2 * center + ym) / h ** 2]] };
}
function compareDerivatives(analysis, numerical) {
    assert.equal(analysis.current.smooth, true);
    analysis.gradient.forEach((item, i) => close(item, numerical.gradient[i], 5e-8));
    analysis.hessian.forEach((row, i) => row.forEach((item, j) => close(item, numerical.hessian[i][j], 2e-6)));
}

test('the canonical witness exposes twelve exact laws, integral splits, physical flows and losses', () => {
    const witness = describeInteriorPeakModel(model);
    assert.equal(witness.available, true); assert.equal(witness.branches.length, 12);
    assert.deepEqual(witness.controls, model.initialControls);
    close(witness.production, 7 / 32); close(witness.loss, 25 / 32);
    for (const branch of model.branches) {
        assert.deepEqual(witness.branches.find(item => item.id === branch.id), branch);
        const flow = witness.flows.find(item => item.id === branch.id);
        close(flow.output, flow.input * flow.coefficient);
        assert.ok(flow.output >= 0 && flow.output <= flow.input);
    }
    for (const id of ['1', '2', '5', '3', '7', '4', '6']) {
        const outgoing = witness.flows.filter(item => item.from === id).reduce((sum, item) => sum + item.input, 0);
        close(outgoing, witness.availableAtNodes[id]);
    }
    close(witness.availableAtNodes['2'], .25);
    const altered = describeInteriorPeakModel(model); altered.branches[0].c = .2; altered.controls.s1 = 0;
    assert.equal(model.branches[0].c, .9); assert.equal(witness.controls.s1, .5);
});

test('exact model recognition declines the original model, modified laws and malformed states', () => {
    assert.equal(describeInteriorPeakModel(createBranchesScenario()).available, false);
    assert.equal(analyseInteriorPeakSurface(evaluateBranches(createBranchesScenario())).reason, 'different-model');
    for (const invalid of [null, {}, { feasible: true, branches: [null] }]) {
        assert.equal(analyseInteriorPeakSurface(invalid).available, false);
    }
    const modified = state(); modified.branches[0].parameters.c += 1e-15;
    assert.equal(analyseInteriorPeakSurface(modified).reason, 'different-model');
    const invalidControls = state(); invalidControls.controls.s1 = 2;
    assert.equal(analyseInteriorPeakSurface(invalidControls).reason, 'invalid-controls');
    assert.equal(analyseInteriorPeakSurface(state(), { mode: 'lagrangian' }).reason, 'unsupported-mode');
    assert.equal(analyseInteriorPeakSurface(state(), { mode: 'yield', x: 's1', y: 's1' }).reason, 'invalid-axes');
});

test('reference outputs are recomputed and reordered branches are accepted without changing the input', () => {
    const input = state(); input.production = 99; input.available['2'] = 50;
    input.branches.forEach(item => { item.input = 33; item.output = 42; });
    input.branches.reverse(); const snapshot = JSON.stringify(input);
    const result = analyseInteriorPeakSurface(input);
    close(result.current.z, 7 / 32); close(result.current.x, .5); close(result.current.y, .125);
    assert.equal(JSON.stringify(input), snapshot);
});

test('flow coordinates give the exact stationary point and negative definite Hessian', () => {
    const result = analyseInteriorPeakSurface(state());
    assert.equal(result.available, true); assert.equal(result.reason, null);
    assert.deepEqual(result.gradient, [0, 0]); assert.deepEqual(result.hessian, [[-1.5, 0], [0, -4]]);
    assert.equal(result.current.stationary, true); assert.equal(result.current.negativeDefinite, true);
    assert.equal(result.peak.isolatedInSlice, true); assert.equal(result.peak.attained, true);
    close(result.peak.x, .5); close(result.peak.y, .125); close(result.peak.z, 7 / 32);
    assert.deepEqual(result.frozen.map(item => item.key), ['s3', 's5', 's7']);
});

test('fraction coordinates give their different curvature, with derivatives in the displayed order', () => {
    const result = analyseInteriorPeakSurface(state(), { mode: 'yield' });
    assert.deepEqual(result.gradient, [0, 0]); assert.deepEqual(result.hessian, [[-1.5, 0], [0, -.25]]);
    close(result.peak.x, .5); close(result.peak.y, .5);
    const inverse = analyseInteriorPeakSurface(state(), { mode: 'yield', x: 's2', y: 's1' });
    assert.deepEqual(inverse.hessian, [[-.25, 0], [0, -1.5]]);
    assert.match(inverse.summary, /axes inversés/);
});

test('flow derivatives agree with centered differences of the full network, at and away from the peak', () => {
    for (const [u, v] of [[.5, .125], [.43, .08], [.58, .18]]) {
        const result = analyseInteriorPeakSurface(flowState(u, v));
        compareDerivatives(result, finiteDifferences((x, y) => flowState(x, y).production, u, v));
        close(result.current.z, result.current.formulaValue);
    }
});

test('fraction derivatives and nonzero mixed derivatives agree with full-network finite differences', () => {
    for (const [s1, s2] of [[.5, .5], [.43, .32], [.58, .72]]) {
        const result = analyseInteriorPeakSurface(state({ s1, s2 }), { mode: 'yield' });
        compareDerivatives(result, finiteDifferences((s, t) => state({ s1: s, s2: t }).production, s1, s2));
        close(result.current.z, result.current.formulaValue);
    }
});

test('reversing either physical pair permutes the point, gradient and both Hessian indices', () => {
    for (const mode of ['flows', 'yield']) {
        const current = mode === 'flows' ? flowState(.43, .08) : state({ s1: .43, s2: .32 });
        const canonical = mode === 'flows' ? ['x12', 'x23'] : ['s1', 's2'];
        const first = analyseInteriorPeakSurface(current, { mode });
        const reversed = analyseInteriorPeakSurface(current, { mode, x: canonical[1], y: canonical[0] });
        close(first.current.x, reversed.current.y); close(first.current.y, reversed.current.x);
        assert.deepEqual(reversed.gradient, first.gradient.toReversed());
        assert.deepEqual(reversed.hessian, first.hessian.toReversed().map(row => row.toReversed()));
        close(first.peak.x, reversed.peak.y); close(first.peak.y, reversed.peak.x);
    }
});

test('a local formula is withheld below any source or secondary parabolic threshold', () => {
    for (const current of [state({ s1: .05 }), state({ s2: .01 }), state({ s2: .99 })]) {
        const result = analyseInteriorPeakSurface(current);
        assert.equal(result.current.formulaValid, false); assert.equal(result.current.smooth, false);
        assert.equal(result.gradient, null); assert.equal(result.hessian, null);
        assert.equal(result.current.formulaValue, null); assert.equal(result.peak.attained, true);
        close(result.current.z, current.production);
    }
});

test('a threshold equality permits the formula value but does not claim a smooth physical Hessian', () => {
    const result = analyseInteriorPeakSurface(state({ s1: .1 }));
    assert.equal(result.current.formulaValid, true); assert.equal(result.current.smooth, false);
    assert.equal(result.reason, 'threshold-or-boundary'); assert.equal(result.hessian, null);
    close(result.current.formulaValue, result.current.z);
    const boundary = analyseInteriorPeakSurface(state({ s2: 0 }));
    assert.equal(boundary.current.smooth, false); assert.equal(boundary.gradient, null);
});

test('downstream identity is checked at the actual point and separately at the peak', () => {
    for (const s3 of [0, .5, .8, 1]) {
        const result = analyseInteriorPeakSurface(state({ s3 }));
        assert.equal(result.current.smooth, true); assert.equal(result.peak.isolatedInSlice, true);
        close(result.current.z, 7 / 32);
    }
    const loss = analyseInteriorPeakSurface(state({ s3: .001 }));
    assert.equal(loss.current.formulaValid, false); assert.equal(loss.gradient, null);
    assert.equal(loss.peak.attained, false); assert.equal(loss.peak.isolatedInSlice, false);
    assert.ok(loss.peak.z < 7 / 32);
    const localLoss = analyseInteriorPeakSurface(flowState(.5, .011, { s3: .01 }));
    assert.equal(localLoss.current.smooth, false); assert.equal(localLoss.peak.isolatedInSlice, true);
});

test('lossless downstream splits preserve the local formula and its derivatives throughout the displayed window', () => {
    for (const s3 of [0, .25, .5, .8, 1]) for (const u of [.4, .5, .6]) for (const v of [.025, .125, .225]) {
        const result = analyseInteriorPeakSurface(flowState(u, v, { s3, s5: .9, s7: .2 }));
        assert.equal(result.current.smooth, true);
        close(result.current.z, result.current.formulaValue);
    }
});

test('other split pairs explain inactive directions or downstream thresholds rather than invent a Hessian', () => {
    const inactive = analyseInteriorPeakSurface(state(), { mode: 'yield', x: 's5', y: 's2' });
    assert.equal(inactive.reason, 'other-split-pair'); assert.deepEqual(inactive.inactiveAxes, ['s5']);
    assert.equal(inactive.hessian, null); assert.equal(inactive.peak, null);
    for (const s5 of [0, .1, .7, 1]) close(state({ s5 }).production, inactive.current.z);
    const downstream = analyseInteriorPeakSurface(state({ s3: 0 }), { mode: 'yield', x: 's1', y: 's3' });
    assert.equal(downstream.reason, 'other-split-pair'); assert.match(downstream.summary, /maximum de frontière/);
    assert.ok(state({ s3: .001 }).production < state({ s3: 0 }).production);
    close(state({ s3: .1 }).production, state({ s3: 0 }).production);
});

test('the analytical peak agrees with the unchanged global solver and its independent bound', () => {
    const global = optimiseBranchesGlobal(model, { maxNodes: 10000, tolerance: 1e-7 });
    assert.equal(global.status, 'certified'); assert.ok(global.processedNodes > 0);
    const result = analyseInteriorPeakSurface(global.best);
    close(global.best.production, result.peak.expectedProduction);
    assert.ok(global.upperBound >= 7 / 32 - 1e-12 && global.gap <= 1e-7);
    assert.equal(result.peak.isolatedInSlice, true);
    const unknown = optimiseBranchesGlobal(model, { maxNodes: 0 });
    assert.equal(unknown.status, 'node-limit'); assert.ok(unknown.upperBound > 7 / 32);
});
