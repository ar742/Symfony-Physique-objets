import assert from 'node:assert/strict';
import test from 'node:test';
import { BRANCH_GRAPH, branchProductionRate, createBranchesScenario, evaluateBranches, searchBranchesGrid, optimiseBranchesGlobal } from '../public/scripts/branches-engine.mjs';
import { solveBoundedLinearProgram } from '../public/scripts/bounded-linear-program.mjs';
import { createParameterBox } from '../public/scripts/branches-parameter-envelope.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}, tolerance ${tolerance}`);
const zeroControls = { s1: 0, s2: 0, s5: 0, s3: 0, s7: 0 };
const makeBoxes = model => Object.fromEntries(model.branches.map(branch => [branch.id, createParameterBox()]));
const fixed = optimiseBranchesGlobal(createBranchesScenario());
const bounded = optimiseBranchesGlobal(createBranchesScenario(), { parameterBoxes: makeBoxes(createBranchesScenario()) });

function checkState(state, boxes = null) {
    assert.equal(state.feasible, true);
    assert.equal(state.branches.length, 12);
    for (const branch of state.branches) {
        assert.ok(branch.input >= 0 && branch.input <= 1);
        const { a, b, c, d } = branch.parameters;
        const x = branch.input;
        const expected = x <= a ? 0 : x <= b ? c * (x - a) / (b - a) : ((1 - x) * c + (x - b) * d) / (1 - b);
        close(branch.coefficient, expected);
        close(branch.output, x * expected);
        assert.ok(branch.output <= branch.input + 1e-14);
        assert.ok(branch.output >= 0 && branch.output <= c + 1e-14);
        if (boxes) for (const key of ['a', 'b', 'c', 'd']) {
            assert.ok(branch.parameters[key] >= boxes[branch.id][key][0]);
            assert.ok(branch.parameters[key] <= boxes[branch.id][key][1]);
        }
    }
    for (const { id } of BRANCH_GRAPH.nodes) {
        const incoming = state.branches.filter(branch => branch.to === id).reduce((sum, branch) => sum + branch.output, 0);
        const outgoing = state.branches.filter(branch => branch.from === id).reduce((sum, branch) => sum + branch.input, 0);
        if (id === '1') { assert.equal(incoming, 0); close(outgoing, 1); }
        else {
            close(state.available[id], incoming);
            if (id !== '8') close(outgoing, incoming);
        }
    }
    close(state.production, state.branches.filter(branch => branch.to === '8').reduce((sum, branch) => sum + branch.output, 0));
    close(1 - state.production, state.branches.reduce((sum, branch) => sum + branch.input - branch.output, 0));
    assert.ok(state.production <= 1 + 1e-14);
}

test('generic bounded LP solves a two-variable optimum and reports a checked dual upper bound', () => {
    const result = solveBoundedLinearProgram({ A: [[1, 1], [1, 0], [0, 1]], b: [4, 2, 3], c: [3, 2], constant: 7, bounds: [10, 10] });
    assert.equal(result.status, 'optimal');
    close(result.point[0], 2); close(result.point[1], 2);
    close(result.objectiveValue, 17);
    assert.ok(result.certificate.upperBound >= 17);
    close(result.certificate.upperBound, 17, 1e-8);
    assert.ok(result.certificate.multipliers.every(value => value >= 0));
});

test('LP phase I distinguishes incompatible constraints from a boundary equality', () => {
    const incompatible = solveBoundedLinearProgram({ A: [[-1]], b: [-2], c: [1], bounds: [1] });
    assert.equal(incompatible.status, 'infeasible');
    assert.ok(incompatible.certificate.upperBound < 0);
    const equal = solveBoundedLinearProgram({ A: [[1], [-1]], b: [0.4, -0.4], c: [-2], constant: 3, bounds: [1] });
    assert.equal(equal.status, 'optimal');
    close(equal.point[0], 0.4); close(equal.objectiveValue, 2.2);
    assert.ok(equal.certificate.upperBound >= equal.objectiveValue);
});

test('LP box bounds cover a problem with no other constraints and reject malformed inputs', () => {
    const result = solveBoundedLinearProgram({ A: [], b: [], c: [2, -3, 4], bounds: [0.5, 1, 0] });
    assert.equal(result.status, 'optimal');
    assert.deepEqual(result.point, [0.5, 0, 0]);
    close(result.objectiveValue, 1);
    assert.throws(() => solveBoundedLinearProgram({ A: [[1, 2]], b: [1], c: [1], bounds: [1] }), /invalide/);
    assert.throws(() => solveBoundedLinearProgram({ A: [], b: [], c: [1], bounds: [Infinity] }), /invalide/);
});

