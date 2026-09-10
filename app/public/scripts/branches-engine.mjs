/** Static branch yields: output=x*f(x), source=1, full routing, no added stock. */
import { productionRate } from './production-engine.mjs';
import { solveBoundedLinearProgram } from './bounded-linear-program.mjs';
import { productionParameterEnvelope, reconstructProductionParameters } from './branches-parameter-envelope.mjs';

const PAIRS = [[1, 2], [1, 5], [2, 3], [2, 8], [5, 3], [5, 7], [7, 6], [7, 4], [3, 4], [3, 6], [4, 8], [6, 8]];
const ORDER = ['1', '2', '5', '3', '7', '4', '6', '8'];
const CONTROL_NODES = ['1', '2', '5', '3', '7'];
const KEYS = CONTROL_NODES.map(id => `s${id}`);
export const BRANCH_GRAPH = Object.freeze({
    nodes: Object.freeze(Array.from({ length: 8 }, (_, i) => Object.freeze({ id: String(i + 1), name: `Nœud ${i + 1}` }))),
    edges: Object.freeze(PAIRS.map(([from, to]) => Object.freeze({ id: `${from}-${to}`, from: String(from), to: String(to) }))),
});
const EDGES = BRANCH_GRAPH.edges;
const OUT = Object.fromEntries(ORDER.map(node => [node, EDGES.map((edge, i) => edge.from === node ? i : -1).filter(i => i >= 0)]));
const clip = (x, low, high) => Math.min(high, Math.max(low, x));

/** f is a dimensionless yield coefficient. The actual production is x*f(x). */
export function branchProductionRate(x, parameters) { return x * productionRate(x, parameters); }

function optionsOnly(options, names) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Options invalides.');
    for (const name of Object.keys(options)) if (!names.includes(name)) throw new TypeError(`Option inconnue : ${name}.`);
    for (const name of ['onProgress', 'shouldCancel']) if (options[name] !== undefined && typeof options[name] !== 'function') throw new TypeError(`${name} doit être une fonction.`);
}

function prepare(model) {
    if (!model || model.source !== 1 || !Array.isArray(model.branches) || model.branches.length !== 12) throw new TypeError('Douze branches et une source exactement égale à 1 sont requises.');
    const ids = new Set();
    for (const branch of model.branches) {
        if (!branch || ids.has(branch.id) || !EDGES.some(edge => edge.id === branch.id && edge.from === branch.from && edge.to === branch.to)) throw new TypeError('La topologie des douze branches doit être conservée.');
        ids.add(branch.id);
        productionRate(0, branch);
    }
    return { source: 1, branches: EDGES.map(edge => ({ ...model.branches.find(branch => branch.id === edge.id) })) };
}

function readControls(controls) {
    if (!controls || typeof controls !== 'object' || Array.isArray(controls)) throw new TypeError('Les cinq fractions s1, s2, s5, s3, s7 sont requises.');
    for (const key of KEYS) if (typeof controls[key] !== 'number' || !Number.isFinite(controls[key]) || controls[key] < 0 || controls[key] > 1) throw new RangeError(`${key} doit appartenir à [0, 1].`);
    return Object.fromEntries(KEYS.map(key => [key, controls[key]]));
}

export function createBranchesScenario() {
    return {
        source: 1,
        branches: EDGES.map(edge => ({ ...edge, a: 0.3, b: 0.8, c: 0.9, d: 0.6 })),
        initialControls: Object.fromEntries(KEYS.map(key => [key, 0.5])),
    };
}

