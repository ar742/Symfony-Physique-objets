/** Analytic second-order propagation through the twelve compatible branch laws. */
import { BRANCH_GRAPH, evaluateBranches, branchProductionRate } from './branches-engine.mjs';

const EDGES = BRANCH_GRAPH.edges;
const ORDER = ['1', '2', '5', '3', '7', '4', '6', '8'];
const SHARES = ['s1', 's2', 's5', 's3', 's7'];
const PARAMS = ['a', 'b', 'c', 'd'];
const TOLERANCE = 1e-10;
const zeroMatrix = () => [[0, 0], [0, 0]];
const literal = value => String(Object.is(value, -0) ? 0 : value);
const constant = value => ({ value, gradient: [0, 0], hessian: zeroMatrix(), constant: true, regular: true });
const variable = (value, index) => ({ ...constant(value), gradient: [Number(index === 0), Number(index === 1)], constant: false });
function add(a, b) {
    return { value: a.value + b.value, gradient: a.gradient.map((v, i) => v + b.gradient[i]),
        hessian: a.hessian.map((row, i) => row.map((v, j) => v + b.hessian[i][j])),
        constant: a.constant && b.constant, regular: a.regular && b.regular };
}
function multiply(a, b) {
    // A fixed zero allocation annihilates the whole path, including upstream kinks.
    if ((a.constant && a.value === 0) || (b.constant && b.value === 0)) return constant(0);
    return { value: a.value * b.value,
        gradient: a.gradient.map((v, i) => v * b.value + a.value * b.gradient[i]),
        hessian: a.hessian.map((row, i) => row.map((v, j) => v * b.value + a.value * b.hessian[i][j]
            + a.gradient[i] * b.gradient[j] + b.gradient[i] * a.gradient[j])),
        constant: a.constant && b.constant, regular: a.regular && b.regular };
}
const subtract = (a, b) => add(a, multiply(constant(-1), b));

/** At the domain ends the inward polynomial applies; a variable interior kink does not. */
function portion(input, parameters) {
    const { a, b, c, d } = parameters, z = input.value;
    const near = threshold => Math.abs(z - threshold) <= 8 * Number.EPSILON * Math.max(1, Math.abs(z), Math.abs(threshold));
    const kink = (a > 0 && near(a)) || near(b);
    if (c === 0) return { quadratic: 0, linear: 0, interval: '[0,1]', kink: false, side: 'constant-law' };
    if (z < a) return { quadratic: 0, linear: 0, interval: `[0,${literal(a)}[`, kink, side: 'constant-portion' };
    if (z <= b) return { quadratic: c / (b - a), linear: -c * a / (b - a),
        interval: `[${literal(a)},${literal(b)}]`, kink, side: z === 0 ? 'right' : 'two-sided' };
    const quadratic = (d - c) / (1 - b);
    return { quadratic, linear: c - quadratic * b, interval: `]${literal(b)},1]`, kink, side: z === 1 ? 'left' : 'two-sided' };
}
function transform(input, parameters, polynomial) {
    const value = branchProductionRate(input.value, parameters);
    if (input.constant || (polynomial.quadratic === 0 && polynomial.linear === 0 && !polynomial.kink)) return constant(value);
    const derivative = 2 * polynomial.quadratic * input.value + polynomial.linear;
    return { value, gradient: input.gradient.map(v => derivative * v),
        hessian: input.hessian.map((row, i) => row.map((v, j) => derivative * v
            + 2 * polynomial.quadratic * input.gradient[i] * input.gradient[j])),
        constant: false, regular: input.regular && !polynomial.kink };
}

function modelFromState(state) {
    if (!state?.feasible || !Array.isArray(state.branches)) throw new TypeError('Un état compatible avec ses lois et cinq partages est requis.');
    return { source: 1, branches: state.branches.map(branch => ({ id: branch?.id, from: branch?.from, to: branch?.to,
        ...Object.fromEntries(PARAMS.map(key => [key, branch?.parameters?.[key]])) })) };
}

