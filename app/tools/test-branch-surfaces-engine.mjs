import assert from 'node:assert/strict';
import test from 'node:test';
import { createBranchesScenario, evaluateBranches, optimiseBranchesGlobal, branchProductionRate } from '../public/scripts/branches-engine.mjs';
import { createParameterBox } from '../public/scripts/branches-parameter-envelope.mjs';
import { explainBranchesLagrangian, evaluateLagrangianPoint } from '../public/scripts/branches-lagrangian.mjs';
import { modelForState, sampleYieldSurface, sampleLagrangianSurface, sampleCoupledInputs } from '../public/scripts/branch-surfaces-engine.mjs';

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
const model = createBranchesScenario();
const optimum = optimiseBranchesGlobal(model);
const diagnostic = explainBranchesLagrangian(model, optimum);
const state = optimum.best;
const allPoints = surface => surface.points.flat();

test('yield surface recalculates the network while freezing three fractions and every actual law', () => {
    const snapshot = JSON.stringify(state);
    const surface = sampleYieldSurface(state, { x: 's1', y: 's2', radius: 0.15, steps: 4 });
    assert.equal(surface.kind, 'yield');
    assert.deepEqual(surface.frozen, [{ key: 's5', value: state.controls.s5 }, { key: 's3', value: state.controls.s3 }, { key: 's7', value: state.controls.s7 }]);
    for (const point of allPoints(surface)) {
        const expected = evaluateBranches(model, { ...state.controls, s1: point.x, s2: point.y });
        close(point.z, expected.production);
        assert.equal(point.feasible, true);
        assert.ok(point.z >= 0 && point.z <= 1);
    }
    const marker = surface.markers.find(marker => marker.kind === 'reference');
    assert.equal(marker.x, state.controls.s1); assert.equal(marker.y, state.controls.s2);
    close(marker.z, state.production);
    assert.ok(allPoints(surface).some(point => point.x === marker.x && point.y === marker.y && point.z === marker.z));
    assert.equal(JSON.stringify(state), snapshot);
});

test('a bounded-design state keeps its reconstructed laws instead of substituting the default ones', () => {
    const boxes = Object.fromEntries(model.branches.map(branch => [branch.id, createParameterBox()]));
    const best = optimiseBranchesGlobal(model, { parameterBoxes: boxes }).best;
    const effective = modelForState(best);
    const surface = sampleYieldSurface(best, { x: 's1', y: 's5', steps: 3 });
    close(surface.markers[0].z, 0.9);
    assert.ok(best.branches.some(branch => branch.parameters.b !== model.branches.find(item => item.id === branch.id).b));
    for (const point of allPoints(surface)) close(point.z, evaluateBranches(effective, { ...best.controls, s1: point.x, s5: point.y }).production);
    const original = best.branches[0].parameters.a;
    effective.branches[0].a = 0;
    assert.equal(best.branches[0].parameters.a, original);
});

test('an off-grid reference and a same-slice grid marker are included at their exact coordinates', () => {
    const offGrid = createBranchesScenario(); offGrid.branches.forEach(branch => branch.b = 0.83);
    const reference = evaluateBranches(offGrid, { s1: 0.83, s2: 0, s5: 0, s3: 0, s7: 0 });
    const comparison = evaluateBranches(offGrid, { s1: 0.9, s2: 0, s5: 0, s3: 0, s7: 0 });
    const surface = sampleYieldSurface(reference, { steps: 4, comparison });
    assert.equal(surface.comparisonStatus, 'same-slice');
    const grid = surface.markers.find(marker => marker.kind === 'grid');
    assert.equal(grid.x, 0.9); assert.equal(grid.projected, false);
    close(grid.z, comparison.production);
    assert.ok(allPoints(surface).some(point => point.x === 0.83 && point.y === 0));
    assert.ok(allPoints(surface).some(point => point.x === 0.9 && point.y === 0));
    const outside = sampleYieldSurface(reference, { radius: 0.02, steps: 4, comparison });
    assert.equal(outside.comparisonStatus, 'same-slice-outside');
    assert.equal(outside.markers.length, 1);
});

test('different frozen fractions cause a projected comparison with an actually recomputed production', () => {
    const custom = createBranchesScenario(); custom.branches.forEach(branch => Object.assign(branch, { a: 0, b: 0.5, c: 1, d: 1 }));
    const reference = evaluateBranches(custom, { s1: 0.5, s2: 0, s5: 0, s3: 0, s7: 0 });
    const comparison = evaluateBranches(custom, { s1: 0.6, s2: 0.2, s5: 0.5, s3: 0.5, s7: 0.5 });
    const surface = sampleYieldSurface(reference, { x: 's1', y: 's2', radius: 0.2, steps: 4, comparison });
    const projected = surface.markers.find(marker => marker.kind === 'grid');
    assert.equal(surface.comparisonStatus, 'projected');
    assert.equal(projected.projected, true);
    assert.equal(projected.originalYield, comparison.production);
    const recalculated = evaluateBranches(custom, { ...reference.controls, s1: comparison.controls.s1, s2: comparison.controls.s2 });
    close(projected.z, recalculated.production);
    assert.ok(Math.abs(projected.z - projected.originalYield) > 0.01);
    assert.match(projected.label, /recalculé/);
});