function evaluateReady(model, controls, chooseParameters = null) {
    const available = Object.fromEntries(ORDER.map(id => [id, 0]));
    available['1'] = 1;
    const branches = model.branches.map(branch => ({
        id: branch.id, from: branch.from, to: branch.to, input: null, coefficient: null, output: null, fraction: null,
        parameters: Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, branch[key]])),
    }));
    const failure = reason => ({ feasible: false, reason, controls: { ...controls }, available, branches, production: null });
    for (const node of ORDER) {
        const outgoing = OUT[node];
        for (let position = 0; position < outgoing.length; position += 1) {
            const index = outgoing[position];
            const fraction = outgoing.length === 1 ? 1 : position === 0 ? controls[`s${node}`] : 1 - controls[`s${node}`];
            const input = fraction * available[node];
            branches[index].fraction = fraction; branches[index].input = input;
            if (!Number.isFinite(input) || input < 0 || input > 1) return failure(`L’alimentation de la branche ${branches[index].id} sort de [0, 1] ; aucun écrêtage.`);
            if (chooseParameters) {
                const parameters = chooseParameters(index, input);
                if (!parameters) return failure(`Les paramètres de ${branches[index].id} n’ont pas pu être reconstruits.`);
                branches[index].parameters = parameters;
            }
            const coefficient = productionRate(input, branches[index].parameters);
            const output = input * coefficient;
            branches[index].coefficient = coefficient; branches[index].output = output;
            available[branches[index].to] += output;
        }
    }
    return { feasible: true, reason: null, controls: { ...controls }, available, branches, production: available['8'] };
}

/** s7 goes first to 6; s3 goes first to 4. Nodes themselves do not transform. */
export function evaluateBranches(model, controls = model?.initialControls) {
    return evaluateReady(prepare(model), readControls(controls));
}

/** Exact finite grid of fractions k/divisions. An interrupted prefix is not exhaustive. */
export function searchBranchesGrid(model, options = {}) {
    const ready = prepare(model);
    optionsOnly(options, ['divisions', 'maxEvaluations', 'shouldCancel', 'onProgress']);
    const divisions = options.divisions ?? 10;
    const maxEvaluations = options.maxEvaluations ?? 200000;
    if (![5, 10, 20, 50, 100].includes(divisions)) throw new RangeError('divisions doit être 5, 10, 20, 50 ou 100.');
    if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations < 0) throw new RangeError('maxEvaluations doit être un entier positif ou nul sûr.');
    const total = (divisions + 1) ** 5;
    let best = null, evaluated = 0, feasibleCount = 0, cancelled = false;
    const snapshot = () => ({ best, total, evaluated, feasibleCount, complete: evaluated === total, status: evaluated === total ? 'complete' : cancelled ? 'cancelled' : 'evaluation-limit', divisions });
    while (evaluated < total && evaluated < maxEvaluations) {
        if (options.shouldCancel?.()) { cancelled = true; break; }
        let code = evaluated;
        const values = Array(5);
        for (let i = 4; i >= 0; i -= 1) { values[i] = (code % (divisions + 1)) / divisions; code = Math.floor(code / (divisions + 1)); }
        const state = evaluateReady(ready, Object.fromEntries(KEYS.map((key, i) => [key, values[i]])));
        evaluated += 1;
        if (state.feasible) {
            feasibleCount += 1;
            if (!best || state.production > best.production) best = state;
        }
        if (evaluated % 5000 === 0) options.onProgress?.(snapshot());
    }
    const result = snapshot();
    options.onProgress?.(result);
    return result;
}

const quadraticValue = (q, x) => q.A * x * x + q.B * x + q.C;
function quadraticMaximum(q, lower, upper) {
    const candidates = [lower, upper];
    if (q.A !== 0) { const x = -q.B / (2 * q.A); if (x > lower && x < upper) candidates.push(x); }
    return Math.max(...candidates.map(x => quadraticValue(q, x)));
}
function domainMaximum(cells, cap) {
    const values = cells.map(cell => quadraticMaximum(cell.upperQuadratic, cell.lower, cell.upper));
    const magnitude = Math.max(...cells.map(cell => Object.values(cell.upperQuadratic).reduce((sum, value) => sum + Math.abs(value), 0)));
    if (![...values, magnitude].every(Number.isFinite)) return cap;
    return Math.min(cap, Math.max(...values) + 4096 * Number.EPSILON * (1 + magnitude));
}
function affineCell(cell) {
    const a = cell.lowerQuadratic, b = cell.upperQuadratic;
    return a.A === 0 && b.A === 0 && a.B === b.B && a.C === b.C ? { slope: a.B, intercept: a.C } : null;
}
function fixedDomains(ready) {
    return ready.branches.map(({ a, b, c, d }) => {
        const definitions = [
            [0, a, { A: 0, B: 0, C: 0 }],
            [a, b, { A: c / (b - a), B: -a * c / (b - a), C: 0 }],
            [b, 1, { A: (d - c) / (1 - b), B: (c - b * d) / (1 - b), C: 0 }],
        ];
        const cells = definitions.map(([lower, upper, q]) => ({ lower, upper, lowerQuadratic: q, upperQuadratic: q }));
        return { maximum: domainMaximum(cells, c), cells };
    });
}

