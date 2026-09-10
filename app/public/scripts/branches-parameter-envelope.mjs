/**
 * Exact bands for a yield coefficient f and production y=x*f(x).
 * Assumptions: aMax < bMin, bMax < 1, dMax <= cMin, all bounds in [0,1].
 * No objective, parameter cost, network allocation or physical law is added.
 * Affine coefficients and reconstruction are evaluated in floating arithmetic.
 */
import { productionRate } from './production-engine.mjs';

const KEYS = ['a', 'b', 'c', 'd'];

function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} doit être un nombre fini.`);
}

function unit(value, label) {
    finite(value, label);
    if (value < 0 || value > 1) throw new RangeError(`${label} doit appartenir à [0,1].`);
}

/** Fresh optional box around (.3,.8,.9,.6); its bounds are explicit choices. */
export function createParameterBox() {
    return { a: [0.2, 0.4], b: [0.7, 0.9], c: [0.8, 1], d: [0.5, 0.7] };
}

export function validateParameterBox(box) {
    if (!box || typeof box !== 'object' || Array.isArray(box)) throw new TypeError('Une boîte de paramètres a,b,c,d est requise.');
    if (Object.keys(box).some(key => !KEYS.includes(key))) throw new TypeError('La boîte contient un paramètre inconnu.');
    const result = {};
    for (const key of KEYS) {
        if (!Array.isArray(box[key]) || box[key].length !== 2) throw new TypeError(`${key} doit fournir [minimum,maximum].`);
        const [lower, upper] = box[key];
        unit(lower, `${key} minimum`); unit(upper, `${key} maximum`);
        if (lower > upper) throw new RangeError(`Le minimum de ${key} dépasse son maximum.`);
        result[key] = [lower, upper];
    }
    if (!(result.a[1] < result.b[0])) throw new RangeError('Les boîtes doivent respecter aMax < bMin.');
    if (!(result.b[1] < 1)) throw new RangeError('La boîte doit respecter bMax < 1.');
    if (result.d[1] > result.c[0]) throw new RangeError('Les boîtes indépendantes doivent respecter dMax ≤ cMin.');
    return result;
}

function witnesses(box, x) {
    const lowB = { a: box.a[1], b: box.b[0], c: box.c[0], d: box.d[0] };
    const highB = { ...lowB, b: box.b[1] };
    const lowBValue = productionRate(x, lowB);
    const highBValue = productionRate(x, highB);
    const lowerParameters = lowBValue <= highBValue ? lowB : highB;
    // Below bMin: choose the earliest peak. Above bMax: the latest peak.
    // Between them, b=x is admissible and attains cMax exactly.
    const upperParameters = {
        a: box.a[0], b: Math.min(box.b[1], Math.max(box.b[0], x)), c: box.c[1], d: box.d[1],
    };
    return {
        lower: Math.min(lowBValue, highBValue), upper: productionRate(x, upperParameters),
        lowerParameters, upperParameters,
    };
}

/** Extremal COEFFICIENTS f(x) and admissible witnesses at a fixed input x. */
export function evaluateParameterBounds(box, x) {
    const ready = validateParameterBox(box);
    unit(x, 'L’alimentation x');
    return witnesses(ready, x);
}

function sortedUnique(values) {
    return [...new Set(values)].sort((a, b) => a - b);
}

function curve(knots) {
    const segments = knots.slice(0, -1).map((point, i) => {
        const next = knots[i + 1];
        const slope = (next.y - point.y) / (next.x - point.x);
        const intercept = point.y - slope * point.x;
        if (![slope, intercept].every(Number.isFinite)) throw new RangeError('Un intervalle est trop étroit pour une représentation affine numérique finie.');
        return { lower: point.x, upper: next.x, slope, intercept };
    });
    return { knots, segments };
}

/**
 * Each cell is an EXACT feasible (input,COEFFICIENT) band, not production y=x*f.
 * Lower envelope: minimum of the responses with b=bMin and b=bMax, at
 * a=aMax,c=cMin,d=dMin. Between their knots, a crossing is included explicitly.
 * Upper envelope: 0, rising segment, cMax plateau, falling segment.
 */
export function parameterEnvelope(box) {
    const ready = validateParameterBox(box);
    const lowB = { a: ready.a[1], b: ready.b[0], c: ready.c[0], d: ready.d[0] };
    const highB = { ...lowB, b: ready.b[1] };
    const base = sortedUnique([0, ready.a[1], ready.b[0], ready.b[1], 1]);
    const crossings = [];
    for (let i = 0; i < base.length - 1; i += 1) {
        const left = base[i], right = base[i + 1];
        const dl = productionRate(left, lowB) - productionRate(left, highB);
        const dr = productionRate(right, lowB) - productionRate(right, highB);
        if ((dl < 0 && dr > 0) || (dl > 0 && dr < 0)) {
            const crossing = left + (right - left) * (dl / (dl - dr));
            if (crossing > left && crossing < right) crossings.push(crossing);
        }
    }
    const lowerCuts = sortedUnique([...base, ...crossings]);
    const upperCuts = sortedUnique([0, ready.a[0], ready.b[0], ready.b[1], 1]);
    const lower = curve(lowerCuts.map(x => ({ x, y: witnesses(ready, x).lower })));
    const upper = curve(upperCuts.map(x => ({ x, y: witnesses(ready, x).upper })));
    const breakpoints = sortedUnique([...lowerCuts, ...upperCuts]);
    const cells = breakpoints.slice(0, -1).map((left, i) => {
        const right = breakpoints[i + 1];
        const from = witnesses(ready, left), to = witnesses(ready, right);
        const lowerLine = curve([{ x: left, y: from.lower }, { x: right, y: to.lower }]).segments[0];
        const upperLine = curve([{ x: left, y: from.upper }, { x: right, y: to.upper }]).segments[0];
        return {
            lower: left, upper: right,
            vertices: [{ x: left, y: from.lower }, { x: right, y: to.lower }, { x: right, y: to.upper }, { x: left, y: from.upper }],
            lowerLine: { slope: lowerLine.slope, intercept: lowerLine.intercept },
            upperLine: { slope: upperLine.slope, intercept: upperLine.intercept },
        };
    });
    return { box: ready, lower, upper, breakpoints, cells, quantity: 'coefficient', arithmetic: 'floating-point' };
}

/** Production bounds are x times the coefficient bounds because x is nonnegative. */
export function evaluateProductionParameterBounds(box, x) {
    const coefficients = evaluateParameterBounds(box, x);
    return {
        lower: x * coefficients.lower, upper: x * coefficients.upper,
        lowerCoefficient: coefficients.lower, upperCoefficient: coefficients.upper,
        lowerParameters: coefficients.lowerParameters, upperParameters: coefficients.upperParameters,
    };
}

/**
 * Exact curved cells for PRODUCTION, not polygonal cells or their vertex hulls.
 * On each interval a coefficient m*x+p becomes production m*x²+p*x.
 * A subsequent LP relaxation must bound these quadratics over its whole interval.
 */
export function productionParameterEnvelope(box) {
    const coefficients = parameterEnvelope(box);
    const cells = coefficients.cells.map(cell => ({
        lower: cell.lower, upper: cell.upper,
        lowerQuadratic: { A: cell.lowerLine.slope, B: cell.lowerLine.intercept, C: 0 },
        upperQuadratic: { A: cell.upperLine.slope, B: cell.upperLine.intercept, C: 0 },
    }));
    return {
        box: coefficients.box, breakpoints: coefficients.breakpoints, cells,
        quantity: 'production', arithmetic: 'floating-point',
    };
}

function reconstructionOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Les options doivent former un objet.');
    if (Object.keys(options).some(key => !['tolerance', 'maxIterations'].includes(key))) throw new TypeError('Option de reconstruction inconnue.');
    const tolerance = options.tolerance ?? 1e-10;
    const maxIterations = options.maxIterations ?? 80;
    finite(tolerance, 'La tolérance');
    if (tolerance <= 0 || tolerance > 1e-3) throw new RangeError('La tolérance doit appartenir à ]0,0.001].');
    if (!Number.isInteger(maxIterations) || maxIterations < 0 || maxIterations > 256) throw new RangeError('maxIterations doit être un entier entre 0 et 256.');
    return { tolerance, maxIterations };
}

/**
 * The parameter box is convex; theta(t) between extremal witnesses stays in it.
 * f_theta(x) is continuous because b-a stays positive. Its intermediate values
 * therefore cover the whole band. Bisection preserves a sign bracket; no global
 * monotonicity assumption or change of the original response is needed.
 * This helper reconstructs a COEFFICIENT target. For production y=x*f(x), use
 * reconstructProductionParameters, which converts the target and its tolerance.
 */
export function reconstructParameters(box, x, target, options = {}) {
    const ready = validateParameterBox(box);
    unit(x, 'L’alimentation x'); finite(target, 'Le coefficient cible');
    const { tolerance, maxIterations } = reconstructionOptions(options);
    const bounds = witnesses(ready, x);
    if (target < bounds.lower - tolerance || target > bounds.upper + tolerance) throw new RangeError('Le coefficient cible est hors de la bande admissible.');
    const record = (parameters, output, iterations) => ({
        parameters: { ...parameters }, input: x, target, output,
        error: Math.abs(output - target), iterations, converged: Math.abs(output - target) <= tolerance,
    });
    let best = record(bounds.lowerParameters, bounds.lower, 0);
    const last = record(bounds.upperParameters, bounds.upper, 0);
    if (last.error < best.error) best = last;
    if (best.converged) return best;
    let lo = 0, hi = 1;
    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        const t = (lo + hi) / 2;
        if (t === lo || t === hi) break;
        // Clamping only controls interpolation roundoff inside an already valid box.
        const parameters = Object.fromEntries(KEYS.map(key => [key, Math.min(ready[key][1], Math.max(ready[key][0],
            bounds.lowerParameters[key] + t * (bounds.upperParameters[key] - bounds.lowerParameters[key])))]));
        const output = productionRate(x, parameters);
        const current = record(parameters, output, iteration);
        if (current.error < best.error) best = current;
        if (current.converged) return current;
        if (output < target) lo = t; else hi = t;
    }
    return best;
}

/**
 * Reconstruct a PRODUCTION target y=x*f(x). At x=0 production is exactly zero;
 * for x>0 the coefficient target is y/x. Tolerance refers to production, and
 * the reported output/error are always recalculated as x*f_theta(x).
 * A tiny target outside the band may match an endpoint within tolerance;
 * its actual nonzero error is reported. Recheck converged and network balances.
 */
export function reconstructProductionParameters(box, x, target, options = {}) {
    const ready = validateParameterBox(box);
    unit(x, 'L’alimentation x'); finite(target, 'La production cible');
    const { tolerance, maxIterations } = reconstructionOptions(options);
    const bounds = evaluateProductionParameterBounds(ready, x);
    if (target < bounds.lower - tolerance || target > bounds.upper + tolerance) throw new RangeError('La production cible est hors de la bande admissible.');
    const record = (parameters, iterations) => {
        const coefficient = productionRate(x, parameters), output = x * coefficient;
        return { parameters: { ...parameters }, input: x, target, coefficient, output,
            error: Math.abs(output - target), iterations, converged: Math.abs(output - target) <= tolerance };
    };
    let best = record(bounds.lowerParameters, 0);
    const last = record(bounds.upperParameters, 0);
    if (last.error < best.error) best = last;
    // This also covers x=0 without division. No nonzero production is invented.
    if (best.converged || x === 0) return best;
    const restored = reconstructParameters(ready, x, target / x, {
        tolerance: Math.min(1e-3, tolerance / x), maxIterations,
    });
    return record(restored.parameters, restored.iterations);
}