function analysePoint(model, controls, mode, axes) {
    const actual = evaluateBranches(model, controls);
    if (!actual.feasible) throw new RangeError(actual.reason);
    const laws = Object.fromEntries(model.branches.map(branch => [branch.id, branch]));
    const branch = id => actual.branches.find(item => item.id === id);
    const coordinates = mode === 'flows' ? { x12: branch('1-2').input, x23: branch('2-3').input } : actual.controls;
    const active = id => axes.includes(id) ? variable(coordinates[id], axes.indexOf(id)) : constant(coordinates[id]);
    const supplies = Object.fromEntries(ORDER.map(id => [id, constant(id === '1' ? 1 : 0)]));
    const conditions = [], polynomials = [], expressions = [], jets = {};
    const controlsJets = Object.fromEntries(SHARES.map(key => [key, mode === 'yield' ? active(key) : constant(actual.controls[key])]));
    for (const node of ORDER) {
        const outgoing = EDGES.filter(edge => edge.from === node);
        for (const [position, edge] of outgoing.entries()) {
            let input, expression;
            if (mode === 'flows' && node === '1') {
                input = position === 0 ? active('x12') : subtract(constant(1), active('x12'));
                expression = position === 0 ? 'u' : '1−u';
            } else if (mode === 'flows' && node === '2') {
                input = position === 0 ? active('x23') : subtract(supplies['2'], active('x23'));
                expression = position === 0 ? 'v' : 'A2−v';
            } else {
                const share = outgoing.length === 1 ? constant(1) : position === 0 ? controlsJets[`s${node}`] : subtract(constant(1), controlsJets[`s${node}`]);
                input = multiply(supplies[node], share);
                expression = outgoing.length === 1 ? `A${node}` : `${position === 0 ? `s${node}` : `(1−s${node})`} A${node}`;
            }
            if (!Number.isFinite(input.value) || input.value < 0 || input.value > 1) throw new RangeError(`Allocation ${edge.id} hors de [0,1].`);
            const polynomial = portion(input, laws[edge.id]);
            if (![polynomial.quadratic, polynomial.linear].every(Number.isFinite)) throw new RangeError(`Les coefficients de ${edge.id} dépassent la plage numérique des dérivées ; aucun coefficient infini n’est utilisé.`);
            const output = transform(input, laws[edge.id], polynomial);
            const fixedKink = polynomial.kink && input.constant;
            conditions.push({ id: `portion-${edge.id}`, branch: edge.id,
                label: `${edge.id.replace('-', '→')} : X∈${polynomial.interval}, qₑ=${literal(polynomial.quadratic)}, lₑ=${literal(polynomial.linear)} dans Y=qₑX²+lₑX ; ${fixedKink ? 'entrée identiquement constante dans cette coupe, dérivées composées nulles même au coude' : polynomial.kink ? 'entrée au coude à l’arrondi numérique près : dérivées composées non attribuées' : polynomial.side === 'constant-portion' ? 'portion localement constante' : 'portion polynomiale'}.`,
                satisfied: true, smooth: output.regular, input: input.value, constantInSlice: input.constant,
                kink: polynomial.kink, side: fixedKink ? 'constant-in-slice' : polynomial.side });
            polynomials.push({ branch: edge.id, input: input.value, quadratic: polynomial.quadratic, linear: polynomial.linear,
                interval: polynomial.interval, constantInSlice: input.constant, kink: polynomial.kink });
            expressions.push(`X${edge.id.replace('-', '')}=${expression} ; Y${edge.id.replace('-', '')}=${literal(polynomial.quadratic)} X${edge.id.replace('-', '')}²+(${literal(polynomial.linear)}) X${edge.id.replace('-', '')}`);
            jets[edge.id] = { input, output };
            supplies[edge.to] = add(supplies[edge.to], output);
        }
    }
    const result = supplies['8'];
    const consistency = Math.abs(result.value - actual.production);
    if (consistency > 1e-12) throw new Error('La propagation analytique ne retrouve pas le rendement recalculé.');
    const interior = mode === 'flows'
        ? coordinates.x12 > 0 && coordinates.x12 < 1 && coordinates.x23 > 0 && coordinates.x23 < branch('1-2').output
        : axes.every(key => coordinates[key] > 0 && coordinates[key] < 1);
    conditions.push({ id: 'coordinate-domain', label: mode === 'flows' ? '0<u<1 et 0<v<g12(u) : intérieur du domaine des deux flux.' : `0<${axes[0]}<1 et 0<${axes[1]}<1 : intérieur des deux partages.`,
        satisfied: interior, smooth: interior, interior, boundary: !interior, feasible: true });
    const finite = [...result.gradient, ...result.hessian.flat()].every(Number.isFinite);
    const regular = result.regular && finite;
    const gradient = regular ? result.gradient : null, hessian = regular ? result.hessian : null;
    const stationary = regular ? gradient.every(v => Math.abs(v) <= TOLERANCE) : null;
    const scale = regular ? Math.max(1, ...hessian.flat().map(Math.abs)) : 1;
    const largestEigenvalue = regular ? (hessian[0][0] + hessian[1][1] + Math.hypot(hessian[0][0] - hessian[1][1], 2 * hessian[0][1])) / 2 : null;
    const negativeDefinite = regular ? largestEigenvalue < -TOLERANCE * scale : null;
    return { current: { x: coordinates[axes[0]], y: coordinates[axes[1]], z: actual.production,
        formulaValue: regular ? result.value : null, formulaValid: regular, smooth: regular && interior,
        gradient, hessian, stationary, negativeDefinite, interior,
        derivativeStatus: !regular ? 'undefined' : interior ? 'two-sided' : 'one-sided',
        conditions, controls: { ...actual.controls }, tolerance: TOLERANCE },
        conditions, polynomials, expressions, actual, jets };
}