function supportLines(cell, lower, upper) {
    const low = cell.lowerQuadratic, high = cell.upperQuadratic;
    const secant = q => ({ slope: q.A * (lower + upper) + q.B, intercept: q.C - q.A * lower * upper });
    const tangents = q => [lower, (lower + upper) / 2, upper].map(x => ({ slope: 2 * q.A * x + q.B, intercept: q.C - q.A * x * x }));
    return { below: low.A >= 0 ? tangents(low) : [secant(low)], above: high.A <= 0 ? tangents(high) : [secant(high)] };
}

// Outer polygons for a quadratic band: secants and tangents have known sides.
// Subdivision tightens their error quadratically with interval width.
function outerPolygon(cell, lower = cell.lower, upper = cell.upper) {
    const low = cell.lowerQuadratic, high = cell.upperQuadratic;
    if (![lower, upper, ...Object.values(low), ...Object.values(high)].every(Number.isFinite)) return null;
    let polygon = [{ x: lower, y: 0 }, { x: upper, y: 0 }, { x: upper, y: upper }, { x: lower, y: lower }];
    function cut(a, b, bound) {
        const allowance = 128 * Number.EPSILON * (1 + Math.abs(a) + Math.abs(b) + Math.abs(bound));
        const limit = bound + allowance;
        const next = [];
        for (let i = 0; i < polygon.length; i += 1) {
            const first = polygon[i], second = polygon[(i + 1) % polygon.length];
            const v1 = a * first.x + b * first.y - limit, v2 = a * second.x + b * second.y - limit;
            if (v1 <= 0) next.push(first);
            if ((v1 <= 0) !== (v2 <= 0)) {
                const fraction = v1 / (v1 - v2);
                next.push({ x: first.x + fraction * (second.x - first.x), y: first.y + fraction * (second.y - first.y) });
            }
        }
        polygon = next;
    }
    const { below, above } = supportLines(cell, lower, upper);
    below.forEach(line => cut(line.slope, -1, -line.intercept));
    above.forEach(line => cut(-line.slope, 1, line.intercept));
    return polygon;
}

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function convexHull(points) {
    const sorted = points.filter((point, index) => points.findIndex(other => other.x === point.x && other.y === point.y) === index).sort((a, b) => a.x - b.x || a.y - b.y);
    if (sorted.length <= 2) return sorted;
    const lower = [], upper = [];
    for (const point of sorted) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop(); lower.push(point); }
    for (const point of sorted.toReversed()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop(); upper.push(point); }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function buildProgram(domains, selections, intervals) {
    const freeOutputs = domains.map((domain, index) => selections[index] < 0 || !affineCell(domain.cells[selections[index]]));
    const size = 5 + freeOutputs.filter(Boolean).length;
    const variable = index => Array.from({ length: size + 1 }, (_, i) => i === index ? 1 : 0);
    const scalar = value => [...Array(size).fill(0), value];
    const add = (a, b) => a.map((value, i) => value + b[i]);
    const multiply = (a, b, constant = 0) => a.map((value, i) => value * b + (i === size ? constant : 0));
    const input = Array(12), output = Array(12);
    const available = Object.fromEntries(ORDER.map(node => [node, scalar(0)])); available['1'] = scalar(1);
    const bounds = Array(5).fill(1);
    const variableDetails = CONTROL_NODES.map(node => ({ name: `x_${EDGES[OUT[node][0]].id.replace('-', '_')}`, branch: EDGES[OUT[node][0]].id, quantity: 'input' }));
    let next = 5;
    for (const node of ORDER) for (let position = 0; position < OUT[node].length; position += 1) {
        const index = OUT[node][position];
        input[index] = OUT[node].length === 1 ? available[node] : position === 0 ? variable(CONTROL_NODES.indexOf(node)) : add(available[node], multiply(variable(CONTROL_NODES.indexOf(node)), -1));
        if (freeOutputs[index]) {
            output[index] = variable(next++); bounds.push(domains[index].maximum);
            variableDetails.push({ name: `y_${EDGES[index].id.replace('-', '_')}`, branch: EDGES[index].id, quantity: 'output' });
        }
        else {
            const { slope, intercept } = affineCell(domains[index].cells[selections[index]]);
            output[index] = multiply(input[index], slope, intercept);
        }
        available[EDGES[index].to] = add(available[EDGES[index].to], output[index]);
    }
    const A = [], b = [], constraintNames = [];
    const constrain = (expression, bound, name) => { A.push(expression.slice(0, size)); b.push(bound - expression[size]); constraintNames.push(name); };
    for (let index = 0; index < 12; index += 1) {
        const cells = selections[index] < 0 ? domains[index].cells : [domains[index].cells[selections[index]]];
        const lower = intervals[index]?.lower ?? Math.min(...cells.map(cell => cell.lower)), upper = intervals[index]?.upper ?? Math.max(...cells.map(cell => cell.upper));
        const name = EDGES[index].id;
        constrain(input[index], upper, `${name} : borne supérieure de x`);
        constrain(multiply(input[index], -1), -lower, `${name} : borne inférieure de x`);
        constrain(add(output[index], multiply(input[index], -1)), 0, `${name} : production y ≤ alimentation x`);
        if (!freeOutputs[index]) continue;
        if (selections[index] >= 0) {
            const { below, above } = supportLines(cells[0], lower, upper);
            for (const [lineIndex, line] of below.entries()) {
                const margin = 128 * Number.EPSILON * (1 + Math.abs(line.slope) + Math.abs(line.intercept));
                constrain(add(multiply(input[index], line.slope), multiply(output[index], -1)), -line.intercept + margin,
                    `${name} : minorant ${cells[0].lowerQuadratic.A >= 0 ? 'tangent' : 'sécant'} ${lineIndex + 1}`);
            }
            for (const [lineIndex, line] of above.entries()) {
                const margin = 128 * Number.EPSILON * (1 + Math.abs(line.slope) + Math.abs(line.intercept));
                constrain(add(multiply(input[index], -line.slope), output[index]), line.intercept + margin,
                    `${name} : majorant ${cells[0].upperQuadratic.A <= 0 ? 'tangent' : 'sécant'} ${lineIndex + 1}`);
            }
            continue;
        }
        const polygons = cells.map(cell => outerPolygon(cell, Math.max(lower, cell.lower), Math.min(upper, cell.upper)));
        if (polygons.some(polygon => !polygon || !polygon.length)) return null;
        const polygon = convexHull(polygons.flat());
        if (polygon.length === 1) {
            constrain(output[index], polygon[0].y, `${name} : point, borne supérieure de y`);
            constrain(multiply(output[index], -1), -polygon[0].y, `${name} : point, borne inférieure de y`);
        } else {
            for (let j = 0; j < polygon.length; j += 1) {
                const first = polygon[j], second = polygon[(j + 1) % polygon.length];
                const width = Math.max(Math.abs(second.x - first.x), Math.abs(second.y - first.y));
                if (width === 0) continue;
                const dx = (second.x - first.x) / width, dy = (second.y - first.y) / width;
                const margin = 128 * Number.EPSILON * (1 + Math.abs(first.x) + Math.abs(first.y));
                constrain(add(multiply(input[index], dy), multiply(output[index], -dx)), dy * first.x - dx * first.y + margin,
                    `${name} : facette ${j + 1} de l’enveloppe convexe`);
            }
        }
    }
    const objective = available['8'];
    if (![...A.flat(), ...b, ...objective].every(Number.isFinite)) return null;
    return { A, b, c: objective.slice(0, size), constant: objective[size], bounds, input, output, size,
        variableNames: variableDetails.map(variable => variable.name), variableDetails, constraintNames };
}

