import test from 'node:test';
import assert from 'node:assert/strict';
import { createActiveBranchesScenario, isActiveBranchesModel, ACTIVE_BRANCH_ANALYTICS as analytic } from '../public/scripts/branch-active-example.mjs';
import { createBranchesScenario, evaluateBranches, branchProductionRate, optimiseBranchesGlobal, searchBranchesGrid } from '../public/scripts/branches-engine.mjs';

const model = createActiveBranchesScenario(), keys = analytic.sharesOrder, target = analytic.upperBound;
const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}, tolerance ${tol}`);
const at = changes => evaluateBranches(model, { ...model.initialControls, ...changes });
let seed = 129817;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
const weight = edge => edge.nu * edge.beta;

function negativeDefinite(H) {
    const L = H.map(row => row.map(() => 0));
    for (let i = 0; i < H.length; i++) for (let j = 0; j <= i; j++) {
        const value = -H[i][j] - L[i].slice(0, j).reduce((sum, v, k) => sum + v * L[j][k], 0);
        if (i === j) { assert.ok(value > 0); L[i][j] = Math.sqrt(value); }
        else L[i][j] = value / L[j][j];
    }
}

test('the initial state feeds all twelve branches and satisfies the raw node ratio excluding source', () => {
    const state = at();
    assert.equal(state.feasible, true); assert.equal(state.branches.length, 12);
    for (const item of state.branches) { assert.ok(item.input > .001); assert.ok(item.output > 0); assert.ok(item.output <= item.input); }
    close(Math.min(...state.branches.map(edge => edge.input)), .1125);
    close(Math.min(...state.branches.map(edge => edge.output)), .106875);
    for (const [id, amount] of Object.entries(analytic.nodeInputs)) close(state.available[id], amount);
    const values = Object.entries(state.available).filter(([id]) => id !== '1').map(([, value]) => value);
    close(Math.max(...values) / Math.min(...values), 1600 / 1083);
    assert.ok(analytic.ratio < 1.5); assert.ok(state.available['1'] / Math.min(...values) > 1.5);
    close(state.production, 143217 / 320000);
    close(state.branches.reduce((sum, edge) => sum + edge.input - edge.output, 0), 1 - target);
});

test('recognition is exact and construction is fresh, while the original example stays unchanged', () => {
    assert.equal(isActiveBranchesModel(model), true);
    assert.equal(isActiveBranchesModel({ ...model, branches: model.branches.toReversed(), initialControls: {} }), true);
    assert.equal(isActiveBranchesModel(createBranchesScenario()), false);
    for (const invalid of [null, {}, { ...model, source: .9 }, { ...model, branches: model.branches.slice(1) },
        { ...model, branches: model.branches.map((e, i) => i ? e : { ...e, c: e.c + 1e-14 }) },
        { ...model, branches: model.branches.map((e, i) => i ? e : { ...e, to: '5' }) },
        { ...model, branches: model.branches.map((e, i) => i ? e : null) }]) assert.equal(isActiveBranchesModel(invalid), false);
    const another = createActiveBranchesScenario(); another.branches[0].c = .1; another.initialControls.s1 = .1;
    assert.notEqual(model.branches[0].c, .1); assert.equal(model.initialControls.s1, .5);
    assert.throws(() => { analytic.mu[1] = 0; }, TypeError);
});

test('the rational production coefficients define admissible complete laws and the intended witness slopes', () => {
    for (const edge of analytic.branchCoefficients) {
        const law = model.branches.find(e => e.id === edge.id);
        assert.ok(edge.beta > 0 && law.a === 0 && law.b === .001 && 0 < law.d && law.d < law.c && law.c < 1);
        close((law.d - law.c) / (1 - law.b), -edge.beta);
        close(law.c + edge.beta * law.b, edge.alpha);
        close(edge.alpha - 2 * edge.beta * edge.input, edge.muSource / edge.nu);
        close(branchProductionRate(edge.input, law), edge.output);
        close(edge.output / edge.input, edge.coefficient);
    }
});

test('all portions of each law lie below the global parabola with its unique weighted maximum', () => {
    for (const edge of analytic.branchCoefficients) for (let i = 0; i <= 1000; i++) {
        const x = i / 1000, actual = branchProductionRate(x, edge.parameters), parabola = edge.alpha * x - edge.beta * x * x;
        assert.ok(actual <= parabola + 1e-14);
        close(parabola - actual, x <= .001 ? edge.alpha * x * (1 - x / .001) : 0, 1e-13);
        const constant = weight(edge) * edge.input ** 2;
        close(edge.nu * parabola - edge.muSource * x, constant - weight(edge) * (x - edge.input) ** 2);
    }
});

test('the complete free-coordinate L cancels outputs and has the global bound on its whole box', () => {
    for (let sample = 0; sample < 400; sample++) {
        const x = analytic.branchCoefficients.map(() => random()), y = x.map(() => random());
        const balances = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i + 1), i === 0 ? 1 : 0]));
        let r = 0, laws = 0, separated = analytic.mu[1];
        analytic.branchCoefficients.forEach((edge, i) => {
            const g = branchProductionRate(x[i], edge.parameters);
            balances[edge.from] -= x[i];
            if (edge.to === '8') r += y[i]; else balances[edge.to] += y[i];
            laws += edge.nu * (g - y[i]);
            separated += edge.nu * g - edge.muSource * x[i];
        });
        const complete = r + laws + Object.entries(balances).reduce((sum, [id, value]) => sum + analytic.mu[id] * value, 0);
        close(complete, separated, 3e-15); assert.ok(complete <= target + 1e-14);
    }
    close(analytic.mu[1] + analytic.branchCoefficients.reduce((sum, e) => sum + weight(e) * e.input ** 2, 0), target);
});

test('random compatible networks satisfy the stronger squared-distance bound, including off-regime states', () => {
    const samples = Array.from({ length: 400 }, () => Object.fromEntries(keys.map(key => [key, random()])));
    samples.push(Object.fromEntries(keys.map(key => [key, 0])), Object.fromEntries(keys.map(key => [key, 1])));
    for (const controls of samples) {
        const state = evaluateBranches(model, controls);
        const penalty = analytic.branchCoefficients.reduce((sum, e) => sum + weight(e)
            * (state.branches.find(item => item.id === e.id).input - e.input) ** 2, 0);
        assert.ok(penalty > 0); assert.ok(state.production <= target - penalty + 1e-14);
        assert.ok(state.production < target);
    }
});

test('positive supplies give a full-rank input Jacobian and strict curvature in all five shares', () => {
    const ids = ['1-2', '2-3', '5-3', '3-4', '7-6'];
    const J = ids.map(id => analytic.branchCoefficients.find(e => e.id === id).inputJacobian);
    for (let i = 0; i < 5; i++) {
        assert.ok(J[i][i] > 0);
        for (let j = i + 1; j < 5; j++) close(J[i][j], 0);
    }
    analytic.gradient.forEach(value => close(value, 0)); negativeDefinite(analytic.hessian);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
        const H = analytic.hessian; assert.ok(H[i][i] < 0 && H[i][i] * H[j][j] - H[i][j] ** 2 > 0);
    }
});

test('the whole-network gradient and Hessian match independent centered differences', () => {
    const h = 1e-4, f0 = at().production;
    for (let i = 0; i < 5; i++) {
        const key = keys[i], s = model.initialControls[key], plus = at({ [key]: s + h }).production, minus = at({ [key]: s - h }).production;
        close((plus - minus) / (2 * h), 0, 2e-8);
        close((plus - 2 * f0 + minus) / h ** 2, analytic.hessian[i][i], 2e-6);
        for (let j = i + 1; j < 5; j++) {
            const second = keys[j], t = model.initialControls[second];
            const f = (a, b) => at({ [key]: s + a * h, [second]: t + b * h }).production;
            const mixed = (f(1, 1) - f(1, -1) - f(-1, 1) + f(-1, -1)) / (4 * h ** 2);
            close(mixed, analytic.hessian[i][j], 2e-6);
        }
    }
});

test('the exact local squared-distance identity uses the full nonlinear input recurrences', () => {
    for (let sample = 0; sample < 100; sample++) {
        const controls = Object.fromEntries(keys.map(key => [key, model.initialControls[key] + (random() - .5) * .1]));
        const state = evaluateBranches(model, controls);
        assert.ok(state.branches.every(edge => edge.input > .001));
        const penalty = analytic.branchCoefficients.reduce((sum, e) => sum + weight(e)
            * (state.branches.find(item => item.id === e.id).input - e.input) ** 2, 0);
        close(state.production, target - penalty);
    }
});

test('the full tenth-step grid misses s5=one quarter and honestly returns a smaller finite maximum', () => {
    const grid = searchBranchesGrid(model, { divisions: 10, maxEvaluations: 200000 });
    assert.equal(grid.status, 'complete'); assert.equal(grid.evaluated, 161051);
    assert.ok(grid.best.production < target); close(grid.best.production, .44746136331802);
    assert.deepEqual(grid.best.controls, { s1: .5, s2: .5, s5: .3, s3: .5, s7: .5 });
});

test('the independent numerical solver retains its own unfinished bound under a modest budget', () => {
    const result = optimiseBranchesGlobal(model, { maxNodes: 1000, tolerance: 1e-7 });
    close(result.best.production, target); assert.ok(result.upperBound >= target - 1e-12);
    assert.equal(result.status, 'node-limit'); assert.equal(result.processedNodes, 1000);
    assert.ok(result.gap > result.tolerance); assert.ok(result.certificates.records.length > 0);
});
