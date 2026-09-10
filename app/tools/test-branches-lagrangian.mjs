import assert from 'node:assert/strict';
import test from 'node:test';
import { createBranchesScenario, optimiseBranchesGlobal, inspectBranchesRelaxation } from '../public/scripts/branches-engine.mjs';
import { createParameterBox } from '../public/scripts/branches-parameter-envelope.mjs';
import { explainBranchesLagrangian, evaluateLagrangianPoint } from '../public/scripts/branches-lagrangian.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const model = createBranchesScenario();
const result = optimiseBranchesGlobal(model);
const diagnostic = explainBranchesLagrangian(model, result);

test('inspection selects an actual solved relaxation containing the unchanged best state', () => {
    assert.equal(diagnostic.available, true);
    assert.equal(diagnostic.scope, 'recorded-linear-relaxation');
    assert.equal(diagnostic.recordId, 55);
    assert.equal(diagnostic.match.bestInRegion, true);
    assert.equal(diagnostic.match.flowResidual, 0);
    assert.equal(diagnostic.match.objectiveResidual, 0);
    const record = result.certificates.records.find(record => record.id === diagnostic.recordId);
    assert.equal(record.lpStatus, 'optimal');
    assert.deepEqual(diagnostic.lpPoint, record.lpPoint);
    assert.equal(diagnostic.search.status, 'certified');
    assert.equal(result.processedNodes, 57);
    close(result.best.production, 0.54432);
    close(result.upperBound, 0.5443200576807237, 1e-13);
});

test('all original rows and added upper-bound rows are named and paired with their actual multipliers', () => {
    const record = result.certificates.records.find(record => record.id === diagnostic.recordId);
    const program = inspectBranchesRelaxation(model, record);
    const n = program.c.length;
    assert.equal(diagnostic.A.length, program.A.length + n);
    assert.equal(diagnostic.variableNames.length, n);
    assert.equal(new Set(diagnostic.variableNames).size, n);
    assert.equal(diagnostic.constraintNames.length, diagnostic.A.length);
    assert.equal(diagnostic.multipliers.length, diagnostic.A.length);
    assert.equal(diagnostic.rowScales.length, diagnostic.A.length);
    assert.ok(diagnostic.constraintNames.every(name => typeof name === 'string' && name.length > 0));
    for (let j = 0; j < n; j += 1) {
        assert.deepEqual(diagnostic.A[program.A.length + j], Array.from({ length: n }, (_, i) => i === j ? 1 : 0));
        assert.equal(diagnostic.b[program.A.length + j], program.bounds[j]);
        assert.match(diagnostic.constraintNames[program.A.length + j], /borne supérieure de variable/);
    }
});

test('denormalisation preserves the lagrangian and its box supremum in unscaled units', () => {
    assert.ok(diagnostic.rowScales.some(scale => scale > 1));
    let constant = diagnostic.constant;
    const coefficients = [...diagnostic.c];
    for (let i = 0; i < diagnostic.A.length; i += 1) {
        close(diagnostic.multipliers[i], diagnostic.scaledMultipliers[i] / diagnostic.rowScales[i], 1e-14);
        assert.ok(diagnostic.multipliers[i] >= 0);
        constant += diagnostic.scaledMultipliers[i] * diagnostic.b[i] / diagnostic.rowScales[i];
        for (let j = 0; j < coefficients.length; j += 1) coefficients[j] -= diagnostic.scaledMultipliers[i] * diagnostic.A[i][j] / diagnostic.rowScales[i];
    }
    close(diagnostic.lagrangian.constant, constant);
    coefficients.forEach((value, index) => close(diagnostic.lagrangian.coefficients[index], value));
    const supremum = constant + coefficients.reduce((sum, value, j) => sum + Math.max(0, value) * diagnostic.bounds[j], 0);
    close(diagnostic.lagrangian.boxSupremum, supremum);
    assert.ok(diagnostic.upperBounds.relaxation >= supremum - 1e-12);
    assert.ok(diagnostic.upperBounds.relaxation - supremum < 1e-8);
});

test('slacks and contributions explain why L at the real state may exceed its production', () => {
    const { atBest, atLp } = diagnostic;
    close(atBest.objective, result.best.production);
    close(atBest.lagrangian, atBest.objective + atBest.contributions.reduce((sum, value) => sum + value, 0));
    close(atBest.lagrangian, diagnostic.lagrangian.constant + dot(diagnostic.lagrangian.coefficients, diagnostic.bestPoint));
    assert.ok(atBest.lagrangian > atBest.objective + 1e-8);
    assert.ok(atBest.feasible && atLp.feasible);
    close(atLp.lagrangian, atLp.objective, 1e-9);
    for (let i = 0; i < diagnostic.A.length; i += 1) {
        close(atBest.slacks[i], diagnostic.b[i] - dot(diagnostic.A[i], diagnostic.bestPoint));
        close(atBest.contributions[i], diagnostic.multipliers[i] * atBest.slacks[i]);
    }
});

test('two-coordinate sections of the actual lagrangian are affine and expose infeasible points', () => {
    const left = [...diagnostic.bestPoint], right = [...diagnostic.bestPoint];
    const index = diagnostic.variableNames.indexOf('x_2_3');
    right[index] = 0.1;
    const middle = left.map((value, i) => (value + right[i]) / 2);
    const a = evaluateLagrangianPoint(diagnostic, left), b = evaluateLagrangianPoint(diagnostic, right), m = evaluateLagrangianPoint(diagnostic, middle);
    close(m.lagrangian, (a.lagrangian + b.lagrangian) / 2);
    assert.ok(b.lagrangian < a.lagrangian);
    assert.equal(b.feasible, false);
    const outside = [...left]; outside[0] = -0.01;
    assert.equal(evaluateLagrangianPoint(diagnostic, outside).feasible, false);
    assert.throws(() => evaluateLagrangianPoint(diagnostic, [NaN]), /dimension/);
});

