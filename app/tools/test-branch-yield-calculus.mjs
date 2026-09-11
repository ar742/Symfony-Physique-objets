import test from 'node:test';
import assert from 'node:assert/strict';
import { createBranchesScenario, evaluateBranches, branchProductionRate } from '../public/scripts/branches-engine.mjs';
import { createInteriorPeakScenario } from '../public/scripts/branch-interior-example.mjs';
import { analyseBranchYieldSurface } from '../public/scripts/branch-yield-calculus.mjs';

const SHARES = ['s1', 's2', 's5', 's3', 's7'];
const close = (actual, expected, tolerance = 1e-11) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}, tolerance ${tolerance}`);
const matrixClose = (actual, expected, tolerance) => actual.forEach((row, i) => row.forEach((value, j) => close(value, expected[i][j], tolerance)));
const edge = (state, id) => state.branches.find(branch => branch.id === id);
function twoSources() {
    const model = createBranchesScenario();
    model.branches.forEach((branch, i) => Object.assign(branch, { a: .0005, b: .003, c: .88 + .007 * i, d: .65 + .005 * i }));
    model.initialControls = { s1: .43, s2: .39, s5: .46, s3: .58, s7: .35 };
    return model;
}
function differences(fn, x, y, h = 2e-5) {
    const z = fn(x, y), xp = fn(x + h, y), xm = fn(x - h, y), yp = fn(x, y + h), ym = fn(x, y - h);
    const cross = (fn(x + h, y + h) - fn(x + h, y - h) - fn(x - h, y + h) + fn(x - h, y - h)) / (4 * h * h);
    return { gradient: [(xp - xm) / (2 * h), (yp - ym) / (2 * h)], hessian: [[(xp - 2 * z + xm) / h ** 2, cross], [cross, (yp - 2 * z + ym) / h ** 2]] };
}
function compare(result, numerical) {
    assert.equal(result.available, true); assert.equal(result.current.smooth, true);
    result.gradient.forEach((value, i) => close(value, numerical.gradient[i], 2e-8));
    matrixClose(result.hessian, numerical.hessian, 4e-6);
}
function flowValue(model, fixed, u, v) {
    const available = branchProductionRate(u, model.branches.find(branch => branch.id === '1-2'));
    return evaluateBranches(model, { ...fixed, s1: u, s2: v / available }).production;
}

test('all 20 ordered share pairs propagate derivatives through two active source routes', () => {
    const model = twoSources(), state = evaluateBranches(model);
    assert.ok(edge(state, '1-2').output > 0 && edge(state, '1-5').output > 0);
    for (const x of SHARES) for (const y of SHARES) {
        if (x === y) continue;
        const result = analyseBranchYieldSurface(state, { mode: 'yield', x, y });
        compare(result, differences((u, v) => evaluateBranches(model, { ...state.controls, [x]: u, [y]: v }).production, state.controls[x], state.controls[y]));
        assert.deepEqual(result.frozen.map(item => item.key), SHARES.filter(key => key !== x && key !== y));
        assert.equal(result.peak, null);
        assert.equal(result.current.derivativeStatus, 'two-sided');
        close(result.current.z, state.production);
    }
});

test('flow derivatives and their reversed axes agree with the independently evaluated network', () => {
    const model = twoSources(), state = evaluateBranches(model);
    const u = edge(state, '1-2').input, v = edge(state, '2-3').input;
    const result = analyseBranchYieldSurface(state);
    compare(result, differences((x, y) => flowValue(model, state.controls, x, y), u, v));
    const inverse = analyseBranchYieldSurface(state, { x: 'x23', y: 'x12' });
    compare(inverse, differences((x, y) => flowValue(model, state.controls, y, x), v, u));
    assert.deepEqual(inverse.gradient, [result.gradient[1], result.gradient[0]]);
    matrixClose(inverse.hessian, [[result.hessian[1][1], result.hessian[1][0]], [result.hessian[0][1], result.hessian[0][0]]], 1e-14);
});

test('flow-to-share change of coordinates includes the nonzero second-order chain terms', () => {
    const model = twoSources(), state = evaluateBranches(model), u = state.controls.s1, t = state.controls.s2;
    const f = analyseBranchYieldSurface(state), s = analyseBranchYieldSurface(state, { mode: 'yield' });
    const law = model.branches.find(branch => branch.id === '1-2');
    const quadratic = (law.d - law.c) / (1 - law.b), linear = law.c - quadratic * law.b;
    const A = branchProductionRate(u, law), first = 2 * quadratic * u + linear, second = 2 * quadratic;
    close(s.gradient[0], f.gradient[0] + f.gradient[1] * t * first);
    close(s.gradient[1], f.gradient[1] * A);
    close(s.hessian[0][0], f.hessian[0][0] + 2 * f.hessian[0][1] * t * first + f.hessian[1][1] * (t * first) ** 2 + f.gradient[1] * t * second);
    close(s.hessian[0][1], f.hessian[0][1] * A + f.hessian[1][1] * t * first * A + f.gradient[1] * first);
    close(s.hessian[1][1], f.hessian[1][1] * A * A);
});

test('changed laws and reordered branches are recalculated; supplied outputs are never trusted', () => {
    const model = twoSources(); model.branches.find(branch => branch.id === '5-3').d = .23;
    const state = evaluateBranches(model), actual = state.production;
    state.production = 999; state.available['8'] = 88;
    state.branches.forEach(branch => { branch.input = 15; branch.output = 42; }); state.branches.reverse();
    const before = JSON.stringify(state);
    const result = analyseBranchYieldSurface(state, { mode: 'yield', x: 's5', y: 's3' });
    close(result.current.z, actual);
    compare(result, differences((x, y) => evaluateBranches(model, { ...state.controls, s5: x, s3: y }).production, state.controls.s5, state.controls.s3));
    assert.equal(JSON.stringify(state), before);
    assert.equal(result.polynomials.length, 12);
    assert.match(result.formula, /Y53=/); assert.match(result.derivativeFormula, /H\(Y\)=2qₑ/);
    assert.match(result.derivativeFormula, /qₑ=−βₑ et lₑ=αₑ/);
    const polynomial = result.polynomials.find(item => item.branch === '5-3');
    const law = model.branches.find(item => item.id === '5-3');
    close(polynomial.quadratic, (law.d - law.c) / (1 - law.b));
    close(polynomial.linear, law.c - polynomial.quadratic * law.b);
    assert.equal('alpha' in polynomial || 'beta' in polynomial, false);
});

test('a variable active kink withholds both derivatives, including roundoff-near knots', () => {
    const model = createBranchesScenario();
    for (const u of [.8, .8 + Number.EPSILON]) {
        const state = evaluateBranches(model, { ...model.initialControls, s1: u, s2: 0 });
        const result = analyseBranchYieldSurface(state);
        assert.equal(result.current.formulaValid, false);
        assert.equal(result.current.derivativeStatus, 'undefined');
        assert.equal(result.gradient, null); assert.equal(result.hessian, null);
        assert.equal(result.peak, null);
    }
});

test('a fixed input at a kink and identically zero paths have zero composed derivatives', () => {
    const model = createBranchesScenario(), state = evaluateBranches(model, { ...model.initialControls, s1: .8, s2: 0 });
    const result = analyseBranchYieldSurface(state, { mode: 'yield', x: 's5', y: 's7', witnessControls: state.controls });
    assert.equal(result.current.smooth, true); assert.deepEqual(result.gradient, [0, 0]);
    assert.deepEqual(result.hessian, [[0, 0], [0, 0]]);
    assert.ok(result.conditions.find(item => item.branch === '1-2').constantInSlice);
    assert.equal(result.peak, null); assert.equal(result.witnessReason, 'hessian-not-negative-definite');
    model.branches.forEach(branch => Object.assign(branch, { c: 0, d: 0 }));
    const zero = analyseBranchYieldSurface(evaluateBranches(model), { mode: 'yield' });
    assert.equal(zero.current.smooth, true); assert.deepEqual(zero.gradient, [0, 0]);
});

test('regular boundaries retain inward derivatives and never produce an interior peak', () => {
    const model = twoSources(), controls = { ...model.initialControls, s2: 0 };
    const state = evaluateBranches(model, controls), result = analyseBranchYieldSurface(state, { mode: 'yield', witnessControls: controls });
    assert.equal(result.current.formulaValid, true);
    assert.equal(result.current.smooth, false); assert.equal(result.current.derivativeStatus, 'one-sided');
    assert.equal(result.current.interior, false); assert.equal(result.peak, null);
    assert.equal(result.conditions.find(item => item.id === 'coordinate-domain').satisfied, false);
    assert.equal(result.witnessReason, 'boundary-witness');
    const h = 1e-6, first = (evaluateBranches(model, { ...controls, s2: h }).production - state.production) / h;
    close(result.gradient[1], first, 3e-6);
    const flows = analyseBranchYieldSurface(state);
    assert.equal(flows.current.derivativeStatus, 'one-sided');
});

test('strict interior witnesses are projected onto the same frozen controls and remain local', () => {
    const model = createInteriorPeakScenario(), controls = { ...model.initialControls, s1: .43, s2: .4, s5: .23, s7: .61 };
    const state = evaluateBranches(model, controls);
    const result = analyseBranchYieldSurface(state, { witnessControls: model.initialControls, expectedProduction: 7 / 32 });
    assert.equal(result.witnessReason, null); assert.equal(result.peak.isolatedInSlice, true);
    assert.equal(result.peak.attained, true); assert.equal(result.peak.globalCertified, false);
    close(result.peak.z, 7 / 32); close(result.peak.x, .5); close(result.peak.y, .125);
    matrixClose(result.peak.hessian, [[-1.5, 0], [0, -4]], 1e-12);
    assert.equal(result.peak.controls.s5, controls.s5); assert.equal(result.peak.controls.s7, controls.s7);
    const inverse = analyseBranchYieldSurface(state, { mode: 'yield', x: 's2', y: 's1', witnessControls: model.initialControls });
    matrixClose(inverse.peak.hessian, [[-.25, 0], [0, -1.5]], 1e-12);
    assert.match(result.summary, /ne prouve pas un maximum global/);
});

test('nonstationary, flat, boundary and incompatible witnesses never get a peak', () => {
    const model = createInteriorPeakScenario(), state = evaluateBranches(model);
    const nonstationary = analyseBranchYieldSurface(state, { witnessControls: { ...state.controls, s1: .4 } });
    assert.equal(nonstationary.peak, null); assert.equal(nonstationary.witnessReason, 'non-stationary-witness');
    const flat = analyseBranchYieldSurface(state, { mode: 'yield', x: 's5', y: 's7', witnessControls: state.controls });
    assert.equal(flat.peak, null); assert.equal(flat.witnessReason, 'hessian-not-negative-definite');
    const bad = analyseBranchYieldSurface(state, { witnessControls: { ...state.controls, s3: 2 } });
    assert.equal(bad.peak, null); assert.equal(bad.witnessReason, 'invalid-witness');
    const wrongExpected = analyseBranchYieldSurface(state, { witnessControls: state.controls, expectedProduction: .3 });
    assert.equal(wrongExpected.peak.attained, false); assert.equal(wrongExpected.peak.globalCertified, false);
});

test('invalid topology, laws, controls, axes and options are declined without mutating inputs', () => {
    const state = evaluateBranches(twoSources());
    for (const invalid of [null, {}, { ...state, feasible: false }, { ...state, controls: { ...state.controls, s1: -1 } },
        { ...state, branches: state.branches.slice(1) }, { ...state, branches: [null, ...state.branches.slice(1)] }]) {
        assert.equal(analyseBranchYieldSurface(invalid).available, false);
    }
    const badLaw = structuredClone(state); badLaw.branches[0].parameters.a = 1;
    assert.equal(analyseBranchYieldSurface(badLaw).available, false);
    const badGraph = structuredClone(state); badGraph.branches[0].to = '8';
    assert.equal(analyseBranchYieldSurface(badGraph).available, false);
    for (const options of [null, [], { mode: 'nlp' }, { x: 'x12', y: 'x12' }, { x: 's1' }, { unsupported: true }, { expectedProduction: NaN }]) {
        assert.equal(analyseBranchYieldSurface(state, options).available, false);
    }
});