test('a comparison with different laws is excluded even if its two fractions agree', () => {
    const changed = createBranchesScenario(); changed.branches[0].d = 0.5;
    const comparison = evaluateBranches(changed, state.controls);
    const surface = sampleYieldSurface(state, { comparison, steps: 3 });
    assert.equal(surface.comparisonStatus, 'different-laws');
    assert.equal(surface.markers.length, 1);
    assert.equal(surface.markers[0].kind, 'reference');
});

test('the lagrangian surface uses the recorded affine L and flags points outside that LP', () => {
    const first = diagnostic.variableNames.indexOf('x_1_2'), second = diagnostic.variableNames.indexOf('x_2_3');
    const surface = sampleLagrangianSurface(diagnostic, { x: first, y: second, radius: 0.15, steps: 4 });
    assert.equal(surface.recordId, diagnostic.recordId);
    assert.equal(surface.frozen.length, diagnostic.bestPoint.length - 2);
    assert.ok(allPoints(surface).some(point => point.feasible));
    assert.ok(allPoints(surface).some(point => !point.feasible));
    for (const point of allPoints(surface)) {
        const z = [...diagnostic.bestPoint]; z[first] = point.x; z[second] = point.y;
        const expected = evaluateLagrangianPoint(diagnostic, z);
        close(point.z, expected.lagrangian);
        assert.equal(point.feasible, expected.feasible);
        assert.equal(point.residual, expected.residuals.primal);
    }
    const marker = surface.markers[0];
    close(marker.z, diagnostic.atBest.lagrangian);
    assert.ok(marker.z > state.production + 1e-8);
    const row = surface.points[0], firstPoint = row[0], lastPoint = row.at(-1);
    for (const point of row) {
        const fraction = (point.x - firstPoint.x) / (lastPoint.x - firstPoint.x);
        close(point.z, firstPoint.z + fraction * (lastPoint.z - firstPoint.z));
    }
});

test('A2 and A5 follow one source share, producing a curve rather than an independent rectangular domain', () => {
    const curve = sampleCoupledInputs(state, { radius: 0.15, steps: 6 });
    assert.equal(curve.kind, 'coupled');
    assert.equal(curve.points.length, 1);
    assert.equal(curve.frozen.length, 4);
    const branch12 = state.branches.find(branch => branch.id === '1-2').parameters;
    const branch15 = state.branches.find(branch => branch.id === '1-5').parameters;
    for (const point of curve.points[0]) {
        close(point.x, branchProductionRate(point.share, branch12));
        close(point.y, branchProductionRate(1 - point.share, branch15));
        close(point.z, evaluateBranches(model, { ...state.controls, s1: point.share }).production);
        assert.equal(point.feasible, true);
    }
    assert.equal(curve.markers[0].share, state.controls.s1);
    close(curve.markers[0].z, state.production);
});

test('degenerate source-input curves retain finite values when both source productions vanish', () => {
    const highThreshold = createBranchesScenario(); highThreshold.branches.forEach(branch => Object.assign(branch, { a: 0.8, b: 0.9 }));
    const reference = evaluateBranches(highThreshold);
    const curve = sampleCoupledInputs(reference, { radius: 0.1, steps: 4 });
    assert.deepEqual(curve.ranges.x, [0, 0]);
    assert.deepEqual(curve.ranges.y, [0, 0]);
    assert.ok(allPoints(curve).every(point => point.x === 0 && point.y === 0 && point.z === 0));
});

test('invalid windows, repeated coordinates and unavailable diagnostics are rejected', () => {
    for (const options of [{ radius: 0 }, { radius: 1.1 }, { radius: NaN }, { steps: 1 }, { steps: 61 }, { steps: 2.5 }, { x: 's1', y: 's1' }, { x: 'a' }]) assert.throws(() => sampleYieldSurface(state, options));
    for (const options of [{ x: 0, y: 0 }, { x: -1 }, { y: 100 }, { x: 0.5 }, { radius: 0 }]) assert.throws(() => sampleLagrangianSurface(diagnostic, options));
    assert.throws(() => sampleLagrangianSurface({ available: false }), /PL enregistré/);
    assert.throws(() => modelForState({ feasible: false }), /compatible/);
    assert.throws(() => sampleCoupledInputs(state, { steps: 0 }));
});
