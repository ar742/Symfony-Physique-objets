import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productionRate } from '../public/scripts/production-engine.mjs';
import { createParameterBox, validateParameterBox, parameterEnvelope, evaluateParameterBounds, reconstructParameters,
    productionParameterEnvelope, evaluateProductionParameterBounds, reconstructProductionParameters } from '../public/scripts/branches-parameter-envelope.mjs';

const close = (actual, expected, tolerance = 2e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const fromCurve = (curve, x) => {
    const segment = curve.segments.find(item => x >= item.lower && x <= item.upper);
    assert.ok(segment, `No segment at ${x}`);
    return segment.slope * x + segment.intercept;
};

// Independent interpolation oracle uses barycentric endpoint weights.
function oracle(x, p) {
    if (x <= p.a) return 0;
    if (x <= p.b) return p.c * (x - p.a) / (p.b - p.a);
    return (p.c * (1 - x) + p.d * (x - p.b)) / (1 - p.b);
}

test('default upper band attains its interior plateau by choosing b=x', () => {
    const box = createParameterBox();
    for (const [x, value] of [[0, 0], [.2, 0], [.4, .4], [.7, 1], [.8, 1], [.9, 1], [1, .7]]) {
        const result = evaluateParameterBounds(box, x);
        close(result.upper, value);
        close(oracle(x, result.upperParameters), value);
    }
    assert.equal(evaluateParameterBounds(box, .8).upperParameters.b, .8);
});

test('default lower envelope includes the exact crossing 107/130', () => {
    const box = createParameterBox(), envelope = parameterEnvelope(box);
    const crossing = 107 / 130;
    assert.ok(envelope.breakpoints.some(x => Math.abs(x - crossing) < 1e-14));
    close(evaluateParameterBounds(box, crossing).lower, 44 / 65);
    for (const [x, value] of [[0, 0], [.4, 0], [.5, .16], [.7, .48], [.8, .64], [.9, .6], [1, .5]]) {
        close(evaluateParameterBounds(box, x).lower, value);
        close(fromCurve(envelope.lower, x), value);
    }
});

test('independent parameter samples are contained and both witnesses attain the bounds', () => {
    const boxes = [createParameterBox(), { a: [0, .1], b: [.15, .6], c: [.4, .9], d: [0, .35] }];
    for (const box of boxes) for (let ix = 0; ix <= 40; ix += 1) {
        const x = ix / 40, result = evaluateParameterBounds(box, x);
        close(oracle(x, result.lowerParameters), result.lower);
        close(oracle(x, result.upperParameters), result.upper);
        for (let code = 0; code < 81; code += 1) {
            let n = code;
            const p = Object.fromEntries(['a', 'b', 'c', 'd'].map(key => {
                const t = (n % 3) / 2; n = Math.floor(n / 3);
                return [key, box[key][0] + t * (box[key][1] - box[key][0])];
            }));
            const y = oracle(x, p);
            assert.ok(y >= result.lower - 1e-12 && y <= result.upper + 1e-12);
        }
    }
});

test('each polygonal cell describes the whole exact band on its input interval', () => {
    const box = createParameterBox(), envelope = parameterEnvelope(box);
    assert.equal(envelope.cells.length, 6);
    assert.equal(envelope.cells[0].lower, 0);
    assert.equal(envelope.cells.at(-1).upper, 1);
    for (const cell of envelope.cells) {
        assert.equal(cell.vertices.length, 4);
        for (const t of [0, .13, .5, .91, 1]) {
            const x = cell.lower + t * (cell.upper - cell.lower);
            const exact = evaluateParameterBounds(box, x);
            close(cell.lowerLine.slope * x + cell.lowerLine.intercept, exact.lower);
            close(cell.upperLine.slope * x + cell.upperLine.intercept, exact.upper);
            for (const q of [.1, .5, .9]) {
                const y = exact.lower + q * (exact.upper - exact.lower);
                const restored = reconstructParameters(box, x, y);
                assert.equal(restored.converged, true);
                close(oracle(x, restored.parameters), y, 1.1e-10);
            }
        }
    }
});

test('reconstruction keeps all parameters in their box including endpoints and knots', () => {
    const box = createParameterBox();
    for (const x of [0, .2, .3, .4, .7, .8, 107 / 130, .9, 1]) {
        const band = evaluateParameterBounds(box, x);
        for (const fraction of [0, .01, .25, .5, .75, .99, 1]) {
            const y = band.lower + fraction * (band.upper - band.lower);
            const result = reconstructParameters(box, x, y, { tolerance: 1e-12 });
            assert.equal(result.converged, true);
            close(productionRate(x, result.parameters), y, 1.01e-12);
            for (const key of ['a', 'b', 'c', 'd']) {
                assert.ok(result.parameters[key] >= box[key][0] && result.parameters[key] <= box[key][1]);
            }
        }
    }
});

test('a singleton box reduces to the original response and has no artificial output freedom', () => {
    const box = { a: [.3, .3], b: [.8, .8], c: [.9, .9], d: [.6, .6] };
    const p = { a: .3, b: .8, c: .9, d: .6 }, envelope = parameterEnvelope(box);
    for (let i = 0; i <= 100; i += 1) {
        const x = i / 100, y = oracle(x, p), result = evaluateParameterBounds(box, x);
        close(result.lower, y); close(result.upper, y);
        close(fromCurve(envelope.lower, x), y); close(fromCurve(envelope.upper, x), y);
        assert.equal(reconstructParameters(box, x, y).converged, true);
    }
});

test('flat tails, zero lower bounds and zero responses preserve all degeneracies', () => {
    for (const box of [
        { a: [0, .2], b: [.3, .8], c: [.6, .6], d: [.6, .6] },
        { a: [0, .2], b: [.3, .8], c: [0, 1], d: [0, 0] },
        { a: [.1, .2], b: [.3, .8], c: [0, 0], d: [0, 0] },
    ]) {
        const envelope = parameterEnvelope(box);
        for (let i = 0; i <= 40; i += 1) {
            const x = i / 40, band = evaluateParameterBounds(box, x);
            close(fromCurve(envelope.lower, x), band.lower);
            close(fromCurve(envelope.upper, x), band.upper);
            assert.equal(reconstructParameters(box, x, (band.lower + band.upper) / 2).converged, true);
        }
    }
});

test('invalid or coupled parameter domains are rejected rather than treated as independent boxes', () => {
    const box = createParameterBox();
    for (const invalid of [null, [], {}, { ...box, a: [.4, .2] }, { ...box, a: [.2, .7] },
        { ...box, b: [.7, 1] }, { ...box, d: [.5, .9] }, { ...box, a: [-.1, .2] },
        { ...box, c: [.8, Infinity] }, { ...box, b: ['.7', .9] }, { ...box, extra: [0, 1] }]) {
        assert.throws(() => validateParameterBox(invalid));
    }
    for (const x of [-.01, 1.01, NaN, '0.5']) assert.throws(() => evaluateParameterBounds(box, x));
});

test('reconstruction reports unresolved iterations and never conceals a nonzero target error', () => {
    const box = createParameterBox();
    const unresolved = reconstructParameters(box, .8, .81, { maxIterations: 0 });
    assert.equal(unresolved.converged, false);
    assert.ok(unresolved.error > .1);
    const rounded = reconstructParameters(box, 0, -1e-12);
    assert.equal(rounded.output, 0); assert.equal(rounded.target, -1e-12);
    assert.equal(rounded.error, 1e-12); assert.equal(rounded.converged, true);
    assert.throws(() => reconstructParameters(box, .8, .5));
    assert.throws(() => reconstructParameters(box, .8, 1.1));
    assert.throws(() => reconstructParameters(box, .8, .8, { tolerance: 0 }));
    assert.throws(() => reconstructParameters(box, .8, .8, { maxIterations: -1 }));
});

test('box and envelope calls do not mutate caller data and presets are independent', () => {
    const box = createParameterBox(), original = structuredClone(box);
    parameterEnvelope(box); evaluateParameterBounds(box, .8); reconstructParameters(box, .8, .81);
    assert.deepEqual(box, original);
    const checked = validateParameterBox(box); checked.a[0] = 0;
    assert.deepEqual(box, original);
    createParameterBox().a[0] = 0;
    assert.equal(createParameterBox().a[0], .2);
});

test('production is input times coefficient and never exceeds its input', () => {
    const box = createParameterBox();
    const band = evaluateProductionParameterBounds(box, .8);
    close(band.lowerCoefficient, .64); close(band.upperCoefficient, 1);
    close(band.lower, .512); close(band.upper, .8);
    for (let i = 0; i <= 100; i += 1) {
        const x = i / 100, production = evaluateProductionParameterBounds(box, x);
        assert.ok(production.lower >= 0 && production.upper <= x + 1e-14);
        close(x * oracle(x, production.lowerParameters), production.lower);
        close(x * oracle(x, production.upperParameters), production.upper);
    }
});

test('production cells contain exact quadratics rather than endpoint polygon approximations', () => {
    const box = createParameterBox(), envelope = productionParameterEnvelope(box);
    assert.equal(envelope.quantity, 'production'); assert.equal(envelope.cells.length, 6);
    const value = (q, x) => q.A * x * x + q.B * x + q.C;
    for (const cell of envelope.cells) {
        assert.equal('vertices' in cell, false);
        for (const t of [0, .13, .5, .91, 1]) {
            const x = cell.lower + t * (cell.upper - cell.lower);
            const band = evaluateProductionParameterBounds(box, x);
            close(value(cell.lowerQuadratic, x), band.lower);
            close(value(cell.upperQuadratic, x), band.upper);
        }
    }
    // Rising production x*(2*x-.4) is convex: its endpoint chord is not exact.
    const cell = envelope.cells.find(item => item.lower === .2 && item.upper === .4);
    const middle = .3;
    close(value(cell.upperQuadratic, middle), .06);
    close((value(cell.upperQuadratic, cell.lower) + value(cell.upperQuadratic, cell.upper)) / 2, .08);
});

test('production reconstruction solves y/x and reports production error at every knot', () => {
    const box = createParameterBox();
    for (const x of [0, .2, .3, .4, .7, .8, 107 / 130, .9, 1]) {
        const band = evaluateProductionParameterBounds(box, x);
        for (const fraction of [0, .01, .25, .5, .75, .99, 1]) {
            const y = band.lower + fraction * (band.upper - band.lower);
            const result = reconstructProductionParameters(box, x, y, { tolerance: 1e-12 });
            assert.equal(result.converged, true);
            close(result.coefficient, oracle(x, result.parameters));
            close(result.output, x * oracle(x, result.parameters));
            close(result.output, y, 1.01e-12);
            close(result.error, Math.abs(result.output - y));
            for (const key of ['a', 'b', 'c', 'd']) assert.ok(result.parameters[key] >= box[key][0] && result.parameters[key] <= box[key][1]);
        }
    }
});

test('zero-input production is exactly zero and tiny target errors remain visible', () => {
    const box = createParameterBox();
    const zero = reconstructProductionParameters(box, 0, 0);
    assert.equal(zero.output, 0); assert.equal(zero.coefficient, 0); assert.equal(zero.iterations, 0);
    assert.equal(zero.converged, true);
    const tiny = reconstructProductionParameters(box, 0, 1e-12);
    assert.equal(tiny.output, 0); assert.equal(tiny.error, 1e-12); assert.equal(tiny.target, 1e-12);
    assert.throws(() => reconstructProductionParameters(box, 0, 1e-3));
    assert.throws(() => reconstructProductionParameters(box, .8, .95));
    assert.throws(() => reconstructProductionParameters(box, .8, .4));
});

test('very small input scales the reconstruction tolerance without dividing by zero', () => {
    const box = { a: [0, 0], b: [1e-9, 2e-9], c: [.8, 1], d: [0, 0] };
    const x = 1e-9, band = evaluateProductionParameterBounds(box, x);
    const y = (band.lower + band.upper) / 2;
    const result = reconstructProductionParameters(box, x, y, { tolerance: 1e-15 });
    assert.equal(result.converged, true);
    close(result.output, y, 1.01e-15);
    assert.ok(Number.isFinite(result.coefficient));
});

test('limited production reconstruction does not turn an approximate target into a feasible claim', () => {
    const result = reconstructProductionParameters(createParameterBox(), .8, .648, { maxIterations: 0 });
    assert.equal(result.converged, false);
    assert.ok(result.error > .1);
    assert.throws(() => reconstructProductionParameters(createParameterBox(), .8, .648, { maxIterations: -1 }));
    assert.throws(() => reconstructProductionParameters(createParameterBox(), .8, .648, { tolerance: 0 }));
});

test('a singleton coefficient box gives the original fixed quadratic production', () => {
    const box = { a: [.3, .3], b: [.8, .8], c: [.9, .9], d: [.6, .6] };
    const p = { a: .3, b: .8, c: .9, d: .6 };
    for (let i = 0; i <= 100; i += 1) {
        const x = i / 100, band = evaluateProductionParameterBounds(box, x), y = x * oracle(x, p);
        close(band.lower, y); close(band.upper, y);
        assert.equal(reconstructProductionParameters(box, x, y).converged, true);
    }
    close(.8 * oracle(.8, p), .72);
    close(.72 * oracle(.72, p), .54432);
});