/** Recompute every output; differentiate the selected polynomial portions without finite differences. */
export function analyseBranchYieldSurface(state, options = {}) {
    const mode = options?.mode ?? 'flows';
    const defaults = mode === 'flows' ? ['x12', 'x23'] : ['s1', 's2'];
    const x = options?.x ?? defaults[0], y = options?.y ?? defaults[1], axes = [x, y];
    const base = { available: false, reason: null, mode, axes: { x, y }, canonicalAxes: mode === 'flows' ? { u: 'x12', v: 'x23' } : { x, y },
        formula: null, derivativeFormula: null, current: null, gradient: null, hessian: null, peak: null,
        conditions: [], frozen: [], summary: '', witnessReason: 'not-supplied' };
    const fail = (reason, summary) => ({ ...base, reason, summary });
    if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['mode', 'x', 'y', 'witnessControls', 'expectedProduction'].includes(key))) return fail('invalid-options', 'Options de calcul invalides.');
    if (!['flows', 'yield'].includes(mode)) return fail('unsupported-mode', 'Ce calcul concerne le rendement compatible en flux ou en fractions, pas le lagrangien libre.');
    const valid = mode === 'flows' ? defaults : SHARES;
    if (x === y || !valid.includes(x) || !valid.includes(y)) return fail('invalid-axes', 'Deux axes distincts de la coupe sont requis.');
    if (options.expectedProduction != null && (!Number.isFinite(options.expectedProduction) || options.expectedProduction < 0 || options.expectedProduction > 1)) return fail('invalid-expected-production', 'Le rendement attendu doit appartenir à [0,1].');
    let model, analysis;
    try { model = modelFromState(state); analysis = analysePoint(model, state.controls, mode, axes); }
    catch (error) { return fail('invalid-state', error.message); }
    const varied = mode === 'flows' ? ['s1', 's2'] : axes;
    const frozen = SHARES.filter(key => !varied.includes(key)).map(key => ({ key, value: analysis.actual.controls[key] }));
    let peak = null, witnessReason = 'not-supplied';
    if (options.witnessControls != null) {
        try {
            // Validate the complete witness, then change only the two free commands.
            const witness = evaluateBranches(model, options.witnessControls);
            if (!witness.feasible) throw new RangeError(witness.reason);
            const projected = { ...analysis.actual.controls, ...Object.fromEntries(varied.map(key => [key, witness.controls[key]])) };
            const candidate = analysePoint(model, projected, mode, axes).current;
            witnessReason = !candidate.formulaValid ? 'non-smooth-witness' : !candidate.interior ? 'boundary-witness'
                : !candidate.stationary ? 'non-stationary-witness' : !candidate.negativeDefinite ? 'hessian-not-negative-definite' : null;
            if (witnessReason === null) peak = { ...candidate, isolatedInSlice: true,
                attained: options.expectedProduction == null || Math.abs(candidate.z - options.expectedProduction) <= TOLERANCE,
                expectedProduction: options.expectedProduction ?? null, globalCertified: false,
                scope: 'Témoin projeté dans les mêmes trois fractions figées ; maximum local strict de cette coupe, à la tolérance des dérivées. Aucune conclusion globale.' };
        } catch { witnessReason = 'invalid-witness'; }
    }
    const current = analysis.current;
    const setup = mode === 'flows' ? `u=x12, v=x23 ; axes affichés x=${x}, y=${y}.` : `Axes affichés x=${x}, y=${y}.`;
    const formula = `${setup} A1=1 ; Ai=Σ(k→i)Yki ; r=A8. ${frozen.map(item => `${item.key}=${literal(item.value)}`).join(' ; ')}. Portions au point courant : ${analysis.expressions.join(' ; ')}. Chaque portion reste conditionnée par son intervalle indiqué.`;
    const derivativeFormula = 'Propagation par rapport aux deux axes : D(Ai)=ΣD(Yki), H(Ai)=ΣH(Yki). Pour X=s A : D(X)=s D(A)+A D(s), H(X)=s H(A)+A H(s)+D(s)D(A)ᵀ+D(A)D(s)ᵀ ; D(s) est le vecteur unitaire de son axe ou zéro si figé, H(s)=0. Pour Y=qₑX²+lₑX : D(Y)=(2qₑX+lₑ)D(X), H(Y)=2qₑD(X)D(X)ᵀ+(2qₑX+lₑ)H(X). Les qₑ,lₑ numériques figurent dans chaque loi ci-dessus. Sur la dernière portion du préréglage, qₑ=−βₑ et lₑ=αₑ dans gₑ(t)=αₑt−βₑt². En flux, D(X12)=D(u), D(X15)=−D(u), D(X23)=D(v), D(X28)=D(A2)−D(v) ; les Hessiennes suivent les mêmes sommes. D(r)=D(A8), H(r)=H(A8).';
    return { ...base, available: true, reason: !current.formulaValid ? 'non-smooth' : !current.interior ? 'boundary' : null,
        formula, derivativeFormula, current, gradient: current.gradient, hessian: current.hessian,
        conditions: analysis.conditions, polynomials: analysis.polynomials, frozen, peak, witnessReason,
        summary: (!current.formulaValid ? 'Un coude variable empêche de donner un gradient et une Hessienne uniques ; aucun lissage ni différence finie n’est substitué. '
            : current.interior ? 'Gradient et Hessienne obtenus par propagation analytique des portions polynomiales dans tout le réseau. '
                : 'Les dérivées sont celles des portions régulières, à lire dans les directions admissibles à la frontière ; elles ne certifient pas un sommet intérieur. ')
            + (peak ? 'Le témoin projeté est stationnaire avec Hessienne définie négative dans cette coupe. ' : 'Aucun pic n’est garanti par le témoin fourni ou absent. ')
            + 'Les chemins identiquement constants ont des dérivées nulles, même si leur entrée est fixée à un coude. Un maximum local ne prouve pas un maximum global.' };
}
