/**
 * The first reference preset of the twelve-branch workshop, with fixed laws.
 * Its smooth peak is a consequence of y=x*f(x); no objective penalty, nonlinear
 * change of axes or optimum is inserted into either optimisation algorithm.
 */
import { createBranchesScenario } from './branches-engine.mjs';

const PARAMETER_KEYS = ['a', 'b', 'c', 'd'];

/** Fresh editable model; source=1 and the controls put the reference at the peak. */
export function createInteriorPeakScenario() {
    const model = createBranchesScenario();
    model.branches = model.branches.map(branch => {
        let parameters = { a: 0, b: 0.001, c: 1, d: 1 };
        if (branch.id === '1-2') parameters = { a: 0, b: 0.1, c: 0.9, d: 0 };
        else if (branch.id === '1-5') parameters = { a: 0, b: 0.1, c: 0, d: 0 };
        else if (branch.id === '2-3' || branch.id === '2-8') parameters = { a: 0, b: 0.01, c: 0.99, d: 0 };
        return { ...branch, ...parameters };
    });
    model.initialControls = { s1: 0.5, s2: 0.5, s5: 0.5, s3: 1, s7: 0.5 };
    return model;
}

/** Exact topology/law recognition, independent of branch order or initial shares. */
export function isInteriorPeakModel(model) {
    if (!model || model.source !== 1 || !Array.isArray(model.branches) || model.branches.length !== 12) return false;
    if (model.branches.some(branch => !branch || typeof branch !== 'object')) return false;
    const byId = new Map(model.branches.map(branch => [branch.id, branch]));
    if (byId.size !== 12) return false;
    return createInteriorPeakScenario().branches.every(expected => {
        const actual = byId.get(expected.id);
        return actual?.from === expected.from && actual?.to === expected.to
            && PARAMETER_KEYS.every(key => actual[key] === expected[key]);
    });
}

/** Explanatory reference only: neither solver imports or consumes this object. */
export const INTERIOR_PEAK_ANALYTICS = Object.freeze({
    title: 'Cas de référence : maximum global 7/32 à lois fixes',
    axes: Object.freeze({ u: 'x12', v: 'x23' }),
    point: Object.freeze({ u: 0.5, v: 0.125, production: 0.21875 }),
    referenceControls: Object.freeze({ s1: 0.5, s2: 0.5, s5: 0.5, s3: 1, s7: 0.5 }),
    localFormula: 'A=p(u)=u(1−u) ; R(u,v)=A−v²−(A−v)²',
    localConditions: 's3=1 ; u>0,1 ; v>0,01 ; p(u)−v>0,01 ; q(v)>0,001. Les autres fractions et les douze lois restent figées.',
    gradient: Object.freeze([0, 0]),
    hessian: Object.freeze([Object.freeze([-1.5, 0]), Object.freeze([0, -4])]),
    upperBound: 0.21875,
    upperBoundFraction: '7/32',
    boundDerivation: 'p(u)≤u(1−u)≤1/4 ; q(x)≤x(1−x) ; les branches aval ne peuvent amplifier. Avec A=p(u), r≤A−A²/2−2(v−A/2)²≤7/32.',
    interpretation: 'Maximum lisse strict et isolé dans la coupe (u,v) à s3=1. Les cinq fractions du réseau ne sont pas identifiées de manière unique par cet optimum.',
});
