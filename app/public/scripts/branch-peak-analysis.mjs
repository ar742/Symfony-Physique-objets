/** Explanatory calculus for the exact interior example; no solver uses this module. */
import { evaluateBranches } from './branches-engine.mjs';
import { createInteriorPeakScenario, isInteriorPeakModel } from './branch-interior-example.mjs';

const SPLITS = ['s1', 's2', 's5', 's3', 's7'];
const PARABOLIC = ['1-2', '2-3', '2-8'];
const MAIN = [...PARABOLIC, '1-5'];
const PEAK = 7 / 32;
const SMOOTH_MARGIN = 1e-12;
const branch = (state, id) => state.branches.find(item => item.id === id);
const ordered = (matrix, order) => order.map(i => order.map(j => matrix[i][j]));

function stateModel(state) {
    if (!state?.feasible || !Array.isArray(state.branches)) return null;
    return {
        source: 1,
        branches: state.branches.map(item => item && ({ id: item.id, from: item.from, to: item.to, ...item.parameters })),
    };
}

/** The canonical witness is explicit, independent of an optimisation result. */
export function describeInteriorPeakModel(model) {
    if (!isInteriorPeakModel(model)) return { available: false, reason: 'different-model' };
    const controls = { ...createInteriorPeakScenario().initialControls };
    const state = evaluateBranches(model, controls);
    return {
        available: true,
        scope: 'Témoin analytique explicite du cas de référence à lois fixes, de maximum global 7/32.',
        source: 1,
        branches: state.branches.map(item => ({ id: item.id, from: item.from, to: item.to, ...item.parameters })),
        controls,
        flows: state.branches.map(item => ({ id: item.id, from: item.from, to: item.to,
            fraction: item.fraction, input: item.input, coefficient: item.coefficient, output: item.output })),
        availableAtNodes: { ...state.available },
        production: state.production,
        loss: state.branches.reduce((sum, item) => sum + item.input - item.output, 0),
    };
}

function regimeConditions(state) {
    const u = branch(state, '1-2').input, v = branch(state, '2-3').input;
    const A = branch(state, '1-2').output;
    const conditions = PARABOLIC.map(id => {
        const item = branch(state, id), margin = item.input - item.parameters.b;
        return { id: `parabola-${id}`, label: `${id.replace('-', '→')} : entrée sur la portion g(x)=x(1−x)`,
            input: item.input, threshold: item.parameters.b, satisfied: margin >= 0,
            smooth: margin > SMOOTH_MARGIN };
    });
    // With only s1/s2 varied, every zero downstream path remains structurally
    // zero (1→5 is identically zero, or the fixed s3 routes its full complement).
    const downstream = state.branches.filter(item => !MAIN.includes(item.id));
    conditions.push({
        id: 'downstream-identity',
        label: 'Chaque branche aval alimentée est dans la portion y=x ; les chemins nuls restent nuls à fractions aval figées.',
        satisfied: downstream.every(item => item.input === 0 || item.input >= item.parameters.b),
        smooth: downstream.every(item => item.input === 0 || item.input - item.parameters.b > SMOOTH_MARGIN),
        branches: downstream.map(item => ({ id: item.id, input: item.input, threshold: item.parameters.b,
            inactive: item.input === 0, identity: item.input === 0 || item.input >= item.parameters.b })),
    });
    conditions.push({ id: 'interior-flows', label: '0<u<1 et 0<v<g₁₂(u) : point intérieur des deux entrées admissibles.',
        satisfied: u > 0 && u < 1 && v > 0 && v < A,
        smooth: u > SMOOTH_MARGIN && u < 1 - SMOOTH_MARGIN && v > SMOOTH_MARGIN && A - v > SMOOTH_MARGIN });
    return conditions;
}

function calculus(state, mode) {
    const u = state.controls.s1, t = state.controls.s2, v = branch(state, '2-3').input;
    const p = u * (1 - u), du = 1 - 2 * u;
    if (mode === 'flows') {
        const factor = 1 - 2 * p + 2 * v;
        return { variables: [u, v], value: p - v * v - (p - v) ** 2,
            gradient: [factor * du, 2 * p - 4 * v],
            hessian: [[-2 * factor - 2 * du * du, 2 * du], [2 * du, -4]] };
    }
    const K = t * t + (1 - t) ** 2, factor = 1 - 2 * p * K;
    const cross = 4 * p * du * (1 - 2 * t);
    return { variables: [u, t], value: p - p * p * K,
        gradient: [factor * du, 2 * p * p * (1 - 2 * t)],
        hessian: [[-2 * factor - 2 * K * du * du, cross], [cross, -4 * p * p]] };
}

function pointAnalysis(state, mode, order) {
    const conditions = regimeConditions(state), value = calculus(state, mode);
    const formulaValid = conditions.filter(item => item.id !== 'interior-flows').every(item => item.satisfied);
    const smooth = formulaValid && conditions.every(item => item.smooth);
    const hessian = smooth ? ordered(value.hessian, order) : null;
    return {
        x: value.variables[order[0]], y: value.variables[order[1]], z: state.production,
        formulaValue: formulaValid ? value.value : null,
        formulaValid, smooth, conditions,
        gradient: smooth ? order.map(i => value.gradient[i]) : null,
        hessian,
        stationary: smooth ? value.gradient.every(item => Math.abs(item) <= 1e-10) : null,
        negativeDefinite: smooth ? hessian[0][0] < 0 && hessian[0][0] * hessian[1][1] - hessian[0][1] ** 2 > 0 : null,
    };
}

