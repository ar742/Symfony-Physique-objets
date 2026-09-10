/**
 * Eight fictitious machines, compatible dimensionless flows, one source and sink.
 * No stock, loss, overflow, time stepping or physical optimum is implied.
 * The global calculation covers closed affine regimes using numerical LP bounds.
 */
import { productionRate } from './production-engine.mjs';

const CONTROL_KEYS = ['u', 's1', 's3', 's5'];
const EDGE_PAIRS = [[1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6], [5, 7], [6, 8], [7, 8]];
export const OPTIMISATION_GRAPH = Object.freeze({
    nodes: Object.freeze(Array.from({ length: 8 }, (_, index) => Object.freeze({ id: `M${index + 1}`, name: `Machine ${index + 1}` }))),
    edges: Object.freeze(EDGE_PAIRS.map(([from, to]) => Object.freeze({ id: `M${from}M${to}`, from: `M${from}`, to: `M${to}`, conversion: 1 }))),
});

function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} doit être un nombre fini.`);
}

function unit(value, label) {
    finite(value, label);
    if (value < 0 || value > 1) throw new RangeError(`${label} doit appartenir à [0, 1].`);
}

function prepare(model) {
    if (!model || typeof model !== 'object' || Array.isArray(model)) throw new TypeError('Un scénario est requis.');
    productionRate(0, model.parameters);
    unit(model.budget, 'Le budget B');
    return { parameters: { ...model.parameters }, budget: model.budget };
}

function controlsFor(controls, budget) {
    if (!controls || typeof controls !== 'object' || Array.isArray(controls)) throw new TypeError('Les quatre commandes u, s1, s3, s5 sont requises.');
    for (const key of CONTROL_KEYS) unit(controls[key], `La commande ${key}`);
    if (controls.u > budget) throw new RangeError('La source u dépasse le budget B.');
    return Object.fromEntries(CONTROL_KEYS.map(key => [key, controls[key]]));
}

function optionsOnly(options, keys) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Les options doivent former un objet.');
    for (const key of Object.keys(options)) if (!keys.includes(key)) throw new TypeError(`Option inconnue : ${key}.`);
}

export function createOptimisationScenario(preset = 'plateau') {
    if (!['plateau', 'active'].includes(preset)) throw new RangeError(`Scénario inconnu : ${preset}.`);
    return {
        preset,
        title: preset === 'active' ? 'Départ sur une chaîne active' : 'Départ au-dessous des seuils',
        description: 'Huit machines fictives, un budget commun et aucune sortie intermédiaire ; seule M8 fournit la production finale.',
        parameters: { a: 0.1, b: 0.5, c: 0.8, d: 0.4 },
        budget: 0.2,
        initialControls: preset === 'active' ? { u: 0.196, s1: 1, s3: 1, s5: 1 } : { u: 0, s1: 0.5, s3: 0.5, s5: 0.5 },
    };
}

function evaluatePrepared(model, controls) {
    const input = Array(8).fill(null);
    const outputs = Array(8).fill(null);
    const flows = [];
    input[0] = controls.u;
    const outgoing = [
        [[1, controls.s1], [2, 1 - controls.s1]],
        [[3, 1]],
        [[3, controls.s3], [4, 1 - controls.s3]],
        [[5, 1]],
        [[5, controls.s5], [6, 1 - controls.s5]],
        [[7, 1]],
        [[7, 1]],
        [],
    ];
    for (let i = 0; i < 8; i += 1) {
        if (input[i] === null) input[i] = 0;
        if (input[i] > 1 || input[i] < 0 || !Number.isFinite(input[i])) {
            return { feasible: false, reason: `L’alimentation de M${i + 1} sort de [0, 1] ; aucun écrêtage n’est appliqué.`, controls: { ...controls }, input, outputs, flows, production: null };
        }
        outputs[i] = productionRate(input[i], model.parameters);
        for (const [destination, fraction] of outgoing[i]) {
            const amount = fraction * outputs[i];
            input[destination] = (input[destination] ?? 0) + amount;
            flows.push({ from: `M${i + 1}`, to: `M${destination + 1}`, fraction, conversion: 1, amount });
        }
    }
    return { feasible: true, reason: null, controls: { ...controls }, input, outputs, flows, production: outputs[7] };
}

/** Splits s1, s3, s5 designate respectively M2, M4, M6 as first destination. */
export function evaluateOptimisation(model, controls = model?.initialControls) {
    const ready = prepare(model);
    return evaluatePrepared(ready, controlsFor(controls, ready.budget));
}

/** Deterministic coordinate search with strict improvement, no walk across ties. */
export function optimiseLocal(model, options = {}) {
    const ready = prepare(model);
    optionsOnly(options, ['initialControls', 'sourceStep', 'splitStep', 'minStep', 'maxIterations']);
    let sourceStep = options.sourceStep ?? 0.02;
    let splitStep = options.splitStep ?? 0.1;
    const minStep = options.minStep ?? 1e-5;
    const maxIterations = options.maxIterations ?? 80;
    for (const [key, value] of Object.entries({ sourceStep, splitStep, minStep })) {
        finite(value, key);
        if (value <= 0 || value > 1) throw new RangeError(`${key} doit appartenir à ]0, 1].`);
    }
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || maxIterations > 10000) throw new RangeError('maxIterations doit être un entier de 0 à 10000.');
    let best = evaluatePrepared(ready, controlsFor(options.initialControls ?? model.initialControls, ready.budget));
    if (!best.feasible) throw new RangeError(`Le départ local est incompatible : ${best.reason}`);
    let evaluations = 1;
    let iterations = 0;
    const history = [{ iteration: 0, controls: { ...best.controls }, production: best.production, sourceStep, splitStep, accepted: false }];
    while (iterations < maxIterations && Math.max(sourceStep, splitStep) >= minStep) {
        iterations += 1;
        let candidateBest = best;
        const seen = new Set();
        for (const key of CONTROL_KEYS) {
            const step = key === 'u' ? sourceStep : splitStep;
            const upper = key === 'u' ? ready.budget : 1;
            for (const direction of [1, -1]) {
                const trial = { ...best.controls, [key]: Math.min(upper, Math.max(0, best.controls[key] + direction * step)) };
                const signature = CONTROL_KEYS.map(name => trial[name]).join(',');
                if (trial[key] === best.controls[key] || seen.has(signature)) continue;
                seen.add(signature);
                const candidate = evaluatePrepared(ready, trial);
                evaluations += 1;
                // Suppress changes below floating arithmetic noise, not scientific differences.
                const improvement = 64 * Number.EPSILON * Math.max(1, Math.abs(candidateBest.production));
                if (candidate.feasible && candidate.production > candidateBest.production + improvement) candidateBest = candidate;
            }
        }
        const accepted = candidateBest !== best;
        best = candidateBest;
        if (!accepted) { sourceStep /= 2; splitStep /= 2; }
        history.push({ iteration: iterations, controls: { ...best.controls }, production: best.production, sourceStep, splitStep, accepted });
    }
    return { best, history, evaluations, iterations, status: Math.max(sourceStep, splitStep) < minStep ? 'step-limit' : 'iteration-limit' };
}

// An affine expression is [coefficient(u), coefficient(p12), coefficient(p34),
// coefficient(p56), constant]. Eliminating balances avoids variable split products.
const zero = () => [0, 0, 0, 0, 0];
const variable = index => Array.from({ length: 5 }, (_, i) => i === index ? 1 : 0);
const add = (a, b) => a.map((value, i) => value + b[i]);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const times = (a, scalar, constant = 0) => a.map((value, i) => value * scalar + (i === 4 ? constant : 0));

function makeProgram(model, regimes) {
    const { a, b, c, d } = model.parameters;
    const rising = c / (b - a);
    const falling = (d - c) / (1 - b);
    const definitions = [
        { lower: 0, upper: a, slope: 0, constant: 0 },
        { lower: a, upper: b, slope: rising, constant: -rising * a },
        { lower: b, upper: 1, slope: falling, constant: c - falling * b },
    ];
    const input = Array.from({ length: 8 }, zero);
    const output = Array(8);
    input[0] = variable(0);
    const p12 = variable(1), p34 = variable(2), p56 = variable(3);
    const remainder = [];
    for (let i = 0; i < 8; i += 1) {
        const rule = definitions[regimes[i]];
        output[i] = times(input[i], rule.slope, rule.constant);
        if (i === 0) { input[1] = p12; input[2] = subtract(output[0], p12); remainder.push(input[2]); }
        if (i === 1) input[3] = add(output[1], p34);
        if (i === 2) { input[4] = subtract(output[2], p34); remainder.push(input[4]); }
        if (i === 3) input[5] = add(output[3], p56);
        if (i === 4) { input[6] = subtract(output[4], p56); remainder.push(input[6]); }
        if (i === 5) input[7] = output[5];
        if (i === 6) input[7] = add(input[7], output[6]);
    }
    const A = [], rhs = [], rawA = [], rawRhs = [], labels = [];
    function constraint(expression, bound, label) {
        const row = expression.slice(0, 4);
        const value = bound - expression[4];
        // Scaling preserves each inequality and makes simplex tolerances useful.
        const scale = Math.max(1, Math.abs(value), ...row.map(Math.abs));
        rawA.push(row); rawRhs.push(value);
        A.push(row.map(entry => entry / scale)); rhs.push(value / scale); labels.push(label);
    }
    for (let i = 0; i < 8; i += 1) {
        const rule = definitions[regimes[i]];
        constraint(input[i], rule.upper, `M${i + 1}:upper`);
        constraint(times(input[i], -1), -rule.lower, `M${i + 1}:lower`);
    }
    remainder.forEach((expression, index) => constraint(times(expression, -1), 0, `remainder:${[1, 3, 5][index]}`));
    const bounds = [model.budget, 1, 1, 1];
    bounds.forEach((bound, index) => constraint(variable(index), bound, `variable:${index}:upper`));
    const objective = output[7].slice(0, 4), constant = output[7][4];
    if (![...A.flat(), ...rhs, ...rawA.flat(), ...rawRhs, ...objective, constant].every(Number.isFinite)) return null;
    return { A, rhs, rawA, rawRhs, objective, constant, bounds, labels };
}

/**
 * Small, two-phase primal simplex: maximise c*x with A*x<=b and x>=0.
 * Slack IDs remain attached to original rows so the final row supplies multipliers.
 * Bland ordering and a pivot limit make degeneracy deterministic and bounded.
 */
function linearProgram(A, rhs, objective) {
    const m = rhs.length, n = objective.length;
    const epsilon = 2e-11;
    const basis = Array.from({ length: m }, (_, i) => n + i);
    const nonbasis = [...Array.from({ length: n }, (_, i) => i), -1];
    const table = Array.from({ length: m + 2 }, () => Array(n + 2).fill(0));
    for (let i = 0; i < m; i += 1) {
        for (let j = 0; j < n; j += 1) table[i][j] = A[i][j];
        table[i][n] = -1;
        table[i][n + 1] = rhs[i];
    }
    for (let j = 0; j < n; j += 1) table[m][j] = -objective[j];
    table[m + 1][n] = 1;
    let pivots = 0;
    function pivot(row, column) {
        const inverse = 1 / table[row][column];
        for (let i = 0; i < m + 2; i += 1) if (i !== row) {
            const factor = table[i][column] * inverse;
            for (let j = 0; j < n + 2; j += 1) if (j !== column) table[i][j] -= table[row][j] * factor;
        }
        for (let j = 0; j < n + 2; j += 1) if (j !== column) table[row][j] *= inverse;
        for (let i = 0; i < m + 2; i += 1) if (i !== row) table[i][column] *= -inverse;
        table[row][column] = inverse;
        [basis[row], nonbasis[column]] = [nonbasis[column], basis[row]];
        pivots += 1;
    }
    function simplex(phase) {
        const objectiveRow = phase === 1 ? m + 1 : m;
        while (pivots < 3000) {
            let column = -1;
            for (let j = 0; j <= n; j += 1) {
                if (phase === 2 && nonbasis[j] === -1) continue;
                if (table[objectiveRow][j] < -epsilon && (column < 0 || nonbasis[j] < nonbasis[column])) column = j;
            }
            if (column < 0) return 'optimal';
            let row = -1;
            for (let i = 0; i < m; i += 1) if (table[i][column] > epsilon) {
                if (row < 0) { row = i; continue; }
                const ratio = table[i][n + 1] / table[i][column];
                const incumbent = table[row][n + 1] / table[row][column];
                if (ratio < incumbent - epsilon || (Math.abs(ratio - incumbent) <= epsilon && basis[i] < basis[row])) row = i;
            }
            if (row < 0) return 'unbounded';
            pivot(row, column);
            if (!Number.isFinite(table[objectiveRow][n + 1])) return 'uncertain';
        }
        return 'uncertain';
    }
    function multipliers(objectiveRow) {
        const result = Array(m).fill(0);
        for (let j = 0; j <= n; j += 1) {
            const originalRow = nonbasis[j] - n;
            if (originalRow >= 0 && originalRow < m) result[originalRow] = table[objectiveRow][j];
        }
        return result;
    }
    let lowest = 0;
    for (let i = 1; i < m; i += 1) if (table[i][n + 1] < table[lowest][n + 1]) lowest = i;
    if (table[lowest][n + 1] < -epsilon) {
        pivot(lowest, n);
        const phase = simplex(1);
        if (phase !== 'optimal') return { status: 'uncertain', pivots };
        if (table[m + 1][n + 1] < -epsilon) return { status: 'infeasible', multipliers: multipliers(m + 1), pivots };
        if (Math.abs(table[m + 1][n + 1]) > epsilon) return { status: 'uncertain', pivots };
        for (let i = 0; i < m; i += 1) if (basis[i] === -1) {
            let column = -1;
            for (let j = 0; j <= n; j += 1) if (Math.abs(table[i][j]) > epsilon && (column < 0 || nonbasis[j] < nonbasis[column])) column = j;
            if (column >= 0) pivot(i, column);
        }
    }
    const status = simplex(2);
    if (status !== 'optimal') return { status: 'uncertain', pivots };
    const point = Array(n).fill(0);
    for (let i = 0; i < m; i += 1) if (basis[i] >= 0 && basis[i] < n) point[basis[i]] = table[i][n + 1];
    return { status: 'optimal', point, multipliers: multipliers(m), pivots };
}

function dot(a, b) { return a.reduce((total, value, index) => total + value * b[index], 0); }

/**
 * For lambda>=0 and 0<=z<=U:
 * objective(z) <= c0 + lambda*b + sum max(0,c-lambda*A)*U.
 * The same expression with c=c0=0 certifies infeasibility when strictly negative.
 * Residual corrections and explicit outward floating margins are retained for audit.
 */
function lagrangianBound(program, rawMultipliers, objective = program.objective, constant = program.constant) {
    if (!rawMultipliers?.every(Number.isFinite)) return null;
    const multipliers = rawMultipliers.map(value => Math.max(0, value));
    let value = constant;
    let magnitude = Math.abs(constant);
    for (let i = 0; i < program.rhs.length; i += 1) {
        const term = multipliers[i] * program.rhs[i];
        value += term; magnitude += Math.abs(term);
    }
    let dualResidual = 0, correction = 0, coefficientMargin = 0;
    for (let j = 0; j < 4; j += 1) {
        let residual = objective[j], columnMagnitude = Math.abs(objective[j]);
        for (let i = 0; i < program.A.length; i += 1) {
            const term = multipliers[i] * program.A[i][j];
            residual -= term; columnMagnitude += Math.abs(term);
        }
        const allowance = 128 * Number.EPSILON * (1 + columnMagnitude);
        dualResidual = Math.max(dualResidual, residual);
        correction += Math.max(0, residual) * program.bounds[j];
        coefficientMargin += (Math.max(0, residual + allowance) - Math.max(0, residual)) * program.bounds[j];
    }
    const margin = coefficientMargin + 1024 * Number.EPSILON * (1 + magnitude + correction);
    const upperBound = value + correction + margin;
    if (![upperBound, margin, correction].every(Number.isFinite)) return null;
    return { upperBound, multipliers, dualResidual, correction, margin };
}

function primalResidual(program, point) {
    // Check the original inequalities too: a tiny scaled residual can hide a
    // substantial input or balance error when a segment has a very steep slope.
    return Math.max(0, ...point.map(value => -value), ...program.rawA.map((row, i) => dot(row, point) - program.rawRhs[i]));
}

function reconstruct(model, point, tolerance) {
    const box = [model.budget, 1, 1, 1];
    if (point.some((value, i) => !Number.isFinite(value) || value < -tolerance || value > box[i] + tolerance)) return null;
    // Only the LP candidate is rounded back into its known box. User inputs are not.
    const z = point.map((value, i) => Math.min(box[i], Math.max(0, value)));
    const y1 = productionRate(z[0], model.parameters);
    const safeRatio = (numerator, denominator) => {
        if (numerator < -tolerance || numerator > denominator + tolerance) return null;
        if (denominator === 0) return Math.abs(numerator) <= tolerance ? 0.5 : null;
        return Math.max(0, Math.min(1, numerator / denominator));
    };
    const s1 = safeRatio(z[1], y1);
    if (s1 === null) return null;
    const x3 = (1 - s1) * y1;
    if (x3 > 1) return null;
    const y3 = productionRate(x3, model.parameters);
    const s3 = safeRatio(z[2], y3);
    if (s3 === null) return null;
    const x5 = (1 - s3) * y3;
    if (x5 > 1) return null;
    const y5 = productionRate(x5, model.parameters);
    const s5 = safeRatio(z[3], y5);
    if (s5 === null) return null;
    const candidate = evaluatePrepared(model, { u: z[0], s1, s3, s5 });
    return candidate.feasible ? candidate : null;
}

/**
 * Exhaustive 3^8 regime calculation. "certified" is numerical, under the reported
 * residual tolerance and outward margins; it is not an exact-real arithmetic proof.
 * Any unresolved regime retains the universal bound c and prevents this status.
 */
export function optimiseGlobal(model, options = {}) {
    const ready = prepare(model);
    optionsOnly(options, ['tolerance']);
    const tolerance = options.tolerance ?? 1e-8;
    finite(tolerance, 'La tolérance');
    if (tolerance <= 0 || tolerance > 1e-3) throw new RangeError('La tolérance doit appartenir à ]0, 0,001].');
    let best = evaluatePrepared(ready, { u: 0, s1: 0.5, s3: 0.5, s5: 0.5 });
    if (model.initialControls) {
        const initial = evaluatePrepared(ready, controlsFor(model.initialControls, ready.budget));
        if (initial.feasible && initial.production > best.production) best = initial;
    }
    const regimes = { total: 3 ** 8, feasible: 0, infeasible: 0, uncertain: 0 };
    const records = [];
    let upperBound = 0, maxUpperRegime = null, checked = 0;
    for (let code = 0; code < regimes.total; code += 1) {
        const digits = Array(8);
        let rest = code;
        for (let i = 7; i >= 0; i -= 1) { digits[i] = rest % 3; rest = Math.floor(rest / 3); }
        const regime = digits.join('');
        const program = makeProgram(ready, digits);
        let record = { regime, status: 'uncertain', upperBound: ready.parameters.c, primalResidual: null, dualResidual: null, margin: null, multipliers: [] };
        if (program) {
            const scale = Math.max(1, ...program.objective.map(Math.abs));
            const solved = linearProgram(program.A, program.rhs, program.objective.map(value => value / scale));
            if (solved.status === 'infeasible') {
                const certificate = lagrangianBound(program, solved.multipliers, [0, 0, 0, 0], 0);
                if (certificate && certificate.upperBound < 0) {
                    record = { ...record, ...certificate, status: 'infeasible', upperBound: null, infeasibilityBound: certificate.upperBound, pivots: solved.pivots };
                    checked += 1;
                }
            } else if (solved.status === 'optimal') {
                const residual = primalResidual(program, solved.point);
                const certificate = lagrangianBound(program, solved.multipliers.map(value => value * scale));
                const candidate = residual <= tolerance ? reconstruct(ready, solved.point, tolerance) : null;
                if (candidate && candidate.production > best.production) best = candidate;
                if (certificate && residual <= tolerance) {
                    // c is a separate universal bound, also valid when LP roundoff is large.
                    record = { ...record, ...certificate, status: 'feasible', upperBound: Math.min(ready.parameters.c, certificate.upperBound), primalResidual: residual, point: solved.point, pivots: solved.pivots };
                    checked += 1;
                }
            }
        }
        regimes[record.status] += 1;
        if (record.upperBound !== null && record.upperBound > upperBound) { upperBound = record.upperBound; maxUpperRegime = regime; }
        records.push(record);
    }
    // A contradiction between an evaluated feasible point and a bound is reported,
    // never repaired into an apparently successful certificate.
    const inconsistent = upperBound + tolerance < best.production;
    const gap = Math.max(0, upperBound - best.production);
    return {
        best, upperBound, gap, tolerance,
        status: !inconsistent && regimes.uncertain === 0 && gap <= tolerance ? 'certified' : 'uncertain',
        regimes,
        certificates: { checked, total: regimes.total, maxUpperRegime, records, inconsistent, arithmetic: 'floating-point-with-margins' },
    };
}