test('explicit record selection never substitutes multipliers from another or excluded region', () => {
    const root = explainBranchesLagrangian(model, result, { recordId: 0 });
    assert.equal(root.available, true);
    assert.equal(root.recordId, 0);
    assert.ok(root.upperBounds.relaxation > diagnostic.upperBounds.relaxation);
    const excluded = result.certificates.records.find(record => record.intervals[0] && record.intervals[0].upper < result.best.branches[0].input - result.tolerance);
    assert.ok(excluded);
    assert.equal(explainBranchesLagrangian(model, result, { recordId: excluded.id }).available, false);
    assert.equal(explainBranchesLagrangian(model, result, { recordId: 999999 }).available, false);
});

test('a source-cut proof and an unstarted LP search report different reasons without invented lambda', () => {
    const boxes = Object.fromEntries(model.branches.map(branch => [branch.id, createParameterBox()]));
    const bounded = optimiseBranchesGlobal(model, { parameterBoxes: boxes });
    const noLp = explainBranchesLagrangian(model, bounded, { parameterBoxes: boxes });
    assert.equal(noLp.available, false);
    assert.equal(noLp.reason, 'no-linear-program-needed');
    assert.equal(noLp.sourceCertificate.type, 'source-cut-quadratic');
    assert.equal(noLp.multipliers, undefined);
    const changedBoxes = structuredClone(boxes); changedBoxes['1-2'].a[0] = 0.1;
    const staleSource = explainBranchesLagrangian(model, bounded, { parameterBoxes: changedBoxes });
    assert.equal(staleSource.reason, 'problem-provenance-mismatch');
    assert.equal(staleSource.sourceCertificate, null);
    assert.equal(explainBranchesLagrangian(model, bounded).reason, 'parameter-boxes-required');
    const stopped = optimiseBranchesGlobal(model, { maxNodes: 0 });
    assert.equal(explainBranchesLagrangian(model, stopped).reason, 'no-linear-program-recorded');
});

test('partial searches identify their LP separately from the unresolved global problem', () => {
    const partial = optimiseBranchesGlobal(model, { maxNodes: 1 });
    const report = explainBranchesLagrangian(model, partial);
    assert.equal(report.available, true);
    assert.equal(report.search.status, 'node-limit');
    assert.ok(report.search.gap > report.tolerance);
    assert.equal(report.recordId, 0);
});

test('a zero terminal bound closes the search without falsely attributing zero to the positive source bound', () => {
    const terminalZero = createBranchesScenario();
    terminalZero.branches.forEach(branch => {
        if (branch.to === '8') { branch.c = 0; branch.d = 0; }
    });
    const closed = optimiseBranchesGlobal(terminalZero);
    assert.equal(closed.status, 'certified');
    assert.equal(closed.best.production, 0);
    assert.equal(closed.upperBound, 0);
    assert.equal(closed.gap, 0);
    assert.equal(closed.processedNodes, 0);
    assert.equal(closed.certificates.terminalBound, 0);
    assert.ok(closed.certificates.sourceBound > 0);
    assert.equal(closed.certificates.records.length, 0);
    assert.equal(closed.upperBound, Math.min(closed.certificates.universalBound, closed.certificates.terminalBound, closed.certificates.sourceBound));
    const report = explainBranchesLagrangian(terminalZero, closed);
    assert.equal(report.available, false);
    assert.equal(report.reason, 'no-linear-program-needed');
    assert.equal(report.multipliers, undefined);
    assert.equal(report.sourceCertificate.type, 'source-cut-quadratic');
    assert.equal(report.sourceCertificate.status, 'checked');
    assert.equal(report.sourceCertificate.upperBound, closed.certificates.sourceBound);
    assert.ok(report.sourceCertificate.rawMaximum > 0);
});

test('stale, altered or unprovenanced results cannot be attributed to the current model', () => {
    const changed = structuredClone(model); changed.branches[0].b = 0.83;
    assert.equal(explainBranchesLagrangian(changed, result).available, false);
    const stale = structuredClone(result); delete stale.certificates.problemSignature;
    assert.equal(explainBranchesLagrangian(model, stale).reason, 'missing-problem-provenance');
    const altered = structuredClone(result); altered.best.branches[0].input += 0.01;
    assert.equal(explainBranchesLagrangian(model, altered).reason, 'best-state-does-not-match-model');
    const signature = structuredClone(result); signature.certificates.problemSignature = 'another-model';
    assert.equal(explainBranchesLagrangian(model, signature).reason, 'problem-provenance-mismatch');
    const scale = structuredClone(result); scale.certificates.records.find(record => record.id === diagnostic.recordId).certificate.scales[0] = 2;
    assert.equal(explainBranchesLagrangian(model, scale, { recordId: diagnostic.recordId }).available, false);
});

test('inspection preserves caller data and canonical variables when branch records are reordered', () => {
    const saved = JSON.stringify({ model, result });
    const reordered = { ...model, branches: model.branches.toReversed() };
    const report = explainBranchesLagrangian(reordered, result);
    assert.equal(report.available, true);
    assert.deepEqual(report.bestPoint, diagnostic.bestPoint);
    assert.deepEqual(report.variableNames, diagnostic.variableNames);
    assert.equal(JSON.stringify({ model, result }), saved);
    report.A[0][0] += 1;
    report.multipliers[0] += 1;
    assert.equal(JSON.stringify({ model, result }), saved);
});