function expressionValue(expression, point) { return expression.at(-1) + point.reduce((sum, value, i) => sum + value * expression[i], 0); }

function verticalRange(domain, x) {
    let lower = Infinity, upper = -Infinity;
    for (const cell of domain.cells) {
        if (x < cell.lower - 1e-12 || x > cell.upper + 1e-12) continue;
        const at = clip(x, cell.lower, cell.upper);
        lower = Math.min(lower, quadraticValue(cell.lowerQuadratic, at));
        upper = Math.max(upper, quadraticValue(cell.upperQuadratic, at));
    }
    return { lower, upper };
}

// A separate valid cut: terminal production cannot exceed the sum immediately
// after the two source branches. Maximise that one-dimensional quadratic sum.
function sourceCutBound(domains) {
    const breaks = [...new Set([0, 1, ...domains[0].cells.flatMap(cell => [cell.lower, cell.upper]), ...domains[1].cells.flatMap(cell => [1 - cell.lower, 1 - cell.upper])])].sort((a, b) => a - b);
    const intervals = [];
    const fallback = reason => ({ type: 'source-cut-quadratic', status: 'fallback', upperBound: 1, reason, intervals });
    let maximum = 0, maximizingShare = 0, magnitude = 0;
    for (let i = 1; i < breaks.length; i += 1) {
        const lower = breaks[i - 1], upper = breaks[i], middle = (lower + upper) / 2;
        const first = domains[0].cells.find(cell => middle >= cell.lower && middle <= cell.upper)?.upperQuadratic;
        const second = domains[1].cells.find(cell => 1 - middle >= cell.lower && 1 - middle <= cell.upper)?.upperQuadratic;
        if (!first || !second) return fallback('missing-interval');
        const quadratic = { A: first.A + second.A, B: first.B - 2 * second.A - second.B, C: first.C + second.A + second.B + second.C };
        magnitude = Math.max(magnitude, ...[first, second, quadratic].map(q => Math.abs(q.A) + Math.abs(q.B) + Math.abs(q.C)));
        if (!Number.isFinite(magnitude)) return fallback('non-finite-coefficients');
        const shares = [lower, upper];
        if (quadratic.A !== 0) { const share = -quadratic.B / (2 * quadratic.A); if (share > lower && share < upper) shares.push(share); }
        const candidates = shares.map(share => ({ share, value: quadraticValue(quadratic, share) }));
        if (!candidates.every(candidate => Number.isFinite(candidate.value))) return fallback('non-finite-quadratic');
        for (const candidate of candidates) if (candidate.value > maximum) { maximum = candidate.value; maximizingShare = candidate.share; }
        intervals.push({ lower, upper, quadratic, candidates });
    }
    const margin = 4096 * Number.EPSILON * (1 + maximum + magnitude);
    return {
        type: 'source-cut-quadratic', status: 'checked', quantity: 'production',
        expression: 'max_t G_12(t)+G_15(1-t), 0<=t<=1; every downstream output is at most its input',
        intervals, rawMaximum: maximum, maximizingShare, margin, upperBound: Math.min(1, maximum + margin),
    };
}