/**
 * Analyse the reference point and the analytic peak in its same frozen slice.
 * state follows evaluateBranches; its outputs are recomputed, never trusted.
 * x/y may reverse the two axes. Unsupported pairs return an explanation only.
 * Derivatives are withheld at thresholds, outside the parabolic portions, or
 * when a downstream identity path is below its threshold.
 */
export function analyseInteriorPeakSurface(state, options = {}) {
    const mode = options.mode ?? 'flows';
    const canonical = mode === 'flows' ? ['x12', 'x23'] : ['s1', 's2'];
    const x = options.x ?? canonical[0], y = options.y ?? canonical[1];
    const base = { available: false, reason: null, mode, axes: { x, y }, formula: null,
        conditions: [], current: null, gradient: null, hessian: null, peak: null, summary: '' };
    const model = stateModel(state);
    if (!isInteriorPeakModel(model)) return { ...base, reason: 'different-model',
        summary: 'Ces lois ne sont pas celles de l’exemple intérieur ; ses formules ne sont pas appliquées.' };
    if (!['flows', 'yield'].includes(mode)) return { ...base, reason: 'unsupported-mode',
        summary: 'Cette analyse concerne le rendement du réseau, pas le lagrangien affine d’un PL.' };
    let actual;
    try { actual = evaluateBranches(model, state.controls); }
    catch { return { ...base, reason: 'invalid-controls', summary: 'Cinq fractions compatibles sont nécessaires pour recalculer cette coupe.' }; }
    const variables = mode === 'yield' ? SPLITS : canonical;
    if (x === y || !variables.includes(x) || !variables.includes(y)) return { ...base, reason: 'invalid-axes',
        summary: 'Deux axes distincts de la coupe choisie sont nécessaires.' };
    if (!canonical.includes(x) || !canonical.includes(y)) {
        const inactive = [x, y].filter(key => key === 's5' || key === 's7');
        return { ...base, available: true, reason: 'other-split-pair',
            current: { x: actual.controls[x], y: actual.controls[y], z: actual.production },
            inactiveAxes: inactive,
            summary: inactive.length
                ? `${inactive.join(' et ')} ne modifie pas r : le nœud 5 reçoit zéro. Cette coupe a au moins une direction inactive, donc aucun maximum strict isolé en deux variables.`
                : 'La variation de s3 peut produire des plateaux et des cassures aux seuils aval, voire un maximum de frontière. La formule du sommet intérieur en (s1,s2) ne décrit pas ce couple.' };
    }
    const order = [canonical.indexOf(x), canonical.indexOf(y)];
    const current = pointAnalysis(actual, mode, order);
    const peakState = evaluateBranches(model, { ...actual.controls, s1: .5, s2: .5 });
    const peak = pointAnalysis(peakState, mode, order);
    const attained = peak.formulaValid && Math.abs(peak.z - PEAK) < 1e-12;
    const reason = current.smooth ? null : current.formulaValid ? 'threshold-or-boundary' : 'outside-analytic-regime';
    const axisNote = order[0] === 1 ? ' Les composantes du gradient et de la Hessienne suivent les axes inversés affichés.' : '';
    return {
        ...base, available: true, reason,
        formula: mode === 'flows' ? 'p=u(1−u) ; R(u,v)=p−v²−(p−v)²'
            : 'p=s(1−s), K=t²+(1−t)² ; S(s,t)=p−p²K',
        canonicalAxes: mode === 'flows' ? { u: 'x12', v: 'x23' } : { s: 's1', t: 's2' },
        derivativeFormula: mode === 'flows'
            ? '∂R/∂u=(1−2p+2v)(1−2u) ; ∂R/∂v=2p−4v'
            : '∂S/∂s=(1−2pK)(1−2s) ; ∂S/∂t=2p²(1−2t)',
        conditions: current.conditions,
        frozen: ['s3', 's5', 's7'].map(key => ({ key, value: actual.controls[key] })),
        current, gradient: current.gradient, hessian: current.hessian,
        peak: { ...peak, attained, isolatedInSlice: attained && peak.smooth,
            expectedProduction: PEAK,
            scope: 'Point calculé avec les mêmes trois fractions aval figées ; il ne décrit pas un optimum unique dans les cinq fractions.' },
        summary: (current.smooth
            ? 'Au point courant, les portions paraboliques et les branches aval sans perte donnent cette formule locale exacte du rendement. '
            : current.formulaValid
                ? 'La valeur de la formule est correcte ici, mais un seuil ou une frontière empêche de lui attribuer une Hessienne physique locale sans autre examen. '
                : 'Au point courant, un seuil ou une perte aval empêche d’utiliser cette formule locale ; le rendement affiché est recalculé avec toutes les branches. ')
            + (attained && peak.smooth
                ? 'Dans cette même coupe, le point de sommet a un gradient nul et une Hessienne définie négative : maximum intérieur strict, de valeur 7/32. '
                : 'Les fractions aval figées ne permettent pas d’affirmer le sommet intérieur lisse 7/32 dans cette coupe. ')
            + 'La preuve analytique particulière et les bornes du solveur restent distinctes.' + axisNote,
    };
}
