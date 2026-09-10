/** Audit a multiplier vector from an actual, recorded LP relaxation of the network. */
import { BRANCH_GRAPH, branchesProblemSignature, evaluateBranches, inspectBranchesRelaxation } from './branches-engine.mjs';

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const maximum = values => values.reduce((largest, value) => Math.max(largest, value), 0);
const expressionValue = (expression, point) => expression.at(-1) + dot(expression.slice(0, -1), point);

function makeRows(program) {
    const A = program.A.map(row => [...row]), b = [...program.b], names = [...program.constraintNames];
    for (let j = 0; j < program.size; j += 1) {
        A.push(Array.from({ length: program.size }, (_, index) => index === j ? 1 : 0));
        b.push(program.bounds[j]);
        names.push(`${program.variableNames[j]} : borne supérieure de variable`);
    }
    return { A, b, names };
}

/** L remains defined outside the LP; feasibility and domain violations are reported. */
export function evaluateLagrangianPoint(diagnostic, point) {
    if (!diagnostic?.available || !Array.isArray(point) || point.length !== diagnostic.c.length || !point.every(Number.isFinite)) throw new TypeError('Un diagnostic disponible et un point fini de même dimension sont requis.');
    const slacks = diagnostic.A.map((row, index) => diagnostic.b[index] - dot(row, point));
    const contributions = slacks.map((slack, index) => diagnostic.multipliers[index] * slack);
    const objective = diagnostic.constant + dot(diagnostic.c, point);
    const lagrangian = objective + contributions.reduce((sum, value) => sum + value, 0);
    const expandedValue = diagnostic.lagrangian.constant + dot(diagnostic.lagrangian.coefficients, point);
    const inequalityResidual = maximum(slacks.map(slack => -slack));
    const lowerBoundResidual = maximum(point.map(value => -value));
    const upperBoundResidual = maximum(point.map((value, index) => value - diagnostic.bounds[index]));
    const primalResidual = Math.max(inequalityResidual, lowerBoundResidual, upperBoundResidual);
    return {
        point: [...point], objective, lagrangian, expandedValue, slacks, contributions,
        feasible: primalResidual <= diagnostic.tolerance,
        residuals: {
            primal: primalResidual, inequality: inequalityResidual, nonnegative: lowerBoundResidual, upperBound: upperBoundResidual,
            complementarity: maximum(contributions.map(Math.abs)),
            expansionIdentity: Math.abs(lagrangian - expandedValue),
        },
    };
}

function verifyBest(model, best, parameterBoxes, tolerance) {
    if (!best?.feasible || !Array.isArray(best.branches) || best.branches.length !== 12) return false;
    const ids = new Set();
    for (const branch of best.branches) {
        if (ids.has(branch.id)) return false;
        ids.add(branch.id);
        const original = model.branches.find(item => item.id === branch.id);
        if (!original || branch.from !== original.from || branch.to !== original.to) return false;
        for (const key of ['a', 'b', 'c', 'd']) {
            const value = branch.parameters?.[key];
            if (!Number.isFinite(value)) return false;
            if (parameterBoxes) {
                const interval = parameterBoxes[branch.id]?.[key];
                if (!interval || value < interval[0] || value > interval[1]) return false;
            } else if (value !== original[key]) return false;
        }
    }
    let rebuilt;
    try {
        rebuilt = evaluateBranches({ source: 1, branches: best.branches.map(branch => ({ id: branch.id, from: branch.from, to: branch.to, ...branch.parameters })) }, best.controls);
    } catch { return false; }
    if (!rebuilt.feasible || Math.abs(rebuilt.production - best.production) > tolerance) return false;
    return rebuilt.branches.every(branch => {
        const stored = best.branches.find(item => item.id === branch.id);
        return Math.abs(branch.input - stored.input) <= tolerance && Math.abs(branch.output - stored.output) <= tolerance;
    });
}

/**
 * Prefer the tightest actually solved LP containing the final physical state.
 * The recorded multipliers belong to that relaxation, never to a global NLP.
 * No LP is rerun and no missing multiplier is fabricated by this inspection.
 */