function candidateFromPoint(ready, domains, program, point, boxes, tolerance) {
    const inputs = program.input.map(expression => expressionValue(expression, point));
    const outputs = program.output.map(expression => expressionValue(expression, point));
    if (![...inputs, ...outputs].every(Number.isFinite)) return null;
    const controls = {};
    for (const node of CONTROL_NODES) {
        const [first, second] = OUT[node];
        const total = inputs[first] + inputs[second];
        controls[`s${node}`] = total <= 0 ? 0.5 : clip(inputs[first] / total, 0, 1);
    }
    const choose = boxes ? (index, input) => {
        const range = verticalRange(domains[index], input);
        if (!Number.isFinite(range.lower) || !Number.isFinite(range.upper)) return null;
        const target = clip(outputs[index], range.lower, range.upper);
        try {
            const result = reconstructProductionParameters(boxes[EDGES[index].id], input, target, { tolerance: Math.min(1e-10, tolerance / 20) });
            return result.converged ? result.parameters : null;
        } catch { return null; }
    } : null;
    const state = evaluateReady(ready, controls, choose);
    return state.feasible ? state : null;
}

function makeProblemSignature(ready, boxes) {
    return JSON.stringify({ version: 'branch-yield-spatial-1', source: 1,
        branches: ready.branches.map(branch => ({ id: branch.id, from: branch.from, to: branch.to,
            ...(boxes ? { box: Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, [...boxes[branch.id][key]]])) }
                : { parameters: Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, branch[key]])) }) })),
    });
}

