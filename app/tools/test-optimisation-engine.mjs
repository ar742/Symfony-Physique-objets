import assert from 'node:assert/strict';
import test from 'node:test';
import {
    OPTIMISATION_GRAPH,
    createOptimisationScenario,
    evaluateOptimisation,
    optimiseLocal,
    optimiseGlobal,
} from '../public/scripts/optimisation-engine.mjs';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected} (tol. ${tolerance})`);
const active = () => createOptimisationScenario('active');
const zero = () => createOptimisationScenario('plateau');
const defaultGlobal = optimiseGlobal(active());

function verifyNetwork(model, state, tolerance = 2e-12) {
    assert.equal(state.feasible, true);
    assert.equal(state.input.length, 8);
    assert.equal(state.outputs.length, 8);
    assert.equal(state.flows.length, 10);
    close(state.input[0], state.controls.u, tolerance);
    for (let index = 0; index < 8; index += 1) {
        const id = `M${index + 1}`;
        assert.ok(state.input[index] >= 0 && state.input[index] <= 1);
        assert.ok(state.outputs[index] >= 0 && state.outputs[index] <= model.parameters.c);
        if (index > 0) close(state.input[index], state.flows.filter(edge => edge.to === id).reduce((sum, edge) => sum + edge.amount, 0), tolerance);
        if (index < 7) close(state.outputs[index], state.flows.filter(edge => edge.from === id).reduce((sum, edge) => sum + edge.amount, 0), tolerance);
        const { a, b, c, d } = model.parameters;
        const x = state.input[index];
        // Independent interpolation between the three response knots.
        const expected = x <= a ? 0 : x <= b ? ((x - a) * c) / (b - a) : ((1 - x) * c + (x - b) * d) / (1 - b);
        close(state.outputs[index], expected, tolerance);
    }
    close(state.production, state.outputs[7], tolerance);
    for (const edge of state.flows) {
        assert.equal(edge.conversion, 1);
        assert.ok(edge.amount >= 0);
        close(edge.amount, state.outputs[Number(edge.from.slice(1)) - 1] * edge.fraction, tolerance);
    }
}

test('fixed graph has one source, one sink and precisely the ten compatible directed arcs', () => {
    assert.deepEqual(OPTIMISATION_GRAPH.nodes.map(node => node.id), ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']);
    assert.deepEqual(OPTIMISATION_GRAPH.edges.map(edge => `${edge.from}-${edge.to}`), ['M1-M2', 'M1-M3', 'M2-M4', 'M3-M4', 'M3-M5', 'M4-M6', 'M5-M6', 'M5-M7', 'M6-M8', 'M7-M8']);
    assert.ok(OPTIMISATION_GRAPH.edges.every(edge => edge.conversion === 1));
    assert.throws(() => { OPTIMISATION_GRAPH.edges[0].conversion = 2; }, TypeError);
    const first = active(), second = active();
    first.parameters.a = 0;
    first.initialControls.u = 0;
    assert.equal(second.parameters.a, 0.1);
    assert.equal(second.initialControls.u, 0.196);
    assert.throws(() => createOptimisationScenario('unknown'), /Scénario/);
});

test('topological evaluation preserves every intermediate balance and the chosen split meaning', () => {
    const model = active();
    const state = evaluateOptimisation(model);
    assert.deepEqual(state.input, [0.196, 0.192, 0, 0.184, 0, 0.16799999999999998, 0, 0.13599999999999995]);
    close(state.production, 0.072);
    verifyNetwork(model, state);
    const alternative = evaluateOptimisation(model, { u: 0.2, s1: 0, s3: 0, s5: 0 });
    close(alternative.production, 0.2);
    verifyNetwork(model, alternative);
    assert.equal(alternative.flows.find(edge => edge.from === 'M1' && edge.to === 'M2').amount, 0);
    close(alternative.flows.find(edge => edge.from === 'M5' && edge.to === 'M7').amount, 0.2);
});

test('larger resources allow a branched compatible state and a peak output', () => {
    const model = active(); model.budget = 0.4;
    const state = evaluateOptimisation(model, { u: 0.3, s1: 0.5, s3: 0.5, s5: 0.5 });
    close(state.production, 0.72);
    verifyNetwork(model, state);
    const peak = evaluateOptimisation(model, { u: 0.21875, s1: 1, s3: 1, s5: 1 });
    close(peak.production, 0.8);
    verifyNetwork(model, peak);
});

test('incompatible joins are rejected without clipping, losing or storing material', () => {
    const model = { parameters: { a: 0, b: 0.25, c: 1, d: 1 }, budget: 1 };
    const state = evaluateOptimisation(model, { u: 1, s1: 0.5, s3: 0.5, s5: 0.5 });
    assert.equal(state.feasible, false);
    assert.match(state.reason, /M4/);
    assert.equal(state.input[3], 1.5);
    assert.equal(state.outputs[3], null);
    assert.equal(state.production, null);
    assert.throws(() => optimiseLocal(model, { initialControls: state.controls }), /incompatible/);
});

test('strict local search displays the threshold plateau without asserting a local maximum', () => {
    const result = optimiseLocal(zero());
    assert.equal(result.best.production, 0);
    assert.equal(result.best.controls.u, 0);
    assert.equal(result.status, 'step-limit');
    assert.ok(result.history.every(row => !row.accepted && row.production === 0));
    assert.ok(result.history.at(-1).splitStep < 1e-5);
    assert.ok(result.evaluations > 1);
});

test('active local search reaches the independently known optimum and records only compatible accepted moves', () => {
    const model = active();
    const result = optimiseLocal(model);
    close(result.best.production, 0.2);
    assert.equal(result.history[0].iteration, 0);
    close(result.history[0].production, 0.072);
    assert.equal(result.history[1].accepted, true);
    close(result.history[1].controls.u, 0.2);
    assert.equal(result.history.length, result.iterations + 1);
    result.history.forEach((row, index) => {
        verifyNetwork(model, evaluateOptimisation(model, row.controls));
        if (index) assert.ok(row.production >= result.history[index - 1].production);
    });
    const second = optimiseLocal(model);
    assert.deepEqual(second, result);
    result.history[0].controls.u = 0;
    assert.equal(model.initialControls.u, 0.196);
    close(result.best.controls.u, 0.2);
});

test('local iteration limits include a zero-iteration result without false convergence', () => {
    const result = optimiseLocal(active(), { maxIterations: 0 });
    assert.equal(result.iterations, 0);
    assert.equal(result.evaluations, 1);
    assert.equal(result.history.length, 1);
    assert.equal(result.status, 'iteration-limit');
    close(result.best.production, 0.072);
    const one = optimiseLocal(zero(), { maxIterations: 1 });
    assert.equal(one.status, 'iteration-limit');
    assert.equal(one.iterations, 1);
});

test('global bound agrees with independent conservation argument r≤u≤0.2 and a matching route', () => {
    // Here every reachable x<=0.2 and f(x)<=x. Flow conservation inductively
    // bounds each cut and final output by u. A concentrated route attains 0.2.
    const result = defaultGlobal;
    assert.equal(result.status, 'certified');
    close(result.best.production, 0.2, 1e-10);
    assert.ok(result.upperBound >= 0.2);
    close(result.upperBound, 0.2, 1e-8);
    assert.ok(result.upperBound < 0.8);
    assert.ok(result.gap >= 0 && result.gap <= result.tolerance);
    verifyNetwork(active(), result.best);
});

test('global records cover all 6561 regimes and retain auditable, nonnegative multipliers', () => {
    const { regimes, certificates } = defaultGlobal;
    assert.equal(regimes.total, 6561);
    assert.equal(regimes.feasible + regimes.infeasible + regimes.uncertain, 6561);
    assert.equal(regimes.uncertain, 0);
    assert.equal(certificates.checked, 6561);
    assert.equal(certificates.records.length, 6561);
    assert.equal(new Set(certificates.records.map(record => record.regime)).size, 6561);
    for (let index = 0; index < 6561; index += 1) {
        const record = certificates.records[index];
        assert.equal(record.regime, index.toString(3).padStart(8, '0'));
        assert.equal(record.multipliers.length, 23);
        assert.ok(record.multipliers.every(value => Number.isFinite(value) && value >= 0));
        assert.ok(Number.isFinite(record.margin) && record.margin > 0);
        assert.ok(Number.isFinite(record.dualResidual) && record.dualResidual >= 0);
        if (record.status === 'infeasible') {
            assert.equal(record.upperBound, null);
            assert.ok(record.infeasibilityBound < 0);
        } else {
            assert.equal(record.point.length, 4);
            assert.ok(record.primalResidual <= defaultGlobal.tolerance);
            assert.ok(record.upperBound <= defaultGlobal.upperBound);
        }
    }
});

test('independent control grid respects the bound and each compatible point has a non-excluded regime', () => {
    const model = active();
    const records = new Map(defaultGlobal.certificates.records.map(record => [record.regime, record]));
    for (let iu = 0; iu <= 8; iu += 1) for (let i = 0; i <= 4; i += 1) for (let j = 0; j <= 4; j += 1) for (let k = 0; k <= 4; k += 1) {
        const state = evaluateOptimisation(model, { u: iu / 40, s1: i / 4, s3: j / 4, s5: k / 4 });
        assert.equal(state.feasible, true);
        assert.ok(state.production <= defaultGlobal.upperBound);
        const regime = state.input.map(x => x <= model.parameters.a ? '0' : x <= model.parameters.b ? '1' : '2').join('');
        const record = records.get(regime);
        assert.equal(record.status, 'feasible', `Compatible point wrongly excluded in ${regime}`);
        assert.ok(state.production <= record.upperBound + 1e-10);
    }
});

test('global result is deterministic and reaches the independent universal cap with more resources', () => {
    assert.deepEqual(optimiseGlobal(active()), defaultGlobal);
    const model = active(); model.budget = 0.4;
    const result = optimiseGlobal(model);
    assert.equal(result.status, 'certified');
    close(result.best.production, 0.8);
    assert.equal(result.upperBound, 0.8);
    verifyNetwork(model, result.best);
});

test('zero budget and zero capacity retain defined ratios, balances and complete regime coverage', () => {
    const model = zero(); model.budget = 0;
    const noBudget = optimiseGlobal(model);
    assert.equal(noBudget.status, 'certified');
    assert.equal(noBudget.best.production, 0);
    verifyNetwork(model, noBudget.best);
    const noCapacity = zero(); noCapacity.parameters.c = 0; noCapacity.parameters.d = 0;
    const result = optimiseGlobal(noCapacity);
    assert.equal(result.status, 'certified');
    assert.equal(result.upperBound, 0);
    assert.equal(result.best.production, 0);
    assert.ok(Object.values(result.best.controls).every(Number.isFinite));
    verifyNetwork(noCapacity, result.best);
});

test('flat top d=c and absent threshold a=0 remain solvable, including shared regime boundaries', () => {
    const flat = zero(); flat.parameters.d = 0.8; flat.budget = 0.8;
    const first = optimiseGlobal(flat);
    assert.equal(first.status, 'certified');
    close(first.best.production, 0.8);
    verifyNetwork(flat, first.best);
    const noThreshold = zero(); noThreshold.parameters.a = 0;
    const second = optimiseGlobal(noThreshold);
    assert.equal(second.status, 'certified');
    close(second.best.production, 0.8);
    verifyNetwork(noThreshold, second.best);
    assert.ok(second.regimes.feasible > defaultGlobal.regimes.feasible);
});

test('very small positive capacities never create undefined or infinite split controls', () => {
    const model = zero(); model.parameters = { a: 0, b: 0.5, c: 1e-9, d: 0 };
    const result = optimiseGlobal(model);
    assert.ok(Object.values(result.best.controls).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    verifyNetwork(model, result.best);
    assert.ok(result.best.production <= model.parameters.c);
});

test('numeric conditioning or an unattainably tight gap never produce an unsupported guarantee', () => {
    const tight = optimiseGlobal(active(), { tolerance: 1e-14 });
    assert.equal(tight.status, 'uncertain');
    assert.ok(tight.gap > tight.tolerance);
    const extreme = zero(); extreme.parameters = { a: 0, b: Number.MIN_VALUE, c: 0.8, d: 0.4 };
    const result = optimiseGlobal(extreme);
    assert.equal(result.status, 'uncertain');
    assert.ok(result.regimes.uncertain > 0);
    assert.equal(result.upperBound, 0.8);
    assert.equal(result.certificates.checked + result.regimes.uncertain, 6561);
    verifyNetwork(extreme, result.best);
});

test('invalid domains, commands and solver options raise explicit errors instead of clamping', () => {
    for (const parameters of [null, { a: 0.5, b: 0.5, c: 1, d: 0 }, { a: 0, b: 1, c: 1, d: 0 }, { a: -0.1, b: 0.5, c: 1, d: 0 }, { a: 0, b: 0.5, c: 0.4, d: 0.5 }, { a: 0, b: 0.5, c: Infinity, d: 0 }]) {
        assert.throws(() => evaluateOptimisation({ ...zero(), parameters }));
    }
    for (const budget of [-1, 1.1, NaN, '0.2']) assert.throws(() => optimiseGlobal({ ...zero(), budget }));
    for (const controls of [null, {}, { u: 0.3, s1: 0, s3: 0, s5: 0 }, { u: 0.1, s1: 1.1, s3: 0, s5: 0 }, { u: 0.1, s1: 0, s3: NaN, s5: 0 }]) assert.throws(() => evaluateOptimisation(zero(), controls));
    for (const options of [{ tolerance: 0 }, { tolerance: NaN }, { tolerance: 1 }, { unknown: 1 }]) assert.throws(() => optimiseGlobal(zero(), options));
    for (const options of [{ sourceStep: 0 }, { splitStep: -1 }, { minStep: Infinity }, { maxIterations: 1.5 }, { maxIterations: -1 }, { maxIterations: 10001 }, { unknown: 1 }]) assert.throws(() => optimiseLocal(zero(), options));
});
