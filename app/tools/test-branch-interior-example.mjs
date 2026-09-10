import assert from 'node:assert/strict';
import test from 'node:test';
import { createInteriorPeakScenario, isInteriorPeakModel, INTERIOR_PEAK_ANALYTICS } from '../public/scripts/branch-interior-example.mjs';
import { BRANCH_GRAPH, branchProductionRate, createBranchesScenario, evaluateBranches, optimiseBranchesGlobal, searchBranchesGrid } from '../public/scripts/branches-engine.mjs';

const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const model = createInteriorPeakScenario();
const optimum = 7 / 32;
const atFlows = (u, v) => {
    const A = branchProductionRate(u, model.branches.find(branch => branch.id === '1-2'));
    assert.ok(v >= 0 && v <= A);
    return evaluateBranches(model, { ...model.initialControls, s1: u, s2: A > 0 ? v / A : model.initialControls.s2 });
};
const branch = (state, id) => state.branches.find(item => item.id === id);

function checkBalances(state) {
    assert.equal(state.feasible, true);
    for (const node of BRANCH_GRAPH.nodes) {
        const incoming = state.branches.filter(edge => edge.to === node.id).reduce((sum, edge) => sum + edge.output, 0);
        const outgoing = state.branches.filter(edge => edge.from === node.id).reduce((sum, edge) => sum + edge.input, 0);
        if (node.id === '1') close(outgoing, 1);
        else {
            close(state.available[node.id], incoming);
            if (node.id !== '8') close(outgoing, incoming);
        }
    }
    for (const edge of state.branches) assert.ok(edge.output >= 0 && edge.output <= edge.input + 1e-14);
    close(state.production, branch(state, '2-8').output + branch(state, '4-8').output + branch(state, '6-8').output);
    close(1 - state.production, state.branches.reduce((sum, edge) => sum + edge.input - edge.output, 0));
}

test('interior example keeps the twelve arcs and valid independent laws without changing the default', () => {
    assert.deepEqual(model.branches.map(edge => edge.id), BRANCH_GRAPH.edges.map(edge => edge.id));
    assert.equal(model.source, 1);
    for (const edge of model.branches) {
        assert.ok(edge.a >= 0 && edge.a < edge.b && edge.b < 1);
        assert.ok(edge.d >= 0 && edge.d <= edge.c && edge.c <= 1);
    }
    const another = createInteriorPeakScenario();
    another.branches[0].c = .5; another.initialControls.s1 = .1;
    assert.equal(model.branches[0].c, .9); assert.equal(model.initialControls.s1, .5);
    assert.equal(another.branches.find(edge => edge.id === '2-3').c, .99);
    assert.deepEqual(createBranchesScenario().branches[0], { ...BRANCH_GRAPH.edges[0], a: .3, b: .8, c: .9, d: .6 });
});

test('model recognition requires exact source, topology and laws but permits reordered branches and other starts', () => {
    assert.equal(isInteriorPeakModel(model), true);
    assert.equal(isInteriorPeakModel({ ...model, branches: model.branches.toReversed(), initialControls: { ...model.initialControls, s3: .2 } }), true);
    assert.equal(isInteriorPeakModel(createBranchesScenario()), false);
    for (const invalid of [null, {}, { ...model, source: .9 }, { ...model, branches: model.branches.slice(1) },
        { ...model, branches: model.branches.map((edge, i) => i ? edge : { ...edge, c: .9000000000000001 }) },
        { ...model, branches: model.branches.map((edge, i) => i ? edge : { ...edge, to: '5' }) },
        { ...model, branches: model.branches.map((edge, i) => i ? edge : model.branches[1]) },
        { ...model, branches: model.branches.map((edge, i) => i ? edge : null) }]) assert.equal(isInteriorPeakModel(invalid), false);
});

test('analytical metadata is immutable and identifies a slice rather than a unique five-share optimum', () => {
    close(INTERIOR_PEAK_ANALYTICS.point.production, optimum);
    assert.deepEqual(INTERIOR_PEAK_ANALYTICS.hessian, [[-1.5, 0], [0, -4]]);
    assert.match(INTERIOR_PEAK_ANALYTICS.localConditions, /s3=1/);
    assert.match(INTERIOR_PEAK_ANALYTICS.interpretation, /pas identifiées/);
    assert.throws(() => { INTERIOR_PEAK_ANALYTICS.point.u = 1; }, TypeError);
    assert.throws(() => { INTERIOR_PEAK_ANALYTICS.hessian[0][0] = 0; }, TypeError);
});

test('actual transfers attain the analytic optimum on the reference path and split', () => {
    const state = evaluateBranches(model);
    checkBalances(state);
    close(branch(state, '1-2').input, .5); close(branch(state, '1-2').output, .25);
    close(branch(state, '1-5').input, .5); assert.equal(branch(state, '1-5').output, 0);
    close(branch(state, '2-3').input, .125); close(branch(state, '2-8').input, .125);
    for (const id of ['2-3', '2-8', '3-4', '4-8']) close(branch(state, id).output, .109375);
    close(state.production, optimum);
    assert.ok(.125 > .01 && .109375 > .001);
});