test('branch topology has five splits, three terminal arrivals and fresh independent laws', () => {
    assert.deepEqual(BRANCH_GRAPH.edges.map(edge => edge.id), ['1-2', '1-5', '2-3', '2-8', '5-3', '5-7', '7-6', '7-4', '3-4', '3-6', '4-8', '6-8']);
    assert.equal(BRANCH_GRAPH.edges.filter(edge => edge.to === '8').length, 3);
    assert.equal(BRANCH_GRAPH.nodes.filter(node => BRANCH_GRAPH.edges.filter(edge => edge.from === node.id).length === 2).length, 5);
    const first = createBranchesScenario(), second = createBranchesScenario();
    first.branches[0].a = 0.1;
    assert.equal(first.branches[1].a, 0.3);
    assert.equal(second.branches[0].a, 0.3);
    assert.throws(() => { BRANCH_GRAPH.edges[0].to = '8'; }, TypeError);
});

test('default equal shares are below downstream thresholds; the direct route gives 0.324', () => {
    const model = createBranchesScenario();
    const equal = evaluateBranches(model);
    assert.equal(equal.production, 0);
    close(equal.branches[0].input, 0.5); close(equal.branches[0].output, 0.18);
    checkState(equal);
    const direct = evaluateBranches(model, { ...zeroControls, s1: 1 });
    close(direct.production, 0.324);
    close(direct.branches.find(branch => branch.id === '1-2').output, 0.6);
    checkState(direct);
});

test('a calculated compatible witness reaches 0.54432 with actual production x*f(x)', () => {
    const sourceShare = 0.8;
    const state = evaluateBranches(createBranchesScenario(), { ...zeroControls, s1: sourceShare });
    close(state.production, 0.54432);
    close(state.branches[0].output, 0.72);
    close(state.branches[0].coefficient, 0.9);
    close(state.branches[1].input, 1 - sourceShare);
    assert.equal(state.branches[1].output, 0);
    checkState(state);
});

test('yield coefficients prevent amplification and losses telescope to one minus terminal production', () => {
    const model = createBranchesScenario();
    model.branches = model.branches.map(branch => ({ ...branch, a: 0, b: 0.5, c: 1, d: 1 }));
    const state = evaluateBranches(model, { s1: 0.5, s2: 1, s5: 1, s3: 0.5, s7: 0.5 });
    assert.equal(state.available['3'], 1);
    assert.equal(state.production, 1);
    checkState(state);
    checkState(evaluateBranches(model, { s1: 0.5, s2: 1, s5: 1, s3: 1, s7: 0.5 }));
    const p = { a: 0.3, b: 0.8, c: 0.9, d: 0.6 };
    assert.equal(branchProductionRate(0, p), 0);
    close(branchProductionRate(0.3, p), 0);
    close(branchProductionRate(0.8, p), 0.72);
    close(branchProductionRate(1, p), 0.6);
});

test('evaluation is invariant to the stored order of independent branch descriptions', () => {
    const first = createBranchesScenario();
    const second = { ...first, branches: first.branches.toReversed() };
    assert.deepEqual(evaluateBranches(first), evaluateBranches(second));
});

test('finite grid is exhaustive for divisions 5 and keeps every command on that grid', () => {
    const result = searchBranchesGrid(createBranchesScenario(), { divisions: 5 });
    assert.equal(result.total, 6 ** 5);
    assert.equal(result.evaluated, result.total);
    assert.equal(result.status, 'complete'); assert.equal(result.complete, true);
    close(result.best.production, 0.54432);
    assert.ok(result.feasibleCount <= result.total && result.feasibleCount > 0);
    Object.values(result.best.controls).forEach(value => close(value * 5, Math.round(value * 5)));
    checkState(result.best);
    assert.deepEqual(searchBranchesGrid(createBranchesScenario(), { divisions: 5 }), result);
});