/** Canonical problem identity, independent of starts, array order and search budgets. */
export function branchesProblemSignature(model, { parameterBoxes } = {}) {
    const ready = prepare(model);
    if (parameterBoxes !== undefined) {
        if (!parameterBoxes || EDGES.some(edge => !Object.hasOwn(parameterBoxes, edge.id))) throw new TypeError('Les douze boîtes du problème sont requises.');
        EDGES.forEach(edge => productionParameterEnvelope(parameterBoxes[edge.id]));
    }
    return makeProblemSignature(ready, parameterBoxes);
}

/** Replay the actual LP geometry; this performs no optimisation or new LP solve. */
export function inspectBranchesRelaxation(model, record, { parameterBoxes } = {}) {
    const ready = prepare(model);
    let domains = fixedDomains(ready);
    if (parameterBoxes !== undefined) {
        if (!parameterBoxes || EDGES.some(edge => !Object.hasOwn(parameterBoxes, edge.id))) throw new TypeError('Les douze boîtes du problème sont requises.');
        domains = EDGES.map(edge => {
            const envelope = productionParameterEnvelope(parameterBoxes[edge.id]);
            return { cells: envelope.cells, maximum: domainMaximum(envelope.cells, parameterBoxes[edge.id].c[1]) };
        });
    }
    if (!record || !Array.isArray(record.selections) || !Array.isArray(record.intervals)
        || record.selections.length !== 12 || record.intervals.length !== 12) throw new TypeError('Le sous-problème enregistré est incomplet.');
    for (let i = 0; i < 12; i += 1) {
        const selection = record.selections[i], interval = record.intervals[i];
        if (!Number.isInteger(selection) || selection < -1 || selection >= domains[i].cells.length) throw new RangeError('Cellule enregistrée invalide.');
        if (selection < 0) { if (interval !== null) throw new RangeError('Intervalle sans cellule enregistrée.'); }
        else {
            const cell = domains[i].cells[selection];
            if (!interval || !Number.isFinite(interval.lower) || !Number.isFinite(interval.upper)
                || interval.lower < cell.lower || interval.upper > cell.upper || interval.lower > interval.upper) throw new RangeError('Intervalle enregistré invalide.');
        }
    }
    const program = buildProgram(domains, record.selections, record.intervals);
    return program ? { ...program, problemSignature: makeProblemSignature(ready, parameterBoxes) } : null;
}

/**
 * Spatial branch-and-bound over quadratic production graphs or attainable bands.
 * Every open or unresolved node retains its parent's valid bound. Parameter boxes
 * use exact attainable bands; a reported incumbent always has reconstructed laws.
 */
