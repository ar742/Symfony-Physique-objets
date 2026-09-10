import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productionRate, createProductionScenario, stepProduction, simulateProduction } from '../public/scripts/production-engine.mjs';

const close = (actual, expected, tolerance = 1e-12) => assert.ok(
    Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`,
);
function closeVector(actual, expected, tolerance = 1e-12) {
    assert.equal(actual.length, expected.length);
    actual.forEach((value, i) => close(value, expected[i], tolerance));
}
const machine = (id, overrides = {}) => ({
    id, name: id, a: 0.1, b: 0.5, c: 0.8, d: 0.4, external: 0, initial: 0, ...overrides,
});
const allocation = (from, to, fraction, conversion = 1) => ({ from, to, fraction, conversion });
const byId = (model, values) => Object.fromEntries(model.machines.map((item, i) => [item.id, values[i]]));

// Independent oracle: piecewise interpolation through its vertices, then a
// destination-by-source dense matrix sum (not the engine's sorted arc traversal).
function oracleStep(model, old) {
    const outputById = byId(model, old);
    const raw = model.machines.map(target => target.external + model.machines.reduce((sum, source) => {
        const edge = model.allocations.find(link => link.from === source.id && link.to === target.id);
        return sum + (edge ? edge.conversion * edge.fraction * outputById[source.id] : 0);
    }, 0));
    const used = raw.map(value => value > 1 ? 1 : value);
    const result = model.machines.map((item, i) => {
        const x = used[i];
        if (x <= item.a) return 0;
        if (x <= item.b) return ((x - item.a) * item.c) / (item.b - item.a);
        return (item.c * (1 - x) + item.d * (x - item.b)) / (1 - item.b);
    });
    return { raw, used, result };
}

test('piecewise response has exact knots, continuous joins and the required slopes', () => {
    const p = { a: 0.2, b: 0.6, c: 0.8, d: 0.2 };
    assert.equal(productionRate(0, p), 0);
    assert.equal(productionRate(p.a, p), 0);
    assert.equal(productionRate(p.b, p), p.c);
    assert.equal(productionRate(1, p), p.d);
    close(productionRate(0.4, p), 0.4);
    close(productionRate(0.8, p), 0.5);
    const h = 1e-7;
    close(productionRate(p.a - h, p), 0);
    close(productionRate(p.a + h, p), 2 * h);
    close(productionRate(p.b - h, p), p.c - 2 * h);
    close(productionRate(p.b + h, p), p.c - 1.5 * h);
    close((productionRate(0.45, p) - productionRate(0.35, p)) / 0.1, 2);
    close((productionRate(0.85, p) - productionRate(0.75, p)) / 0.1, -1.5);
});

test('flat descending segment, zero production, zero threshold and narrow intervals are valid', () => {
    const flat = { a: 0.1, b: 0.5, c: 0.7, d: 0.7 };
    for (const x of [0.5, 0.6, 0.8, 1]) assert.equal(productionRate(x, flat), 0.7);
    for (let i = 0; i <= 20; i += 1) assert.equal(productionRate(i / 20, { ...flat, c: 0, d: 0 }), 0);
    close(productionRate(0.25, { a: 0, b: 0.5, c: 1, d: 0 }), 0.5);
    const narrow = { a: 0.5, b: 0.50000001, c: 1, d: 0.5 };
    close(productionRate((narrow.a + narrow.b) / 2, narrow), 0.5, 1e-8);
});

test('production inputs and invalid response parameters are rejected without repair', () => {
    const p = { a: 0.1, b: 0.5, c: 0.8, d: 0.4 };
    for (const x of [-0.001, 1.001, NaN, Infinity, '0.5', null, undefined]) assert.throws(() => productionRate(x, p));
    for (const params of [null, {}, [], { ...p, a: -1 }, { ...p, a: 0.5 }, { ...p, a: 0.6 },
        { ...p, b: 1 }, { ...p, b: Infinity }, { ...p, c: 1.01 }, { ...p, d: -0.1 },
        { ...p, d: 0.9 }, { ...p, c: NaN }, { ...p, a: '0.1' }]) assert.throws(() => productionRate(0.3, params));
});

test('balanced network: an independent first transition reads only the old production', () => {
    const model = createProductionScenario();
    const row = stepProduction(model, [0, 0, 0]);
    closeVector(row.previousOutputs, [0, 0, 0]);
    closeVector(row.rawInput, [0.2, 0.15, 0.1]);
    closeVector(row.input, [0.2, 0.15, 0.1]);
    closeVector(row.outputs, [0.2, 0.1, 0]);
    closeVector(row.externalOutputs, [0.12, 0.075, 0]);
    closeVector(row.overflow, [0, 0, 0]);
    close(row.residual, 0.2);
    const flow = row.flows.find(edge => edge.from === 'M1' && edge.to === 'M2');
    close(flow.sent, 0); close(flow.offered, 0);
    close(flow.nextSent, 0.06); close(flow.nextOffered, 0.06);
    const second = stepProduction(model, row.outputs);
    closeVector(second.input, [0.2, 0.21, 0.145]);
    closeVector(second.outputs, [0.2, 0.22, 0.09]);
    close(second.flows.find(edge => edge.from === 'M1' && edge.to === 'M2').sent, flow.nextSent);
});

test('synchronous results and named flows are invariant to machine and allocation order', () => {
    const model = createProductionScenario();
    const old = [0.37, 0.13, 0.61];
    const normal = stepProduction(model, old);
    const reordered = { ...model, machines: [...model.machines].reverse(), allocations: [...model.allocations].reverse() };
    const reversed = stepProduction(reordered, [...old].reverse());
    for (const key of ['rawInput', 'input', 'overflow', 'outputs', 'externalOutputs']) {
        assert.deepEqual(byId(model, normal[key]), byId(reordered, reversed[key]));
    }
    assert.deepEqual(normal.flows, reversed.flows);
    assert.equal(normal.residual, reversed.residual);
    // An in-place sweep would feed newly produced M1 into M2 during this cycle.
    closeVector(stepProduction(model, [0, 0, 0]).outputs, [0.2, 0.1, 0]);
});

test('multiple return allocations conserve each source partition, before conversions', () => {
    const model = createProductionScenario();
    const row = stepProduction(model, [0.4, 0.6, 0.8]);
    for (const [i, source] of model.machines.entries()) {
        const outgoing = row.flows.filter(flow => flow.from === source.id);
        const sum = outgoing.reduce((total, flow) => total + flow.fraction, 0);
        close(outgoing.reduce((total, flow) => total + flow.sent, 0), sum * row.previousOutputs[i]);
        close(outgoing.reduce((total, flow) => total + flow.nextSent, 0) + row.externalOutputs[i], row.outputs[i]);
    }
    assert.equal(row.flows.filter(flow => flow.from === 'M1').length, 2);
    assert.ok(row.flows.some(flow => flow.from === 'M3' && flow.to === 'M1'));
});

test('conversion units, raw input, saturation and unstocked surplus stay distinct', () => {
    const model = {
        machines: [machine('M1'), machine('M2', { external: 0.8 })],
        allocations: [allocation('M1', 'M2', 1, 2)],
    };
    const row = stepProduction(model, [0.5, 0]);
    closeVector(row.rawInput, [0, 1.8]);
    closeVector(row.input, [0, 1]);
    closeVector(row.overflow, [0, 0.8]);
    closeVector(row.outputs, [0, 0.4]);
    close(row.flows[0].sent, 0.5);
    close(row.flows[0].offered, 1);
    close(row.externalOutputs[0], 0);
    const next = stepProduction(model, row.outputs);
    closeVector(next.rawInput, [0, 0.8]);
    closeVector(next.overflow, [0, 0]);
    close(next.outputs[1], 0.56);
    close(next.flows[0].sent, row.flows[0].nextSent);
});

test('exactly saturated, unallocated and zero-fraction links are handled explicitly', () => {
    const model = {
        machines: [machine('M1', { external: 0.5 }), machine('M2', { external: 0.8 })],
        allocations: [allocation('M1', 'M2', 0.5), allocation('M2', 'M1', 0), allocation('M1', 'M1', 0)],
    };
    const row = stepProduction(model, [0.4, 0.7]);
    closeVector(row.rawInput, [0.5, 1]);
    closeVector(row.overflow, [0, 0]);
    closeVector(row.externalOutputs, [0.4, 0.4]);
    assert.equal(row.flows.filter(flow => flow.fraction === 0).length, 2);
    const isolated = { machines: [machine('M1', { external: 0.5 })], allocations: [] };
    closeVector(stepProduction(isolated, [0]).externalOutputs, [0.8]);
});

test('balanced fixed point matches independently solved linear equations', () => {
    const model = createProductionScenario('balanced');
    // On the rising branches: y1=.2+.4y3, y2=.1+.6y1,
    // y3=.2y1+.5y2; elimination gives (.275,.265,.1875).
    const expected = [0.275, 0.265, 0.1875];
    const fixed = stepProduction(model, expected);
    closeVector(fixed.outputs, expected);
    closeVector(fixed.input, [0.2375, 0.2325, 0.19375]);
    closeVector(fixed.externalOutputs, [0.165, 0.19875, 0.15]);
    const result = simulateProduction(model);
    closeVector(result.finalOutputs, expected, 1e-7);
    assert.equal(result.status, 'approximate');
    assert.ok(result.residual <= result.tolerance);
    assert.equal(result.period2Observed, false);
    assert.equal(result.history.length, 41);
});

test('threshold preset has blocked, intermediate and high fixed states; initialization matters', () => {
    const model = createProductionScenario('threshold');
    const blocked = simulateProduction(model, { cycles: 15 });
    assert.ok(blocked.history.every(row => row.outputs.every(value => value === 0)));
    assert.equal(blocked.status, 'approximate');
    assert.equal(blocked.residual, 0);
    assert.equal(blocked.period2Observed, false);
    closeVector(stepProduction(model, [0.4, 0.4, 0.4]).outputs, [0.4, 0.4, 0.4]);
    closeVector(stepProduction(model, [27 / 35, 27 / 35, 27 / 35]).outputs, [27 / 35, 27 / 35, 27 / 35]);
    model.machines.forEach(item => { item.initial = 0.8; });
    const high = simulateProduction(model, { cycles: 15 });
    closeVector(high.finalOutputs, [27 / 35, 27 / 35, 27 / 35], 1e-10);
    assert.equal(high.status, 'approximate');
    assert.ok(high.finalOutputs.every(value => value > 0.7));
});

test('decreasing response and positive allocations can produce an observed period two', () => {
    const model = createProductionScenario('oscillating');
    const result = simulateProduction(model, { cycles: 10 });
    for (const row of result.history) assert.deepEqual(row.outputs, row.index % 2 ? [1, 1, 0] : [0, 0, 0]);
    assert.equal(result.status, 'stillvarying');
    assert.equal(result.residual, 1);
    assert.equal(result.period2Observed, true);
    assert.equal(simulateProduction(model, { cycles: 2 }).period2Observed, false);
    model.machines[0].initial = 0.5;
    model.machines[1].initial = 0.5;
    const fixed = simulateProduction(model, { cycles: 6 });
    assert.deepEqual(fixed.finalOutputs, [0.5, 0.5, 0]);
    assert.equal(fixed.status, 'approximate');
    assert.equal(fixed.period2Observed, false);
});

test('horizon is exact and final residual is recomputed, not the last observed change', () => {
    const model = { machines: [machine('M1', { external: 0.5 })], allocations: [] };
    const zero = simulateProduction(model, { cycles: 0 });
    assert.equal(zero.history.length, 1);
    assert.deepEqual(zero.history[0], {
        index: 0, previousOutputs: null, rawInput: null, input: null, overflow: null,
        outputs: [0], externalOutputs: null, flows: [], residual: null,
    });
    assert.equal(zero.residual, 0.8);
    assert.equal(zero.status, 'stillvarying');
    const once = simulateProduction(model, { cycles: 1 });
    assert.equal(once.history[1].residual, 0.8);
    assert.equal(once.residual, 0);
    assert.equal(once.status, 'approximate');
    const many = simulateProduction(model, { cycles: 12 });
    assert.deepEqual(many.history.map(row => row.index), Array.from({ length: 13 }, (_, i) => i));
    const alternating = simulateProduction(createProductionScenario('oscillating'), { cycles: 101 });
    assert.equal(alternating.history.length, 102);
    assert.deepEqual(alternating.finalOutputs, [1, 1, 0]);
});

test('independent dense-matrix/interpolation oracle agrees through nonlinear and clipped cycles', () => {
    const model = {
        machines: [machine('M1', { external: 0.25 }), machine('M2', { external: 0.45 }), machine('M3', { external: 0.3 })],
        allocations: [allocation('M1', 'M2', 0.55, 2), allocation('M1', 'M3', 0.4), allocation('M2', 'M3', 0.75, 1.5), allocation('M3', 'M1', 0.7)],
    };
    let old = [0.7, 0.25, 0.9];
    let sawOverflow = false;
    for (let k = 0; k < 18; k += 1) {
        const expected = oracleStep(model, old);
        const row = stepProduction(model, old);
        closeVector(row.rawInput, expected.raw);
        closeVector(row.input, expected.used);
        closeVector(row.outputs, expected.result);
        sawOverflow ||= row.overflow.some(value => value > 0);
        old = expected.result;
    }
    assert.equal(sawOverflow, true);
});

test('model validation rejects malformed allocations, excessive fractions and impossible values', () => {
    const base = createProductionScenario();
    const invalid = [null, {}, { machines: [], allocations: [] }, { machines: [null], allocations: [] }];
    function changed(edit) { const model = structuredClone(base); edit(model); return model; }
    invalid.push(
        changed(model => { model.machines[1].id = 'M1'; }),
        changed(model => { model.machines[0].id = ''; }),
        changed(model => { model.machines[0].a = model.machines[0].b; }),
        changed(model => { model.machines[0].external = 1.1; }),
        changed(model => { model.machines[0].initial = -0.1; }),
        changed(model => { model.machines[0].initial = null; }),
        changed(model => { model.allocations.push({ ...model.allocations[0] }); }),
        changed(model => { model.allocations[0].to = 'M4'; }),
        changed(model => { model.allocations[0].from = 'M4'; }),
        changed(model => { model.allocations[0].to = model.allocations[0].from; }),
        changed(model => { model.allocations[0].fraction = 0.95; }),
        changed(model => { model.allocations[0].fraction = -0.01; }),
        changed(model => { model.allocations[0].conversion = 0; }),
        changed(model => { model.allocations[0].conversion = -1; }),
        changed(model => { model.allocations[0].conversion = Infinity; }),
        changed(model => { delete model.allocations[0].conversion; }),
        changed(model => { model.allocations.push(null); }),
    );
    for (const model of invalid) {
        assert.throws(() => stepProduction(model, [0, 0, 0]));
        assert.throws(() => simulateProduction(model));
    }
    for (const outputs of [null, [], [0, 0], [0, 0, 0, 0], [0, '0', 0], [0, NaN, 0], [0, -1, 0], [0, 1.01, 0], new Array(3)]) {
        assert.throws(() => stepProduction(base, outputs));
    }
    const noInitial = structuredClone(base);
    noInitial.machines.forEach(item => { delete item.initial; });
    assert.deepEqual(simulateProduction(noInitial, { cycles: 0 }).finalOutputs, [0, 0, 0]);
});

test('simulation options and overflowing conversions cannot silently truncate or clamp', () => {
    const model = createProductionScenario();
    for (const options of [null, [], { cycles: -1 }, { cycles: 0.5 }, { cycles: 10001 }, { cycles: Infinity },
        { cycles: '40' }, { tolerance: 0 }, { tolerance: -1 }, { tolerance: NaN }, { tolerance: Infinity },
        { tolerance: '0.1' }, { limit: 20 }]) assert.throws(() => simulateProduction(model, options));
    const overflow = {
        machines: [machine('M1'), machine('M2'), machine('M3')],
        allocations: [allocation('M1', 'M3', 1, Number.MAX_VALUE), allocation('M2', 'M3', 1, Number.MAX_VALUE)],
    };
    assert.throws(() => stepProduction(overflow, [1, 1, 0]), /plage numérique/);
    for (const preset of ['', 'unknown', null, 4]) assert.throws(() => createProductionScenario(preset));
});

test('fresh presets, immutable inputs and independent history rows preserve reproducibility', () => {
    for (const preset of ['balanced', 'threshold', 'oscillating']) {
        const first = createProductionScenario(preset), second = createProductionScenario(preset);
        assert.deepEqual(first, second);
        assert.deepEqual(first.machines.map(item => item.id), ['M1', 'M2', 'M3']);
        assert.ok(first.allocations.every(edge => edge.conversion === 1));
        first.machines[0].initial = 0.9;
        first.allocations[0].fraction = 0;
        assert.equal(second.machines[0].initial, 0);
        assert.notEqual(second.allocations[0].fraction, 0);
    }
    const model = createProductionScenario(), before = structuredClone(model), old = [0.1, 0.2, 0.3];
    const row = stepProduction(model, old);
    const result = simulateProduction(model, { cycles: 3 });
    assert.deepEqual(model, before);
    assert.deepEqual(old, [0.1, 0.2, 0.3]);
    row.previousOutputs[0] = 999;
    assert.equal(old[0], 0.1);
    result.history[0].outputs[0] = 999;
    assert.equal(result.history[1].previousOutputs[0], 0);
    result.finalOutputs[0] = 999;
    assert.notEqual(result.history.at(-1).outputs[0], 999);
    assert.deepEqual(createProductionScenario(), before);
});