test('grid budgets, exact large counts, null initial best and cancellation never pretend completeness', () => {
    const model = createBranchesScenario();
    for (const divisions of [5, 10, 20, 50, 100]) {
        const result = searchBranchesGrid(model, { divisions, maxEvaluations: 0 });
        assert.equal(result.total, (divisions + 1) ** 5);
        assert.equal(result.evaluated, 0); assert.equal(result.best, null);
        assert.equal(result.status, 'evaluation-limit'); assert.equal(result.complete, false);
    }
    assert.equal(searchBranchesGrid(model, { divisions: 100, maxEvaluations: 0 }).total, 10510100501);
    let count = 0;
    const cancelled = searchBranchesGrid(model, { shouldCancel: () => count++ >= 17 });
    assert.equal(cancelled.evaluated, 17); assert.equal(cancelled.status, 'cancelled');
    const events = [];
    const limited = searchBranchesGrid(model, { maxEvaluations: 10001, onProgress: state => events.push(state.evaluated) });
    assert.equal(limited.complete, false);
    assert.deepEqual(events, [5000, 10000, 10001]);
});

test('fixed B&B closes a numerical gap and dominates the finite grid', () => {
    assert.equal(fixed.status, 'certified');
    close(fixed.best.production, 0.54432);
    assert.ok(fixed.upperBound >= 0.54432);
    assert.ok(fixed.gap >= 0 && fixed.gap <= fixed.tolerance);
    assert.ok(fixed.processedNodes < 3 ** 12);
    assert.equal(fixed.certificates.unresolved, 0);
    assert.equal(fixed.certificates.universalBound, 1);
    checkState(fixed.best);
    const grid = searchBranchesGrid(createBranchesScenario(), { divisions: 10 });
    assert.equal(grid.complete, true);
    assert.ok(grid.best.production <= fixed.upperBound);
    for (const record of fixed.certificates.records) if (record.certificate) {
        assert.ok(record.certificate.multipliers.every(value => Number.isFinite(value) && value >= 0));
        if (record.status === 'infeasible') assert.ok(record.certificate.upperBound < 0);
    }
});

test('every interrupted global search keeps a valid incumbent and an upper bound covering the known witness', () => {
    for (const maxNodes of [0, 1, 2, 10, 25]) {
        const result = optimiseBranchesGlobal(createBranchesScenario(), { maxNodes });
        assert.ok(result.best.production <= result.upperBound);
        assert.ok(result.upperBound >= 0.54432);
        assert.ok(result.processedNodes <= maxNodes);
        assert.equal(result.status, 'node-limit');
        checkState(result.best);
    }
    let polls = 0;
    const result = optimiseBranchesGlobal(createBranchesScenario(), { shouldCancel: () => polls++ >= 5 });
    assert.equal(result.status, 'cancelled');
    assert.equal(result.processedNodes, 5);
    assert.ok(result.upperBound >= 0.54432);
});

test('global progress retains bounds and uses a deterministic sequence of states', () => {
    const events = [];
    const second = optimiseBranchesGlobal(createBranchesScenario(), { onProgress: state => events.push({ count: state.processedNodes, upper: state.upperBound, best: state.best.production }) });
    assert.deepEqual(second, fixed);
    assert.equal(events[0].count, 0);
    assert.ok(events.some(state => state.count === 25));
    assert.equal(events.at(-1).count, fixed.processedNodes);
    for (let i = 1; i < events.length; i += 1) {
        assert.ok(events[i].upper <= events[i - 1].upper + 1e-9);
        assert.ok(events[i].best >= events[i - 1].best);
    }
});

test('bounded parameters reconstruct all twelve yields and attain the independent 0.9 witness', () => {
    const boxes = makeBoxes(createBranchesScenario());
    assert.equal(bounded.status, 'certified');
    close(bounded.best.production, 0.9);
    assert.ok(bounded.upperBound >= 0.9);
    assert.ok(bounded.gap <= bounded.tolerance);
    assert.equal(bounded.parameterMode, 'bounded');
    checkState(bounded.best, boxes);
    const rebuilt = createBranchesScenario();
    rebuilt.branches = bounded.best.branches.map(branch => ({ id: branch.id, from: branch.from, to: branch.to, ...branch.parameters }));
    assert.deepEqual(evaluateBranches(rebuilt, bounded.best.controls), bounded.best);
    const witness = createBranchesScenario();
    witness.branches = witness.branches.map(branch => ({ ...branch, a: 0.2, b: 0.9, c: 1, d: 0.7 }));
    const state = evaluateBranches(witness, { s1: 0.9, s2: 0, s5: 0, s3: 0.5, s7: 0.5 });
    close(state.production, 0.9); checkState(state, boxes);
});