export function explainBranchesLagrangian(model, result, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['parameterBoxes', 'recordId'].includes(key))) throw new TypeError('Options de diagnostic invalides.');
    const tolerance = result?.tolerance ?? 1e-7;
    if (!Number.isFinite(tolerance) || tolerance <= 0) throw new TypeError('Tolérance du résultat invalide.');
    let sourceCertificate = null;
    const unavailable = (reason, extra = {}) => ({ available: false, reason, scope: 'recorded-linear-relaxation', sourceCertificate, ...extra });
    const records = result?.certificates?.records;
    if (!Array.isArray(records)) return unavailable('no-recorded-linear-program');
    if (!result.certificates.problemSignature) return unavailable('missing-problem-provenance');
    if (result.parameterMode === 'bounded' && !options.parameterBoxes) return unavailable('parameter-boxes-required');
    if (result.parameterMode !== 'bounded' && options.parameterBoxes !== undefined) return unavailable('parameter-mode-mismatch');
    let signature;
    try { signature = branchesProblemSignature(model, { parameterBoxes: options.parameterBoxes }); } catch { return unavailable('invalid-problem-description'); }
    if (signature !== result.certificates.problemSignature) return unavailable('problem-provenance-mismatch');
    sourceCertificate = result.certificates.sourceCertificate ?? null;
    if (!verifyBest(model, result.best, options.parameterBoxes, tolerance)) return unavailable('best-state-does-not-match-model');
    if (records.length === 0) return unavailable(result?.status === 'certified' ? 'no-linear-program-needed' : 'no-linear-program-recorded');
    const requested = options.recordId;
    if (requested !== undefined && (!Number.isSafeInteger(requested) || requested < 0)) throw new RangeError('recordId doit être un entier positif ou nul.');
    const eligible = records.filter(record => (requested === undefined || record.id === requested)
        && record.lpStatus === 'optimal' && Array.isArray(record.lpPoint) && Array.isArray(record.certificate?.multipliers));
    if (!eligible.length) return unavailable(requested === undefined ? 'no-optimal-linear-program-recorded' : 'requested-record-not-available');
    const candidates = [];
    let provenanceMismatch = false;
    for (const record of eligible) {
        let program;
        try { program = inspectBranchesRelaxation(model, record, { parameterBoxes: options.parameterBoxes }); } catch { continue; }
        if (!program || program.problemSignature !== result.certificates.problemSignature) { provenanceMismatch = true; continue; }
        const { A, b, names } = makeRows(program);
        const scaledMultipliers = record.certificate.multipliers;
        const rowScales = record.certificate.scales;
        if (scaledMultipliers.length !== A.length || !scaledMultipliers.every(value => Number.isFinite(value) && value >= 0)
            || !Array.isArray(rowScales) || rowScales.length !== A.length) continue;
        const expectedScales = A.map((row, index) => Math.max(1, Math.abs(b[index]), ...row.map(Math.abs)));
        if (rowScales.some((scale, i) => scale !== expectedScales[i])) continue;
        const point = program.variableDetails.map(variable => result.best.branches.find(branch => branch.id === variable.branch)[variable.quantity]);
        const canonicalBranches = BRANCH_GRAPH.edges.map(edge => result.best.branches.find(branch => branch.id === edge.id));
        const flowResidual = maximum(program.input.flatMap((input, index) => [
            Math.abs(expressionValue(input, point) - canonicalBranches[index].input),
            Math.abs(expressionValue(program.output[index], point) - canonicalBranches[index].output),
        ]));
        if (!point.every(Number.isFinite) || !Number.isFinite(flowResidual) || flowResidual > tolerance) continue;
        const multipliers = scaledMultipliers.map((value, index) => value / rowScales[index]);
        const lagrangianConstant = program.constant + dot(multipliers, b);
        const coefficients = program.c.map((value, j) => value - A.reduce((sum, row, i) => sum + multipliers[i] * row[j], 0));
        const boxSupremum = lagrangianConstant + coefficients.reduce((sum, value, j) => sum + Math.max(0, value) * program.bounds[j], 0);
        const diagnostic = {
            available: true, scope: 'recorded-linear-relaxation', recordId: record.id, recordStatus: record.status,
            selections: [...record.selections], intervals: record.intervals.map(interval => interval ? { ...interval } : null),
            A, b, c: [...program.c], constant: program.constant, bounds: [...program.bounds],
            variableNames: [...program.variableNames], variableDetails: program.variableDetails.map(variable => ({ ...variable })), constraintNames: names,
            bestPoint: point, lpPoint: [...record.lpPoint], multipliers, scaledMultipliers: [...scaledMultipliers], rowScales: [...rowScales], tolerance,
            lagrangian: { constant: lagrangianConstant, coefficients, boxSupremum, kind: 'affine', multiplierUnits: 'objective per unit of unscaled row slack' },
            residuals: { dualNonnegativeDomain: maximum(coefficients), scaleRoundTrip: maximum(multipliers.map((value, i) => Math.abs(value * rowScales[i] - scaledMultipliers[i]))) },
            upperBounds: {
                relaxation: record.certificate.upperBound, searchNode: record.upperBound, global: result.upperBound,
                recordedCorrection: record.certificate.correction, numericalMargin: record.certificate.margin,
            },
            match: { problemSignature: true, flowResidual, bestInRegion: false },
            search: { status: result.status, bestProduction: result.best.production, upperBound: result.upperBound, gap: result.gap, processedNodes: result.processedNodes },
            sourceCertificate,
        };
        const atBest = evaluateLagrangianPoint(diagnostic, point);
        let atLp;
        try { atLp = evaluateLagrangianPoint(diagnostic, record.lpPoint); } catch { continue; }
        if (!atBest.feasible || !atLp.feasible || !Number.isFinite(boxSupremum)) continue;
        const objectiveMatch = Math.abs(atBest.objective - result.best.production);
        const lpObjectiveMatch = Math.abs(atLp.objective - record.lpObjectiveValue);
        if (objectiveMatch > tolerance || !Number.isFinite(lpObjectiveMatch) || lpObjectiveMatch > tolerance) continue;
        diagnostic.match = { problemSignature: true, bestInRegion: true, flowResidual, primalResidual: atBest.residuals.primal,
            exactInequalityMembership: atBest.residuals.primal === 0, objectiveResidual: objectiveMatch, lpObjectiveResidual: lpObjectiveMatch };
        diagnostic.atBest = atBest; diagnostic.atLp = atLp;
        candidates.push(diagnostic);
    }
    if (!candidates.length) return unavailable(provenanceMismatch ? 'problem-provenance-mismatch' : requested === undefined ? 'no-containing-linear-program' : 'requested-record-does-not-contain-best');
    candidates.sort((a, b) => a.upperBounds.relaxation - b.upperBounds.relaxation || a.recordId - b.recordId);
    return { ...candidates[0], selection: { rule: requested === undefined ? 'tightest-solved-relaxation-containing-best' : 'requested-solved-relaxation', candidates: candidates.length } };
}