test('the parabolic majorants bound both regimes of p and q independently', () => {
    for (const id of ['1-2', '2-3', '2-8']) {
        const law = model.branches.find(edge => edge.id === id);
        for (let i = 0; i <= 1000; i += 1) {
            const x = i / 1000, actual = branchProductionRate(x, law), bound = x * (1 - x);
            assert.ok(actual <= bound + 2e-14);
            if (x <= law.b) close(bound - actual, x * (1 - x / law.b), 2e-14);
            else close(actual, bound, 2e-14);
            assert.ok(bound <= .25);
        }
    }
});

test('the completed-square network bound holds across all five controls', () => {
    for (const s1 of [0, .05, .1, .25, .5, .75, 1]) for (const s2 of [0, .25, .5, .75, 1])
        for (const s3 of [0, .1, .5, 1]) for (const s5 of [0, .5, 1]) for (const s7 of [0, .5, 1]) {
            const state = evaluateBranches(model, { s1, s2, s3, s5, s7 });
            const A = branch(state, '1-2').output, v = branch(state, '2-3').input;
            const bound = A - A * A / 2 - 2 * (v - A / 2) ** 2;
            assert.ok(state.production <= bound + 1e-13);
            assert.ok(bound <= optimum + 1e-13);
            checkBalances(state);
        }
});

test('downstream identity thresholds can reduce output but never invalidate the upper bound', () => {
    const identity = model.branches.find(edge => edge.id === '3-4');
    for (const x of [0, .00025, .0005, .001, .01, .109375, 1]) {
        const y = branchProductionRate(x, identity);
        assert.ok(y <= x);
        if (x >= .001) close(y, x);
    }
    close(branchProductionRate(.0005, identity), .00025);
    assert.equal(evaluateBranches(model, { ...model.initialControls, s1: 0 }).production, 0);
    assert.equal(evaluateBranches(model, { ...model.initialControls, s1: 1 }).production, 0);
});

test('a whole local window has the exact smooth formula and a strict isolated maximum in u and v', () => {
    for (const du of [-.1, -.03, -.01, 0, .01, .03, .1]) for (const dv of [-.1, -.03, -.01, 0, .01, .03, .1]) {
        const u = .5 + du, v = .125 + dv, A = u * (1 - u), state = atFlows(u, v);
        assert.ok(u > .1 && v > .01 && A - v > .01);
        assert.ok(v * (1 - v) > .001);
        close(state.production, A - v * v - (A - v) ** 2);
        if (du || dv) assert.ok(state.production < optimum);
    }
});

test('centered differences independently recover a zero gradient and negative definite Hessian', () => {
    const u = .5, v = .125, h = 1e-4, value = (x, y) => atFlows(x, y).production;
    const center = value(u, v);
    close((value(u + h, v) - value(u - h, v)) / (2 * h), 0, 1e-9);
    close((value(u, v + h) - value(u, v - h)) / (2 * h), 0, 1e-9);
    const Huu = (value(u + h, v) - 2 * center + value(u - h, v)) / (h * h);
    const Hvv = (value(u, v + h) - 2 * center + value(u, v - h)) / (h * h);
    const Huv = (value(u + h, v + h) - value(u + h, v - h) - value(u - h, v + h) + value(u - h, v - h)) / (4 * h * h);
    close(Huu, -1.5, 2e-6); close(Hvv, -4, 2e-6); close(Huv, 0, 2e-6);
    assert.ok(Huu < 0 && Huu * Hvv - Huv * Huv > 0);
});

test('the unchanged global solver certifies the new example from its own relaxation records', () => {
    const result = optimiseBranchesGlobal(model, { maxNodes: 10000, tolerance: 1e-7 });
    assert.equal(result.status, 'certified');
    close(result.best.production, optimum);
    assert.ok(result.processedNodes > 0 && result.certificates.records.length > 0);
    assert.ok(result.upperBound >= optimum - 1e-12 && result.gap <= 1e-7);
    checkBalances(result.best);
});

test('an exhaustive tenth-step grid contains the same u,v peak despite nonunique downstream fractions', () => {
    const result = searchBranchesGrid(model, { divisions: 10, maxEvaluations: 200000 });
    assert.equal(result.status, 'complete'); assert.equal(result.evaluated, 161051);
    close(result.best.production, optimum);
    close(result.best.controls.s1, .5); close(result.best.controls.s2, .5);
    close(branch(result.best, '2-3').input, .125);
    checkBalances(result.best);
});

test('a zero-node budget keeps the feasible optimum as a candidate without borrowing its analytical certificate', () => {
    const result = optimiseBranchesGlobal(model, { maxNodes: 0 });
    close(result.best.production, optimum);
    assert.equal(result.processedNodes, 0);
    assert.equal(result.status, 'node-limit');
    assert.ok(result.upperBound > optimum && result.gap > result.tolerance);
    assert.equal(result.certificates.records.length, 0);
});