test('singleton boxes reproduce the fixed problem rather than granting extra parameter freedom', () => {
    const model = createBranchesScenario();
    const boxes = Object.fromEntries(model.branches.map(branch => [branch.id, Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, [branch[key], branch[key]]]))]));
    const result = optimiseBranchesGlobal(model, { parameterBoxes: boxes });
    assert.equal(result.status, 'certified');
    close(result.best.production, fixed.best.production);
    assert.ok(result.upperBound >= fixed.best.production - 1e-10);
    checkState(result.best, boxes);
});

test('zero responses, absent thresholds and flat final segments do not create undefined ratios', () => {
    for (const parameters of [{ a: 0.3, b: 0.8, c: 0, d: 0 }, { a: 0, b: 0.5, c: 1, d: 1 }]) {
        const model = createBranchesScenario(); model.branches = model.branches.map(branch => ({ ...branch, ...parameters }));
        const result = optimiseBranchesGlobal(model, { maxNodes: 1000 });
        checkState(result.best);
        assert.ok(Object.values(result.best.controls).every(Number.isFinite));
        if (parameters.c === 0) { assert.equal(result.status, 'certified'); assert.equal(result.upperBound, 0); }
    }
});

test('source certificate explicitly covers each quadratic interval and bounds independently sampled shares', () => {
    const certificate = bounded.certificates.sourceCertificate;
    assert.equal(certificate.type, 'source-cut-quadratic');
    assert.equal(certificate.status, 'checked');
    assert.equal(certificate.quantity, 'production');
    close(certificate.rawMaximum, 0.9);
    assert.ok(certificate.margin > 0);
    assert.equal(bounded.processedNodes, 0);
    assert.ok(certificate.intervals.length > 0);
    close(certificate.intervals[0].lower, 0);
    close(certificate.intervals.at(-1).upper, 1);
    for (let i = 1; i < certificate.intervals.length; i += 1) close(certificate.intervals[i - 1].upper, certificate.intervals[i].lower);
    for (const interval of certificate.intervals) for (let i = 0; i <= 10; i += 1) {
        const t = interval.lower + i / 10 * (interval.upper - interval.lower);
        const q = interval.quadratic;
        assert.ok(q.A * t * t + q.B * t + q.C <= certificate.upperBound);
    }
});

test('off-grid b=0.83 exposes a finite grid gap while spatial bounds reach the requested tolerance', () => {
    const model = createBranchesScenario(); model.branches = model.branches.map(branch => ({ ...branch, b: 0.83 }));
    const grid = searchBranchesGrid(model, { divisions: 10 });
    const result = optimiseBranchesGlobal(model);
    close(grid.best.production, 0.47327649017431594);
    close(result.best.production, 0.5670152830188678);
    close(result.best.controls.s1, 0.83);
    assert.equal(result.status, 'certified');
    assert.ok(result.upperBound >= result.best.production);
    assert.ok(result.gap <= 1e-7);
    assert.ok(result.best.production > grid.best.production + 0.09);
    assert.ok(result.certificates.records.some(record => record.split !== undefined));
    checkState(result.best);
});

test('invalid topology, laws, controls, grids, budgets and boxes are rejected explicitly', () => {
    const model = createBranchesScenario();
    assert.throws(() => evaluateBranches({ ...model, source: 0.9 }), /source/);
    assert.throws(() => evaluateBranches({ ...model, branches: model.branches.slice(1) }), /Douze/);
    assert.throws(() => evaluateBranches({ ...model, branches: model.branches.map((branch, i) => i === 0 ? { ...branch, to: '8' } : branch) }), /topologie/);
    assert.throws(() => evaluateBranches(model, { ...zeroControls, s3: 1.1 }), /s3/);
    for (const options of [{ divisions: 7 }, { divisions: 1.5 }, { maxEvaluations: -1 }, { maxEvaluations: Infinity }, { shouldCancel: true }, { unexpected: 1 }]) assert.throws(() => searchBranchesGrid(model, options));
    for (const options of [{ tolerance: 0 }, { tolerance: NaN }, { maxNodes: -1 }, { maxNodes: 1.5 }, { maxNodes: 1000001 }, { parameterBoxes: {} }, { onProgress: true }, { unexpected: 1 }]) assert.throws(() => optimiseBranchesGlobal(model, options));
});