export function optimiseBranchesGlobal(model, options = {}) {
    const ready = prepare(model);
    optionsOnly(options, ['tolerance', 'maxNodes', 'initialControls', 'onProgress', 'shouldCancel', 'parameterBoxes']);
    const tolerance = options.tolerance ?? 1e-7, maxNodes = options.maxNodes ?? 10000;
    if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1e-3) throw new RangeError('Tolérance requise dans ]0, 0,001].');
    if (!Number.isSafeInteger(maxNodes) || maxNodes < 0 || maxNodes > 1000000) throw new RangeError('maxNodes doit être un entier de 0 à 1000000.');
    const boxes = options.parameterBoxes;
    let domains = fixedDomains(ready);
    if (boxes !== undefined) {
        if (!boxes || typeof boxes !== 'object' || Array.isArray(boxes) || Object.keys(boxes).length !== 12 || EDGES.some(edge => !Object.hasOwn(boxes, edge.id))) throw new TypeError('Une boîte est requise pour chacune des douze branches.');
        domains = EDGES.map(edge => {
            const envelope = productionParameterEnvelope(boxes[edge.id]);
            return { cells: envelope.cells, maximum: domainMaximum(envelope.cells, boxes[edge.id].c[1]) };
        });
    }
    const terminalBound = EDGES.reduce((sum, edge, i) => sum + (edge.to === '8' ? domains[i].maximum : 0), 0);
    const sourceCertificate = sourceCutBound(domains);
    const sourceBound = sourceCertificate.upperBound;
    const universal = Math.min(1, terminalBound, sourceBound);
    let best = null;
    // Compatible concentrated routes provide an incumbent even when a user start
    // overloads a branch. In box mode the seed laws themselves must belong to boxes.
    const seedReady = boxes ? { ...ready, branches: ready.branches.map(branch => {
        const box = boxes[branch.id];
        return { ...branch, ...Object.fromEntries(['a', 'b', 'c', 'd'].map(key => [key, (box[key][0] + box[key][1]) / 2])) };
    }) } : ready;
    const consider = state => { if (state?.feasible && (!best || state.production > best.production)) best = state; };
    if (options.initialControls ?? model.initialControls) consider(evaluateReady(seedReady, readControls(options.initialControls ?? model.initialControls)));
    for (let code = 0; code < 32; code += 1) consider(evaluateReady(seedReady, Object.fromEntries(KEYS.map((key, i) => [key, (code >> i) & 1]))));
    const sourceShares = [...new Set([0, 1, ...domains[0].cells.flatMap(cell => [cell.lower, cell.upper]), ...domains[1].cells.flatMap(cell => [1 - cell.lower, 1 - cell.upper])])].sort((a, b) => a - b);
    for (const share of sourceShares) for (let code = 0; code < 16; code += 1) {
        const controls = { s1: share, ...Object.fromEntries(KEYS.slice(1).map((key, i) => [key, (code >> i) & 1])) };
        const choose = boxes ? (index, input) => {
            try {
                const range = verticalRange(domains[index], input);
                const result = reconstructProductionParameters(boxes[EDGES[index].id], input, range.upper, { tolerance: Math.min(1e-10, tolerance / 20) });
                return result.converged ? result.parameters : null;
            } catch { return null; }
        } : null;
        consider(evaluateReady(ready, controls, choose));
    }
    const queue = [{ id: 0, parent: null, selections: Array(12).fill(-1), intervals: Array(12).fill(null), upperBound: universal }];
    const unresolved = [], records = [];
    let processedNodes = 0, nextId = 1, cancelled = false, closedUpper = 0;
    const snapshot = () => {
        const upperBound = [...queue, ...unresolved].reduce((value, node) => Math.max(value, node.upperBound), Math.max(best?.production ?? 0, closedUpper));
        const gap = best ? Math.max(0, upperBound - best.production) : null;
        const certified = !!best && gap <= tolerance;
        return { best, upperBound, gap, tolerance, status: certified ? 'certified' : cancelled ? 'cancelled' : unresolved.length && queue.length === 0 ? 'uncertain' : 'node-limit', processedNodes, openNodes: queue.length + unresolved.length, complete: certified, parameterMode: boxes ? 'bounded' : 'fixed' };
    };
    options.onProgress?.(snapshot());
    while (queue.length && processedNodes < maxNodes) {
        if (options.shouldCancel?.()) { cancelled = true; break; }
        queue.sort((a, b) => b.upperBound - a.upperBound || a.id - b.id);
        const node = queue.shift();
        if (best && node.upperBound <= best.production + tolerance) { closedUpper = Math.max(closedUpper, node.upperBound); continue; }
        processedNodes += 1;
        const program = buildProgram(domains, node.selections, node.intervals);
        let solved = null;
        if (program) {
            try { solved = solveBoundedLinearProgram(program, { tolerance }); } catch { solved = null; }
        }
        const record = { id: node.id, parent: node.parent, selections: node.selections, intervals: node.intervals, status: solved?.status ?? 'uncertain', reason: solved?.reason ?? null, upperBound: node.upperBound };
        if (solved?.certificate) {
            record.certificate = solved.certificate; record.primalResidual = solved.primalResidual ?? null;
        }
        if (solved?.status === 'optimal') {
            record.lpStatus = 'optimal'; record.lpPoint = [...solved.point]; record.lpObjectiveValue = solved.objectiveValue;
        }
        if (solved?.status === 'infeasible') record.upperBound = null;
        else if (solved?.status === 'optimal') {
            node.upperBound = Math.min(node.upperBound, solved.certificate.upperBound);
            record.upperBound = node.upperBound;
            consider(candidateFromPoint(ready, domains, program, solved.point, boxes, tolerance));
            if (best && node.upperBound <= best.production + tolerance) { record.status = 'bound-pruned'; closedUpper = Math.max(closedUpper, node.upperBound); }
            else {
                let branch = -1, score = -Infinity;
                for (let i = 0; i < 12; i += 1) {
                    const selection = node.selections[i];
                    const cell = selection < 0 ? null : domains[i].cells[selection];
                    const interval = node.intervals[i] ?? cell;
                    if (selection >= 0 && (affineCell(cell) || interval.upper - interval.lower <= 1e-12)) continue;
                    const x = expressionValue(program.input[i], solved.point), y = expressionValue(program.output[i], solved.point);
                    const range = verticalRange(domains[i], x);
                    const violation = Math.max(0, range.lower - y, y - range.upper);
                    const width = selection < 0 ? 1 : interval.upper - interval.lower;
                    const priority = violation + Number.EPSILON * width;
                    if (priority > score) { score = priority; branch = i; }
                }
                if (branch < 0) { unresolved.push(node); record.status = 'unresolved-leaf'; }
                else {
                    record.status = 'branched'; record.branch = EDGES[branch].id;
                    const selection = node.selections[branch];
                    if (selection < 0) domains[branch].cells.forEach((cell, index) => {
                        const selections = [...node.selections], intervals = [...node.intervals];
                        selections[branch] = index; intervals[branch] = { lower: cell.lower, upper: cell.upper };
                        queue.push({ id: nextId++, parent: node.id, selections, intervals, upperBound: node.upperBound });
                    });
                    else {
                        const interval = node.intervals[branch], middle = (interval.lower + interval.upper) / 2;
                        record.split = middle;
                        for (const part of [{ lower: interval.lower, upper: middle }, { lower: middle, upper: interval.upper }]) {
                            const intervals = [...node.intervals]; intervals[branch] = part;
                            queue.push({ id: nextId++, parent: node.id, selections: [...node.selections], intervals, upperBound: node.upperBound });
                        }
                    }
                }
            }
        } else unresolved.push(node);
        records.push(record);
        if (processedNodes % 25 === 0) options.onProgress?.(snapshot());
        if (snapshot().complete) break;
    }
    const result = {
        ...snapshot(),
        certificates: {
            records, problemSignature: makeProblemSignature(ready, boxes), unresolved: unresolved.length, universalBound: 1, terminalBound, sourceBound, sourceCertificate, closedUpper,
            frontier: [...queue.map(node => ({ ...node, status: 'open' })), ...unresolved.map(node => ({ ...node, status: 'unresolved' }))],
            arithmetic: 'floating-point-with-margins',
        },
    };
    options.onProgress?.(result);
    return result;
}
