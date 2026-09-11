/** A second fixed-law example: twelve positive flows and an interior global peak. */
import { BRANCH_GRAPH } from './branches-engine.mjs';

const MU = { 1: 35 / 100, 2: 41 / 100, 5: 41 / 100, 3: 44 / 100, 7: 44 / 100, 4: 48 / 100, 6: 48 / 100, 8: 1 };
const CONTROLS = { s1: 1 / 2, s2: 1 / 2, s5: 1 / 4, s3: 1 / 2, s7: 1 / 2 };
const ORDER = ['1', '2', '5', '3', '7', '4', '6', '8'];
const KEYS = Object.keys(CONTROLS);
const B = 1 / 1000;
// Exact rational coefficients of g(x)=alpha*x-beta*x² on x>=b.
const COEFFICIENTS = {
    '1-2': [194 / 205, 19 / 205], '1-5': [194 / 205, 19 / 205],
    '2-3': [213 / 220, 8 / 99], '2-8': [59 / 100, 2 / 5],
    '5-3': [213 / 220, 16 / 99], '5-7': [213 / 220, 16 / 297],
    '7-6': [59 / 60, 320 / 1539], '7-4': [59 / 60, 320 / 1539],
    '3-4': [59 / 60, 320 / 1539], '3-6': [59 / 60, 320 / 1539],
    '4-8': [31 / 50, 2240 / 9747], '6-8': [31 / 50, 2240 / 9747],
};

/** A fresh model. Coefficients are evaluated from ratios without display rounding. */
export function createActiveBranchesScenario() {
    return { source: 1, initialControls: { ...CONTROLS }, branches: BRANCH_GRAPH.edges.map(edge => {
        const [alpha, beta] = COEFFICIENTS[edge.id];
        return { ...edge, a: 0, b: B, c: alpha - beta * B, d: alpha - beta };
    }) };
}

/** Recognition concerns the source, topology and all twelve laws, not a start. */
export function isActiveBranchesModel(model) {
    if (!model || model.source !== 1 || !Array.isArray(model.branches) || model.branches.length !== 12) return false;
    if (model.branches.some(edge => !edge || typeof edge !== 'object')) return false;
    const byId = new Map(model.branches.map(edge => [edge.id, edge]));
    if (byId.size !== 12) return false;
    return createActiveBranchesScenario().branches.every(expected => {
        const actual = byId.get(expected.id);
        return actual?.from === expected.from && actual?.to === expected.to
            && ['a', 'b', 'c', 'd'].every(key => actual[key] === expected[key]);
    });
}

function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}

function analyticWitness() {
    const nodes = Object.fromEntries(ORDER.map(id => [id, id === '1' ? 1 : 0]));
    const nodeJacobian = Object.fromEntries(ORDER.map(id => [id, Array(5).fill(0)]));
    const byId = {};
    for (const id of ORDER) {
        const outgoing = BRANCH_GRAPH.edges.filter(edge => edge.from === id);
        outgoing.forEach((edge, position) => {
            const fraction = outgoing.length === 1 ? 1 : position === 0 ? CONTROLS[`s${id}`] : 1 - CONTROLS[`s${id}`];
            const input = fraction * nodes[id];
            const coefficient = id === '1' ? .9 : edge.id === '2-8' ? .5 : edge.to === '8' ? .55 : .95;
            const output = coefficient * input, slopeAtWitness = MU[id] / MU[edge.to];
            const inputJacobian = KEYS.map((key, j) => fraction * nodeJacobian[id][j]
                + (key === `s${id}` ? nodes[id] * (position === 0 ? 1 : -1) : 0));
            const [alpha, beta] = COEFFICIENTS[edge.id];
            byId[edge.id] = { ...edge, alpha, beta, input, coefficient, output, fraction,
                muSource: MU[id], nu: MU[edge.to], slopeAtWitness, inputJacobian,
                parameters: { a: 0, b: B, c: alpha - beta * B, d: alpha - beta } };
            nodes[edge.to] += output;
            nodeJacobian[edge.to] = nodeJacobian[edge.to].map((value, j) => value + slopeAtWitness * inputJacobian[j]);
        });
    }
    const branches = BRANCH_GRAPH.edges.map(edge => byId[edge.id]);
    const hessian = KEYS.map((_, i) => KEYS.map((_, j) => -2 * branches.reduce((sum, edge) =>
        sum + edge.nu * edge.beta * edge.inputJacobian[i] * edge.inputJacobian[j], 0)));
    return { nodes, branches, hessian, gradient: nodeJacobian['8'] };
}

const WITNESS = analyticWitness();

/** Explanatory data only: neither global optimisation nor the grid imports it. */
export const ACTIVE_BRANCH_ANALYTICS = freeze({
    title: 'Douze branches actives et maximum global intérieur',
    source: 1,
    mu: { ...MU },
    witnessControls: { ...CONTROLS },
    branchCoefficients: WITNESS.branches,
    nodeInputs: Object.fromEntries(ORDER.filter(id => id !== '1').map(id => [id, WITNESS.nodes[id]])),
    upperBound: 143217 / 320000,
    upperBoundFraction: '143217/320000',
    ratio: 1600 / 1083,
    ratioFraction: '1600/1083',
    ratioScope: 'max(A2,…,A8)/min(A2,…,A8) au témoin initial ; source 1 exclue, aucune renormalisation.',
    sharesOrder: [...KEYS],
    gradient: WITNESS.gradient,
    hessian: WITNESS.hessian,
    proof: 'Avec νe=μdestination, L=μ1+Σe[νe ge(xe)−μsource xe]≤μ1+Σe νe βe (x*e)²=r*. La rampe initiale est sous la parabole, et chaque terme atteint son unique maximum en x*e. Les douze flux témoins respectent les bilans ; tous les nœuds sont alimentés, donc les cinq partages maximisants sont uniques.',
    localIdentity: 'r(s)=r*−Σe νe βe[xe(s)−x*e]² tant que les douze entrées restent au-dessus de b. Au témoin H=−2 Jᵀ diag(νe βe) J ; J a rang 5.',
    scope: 'Le départ est déjà optimal pour ces douze lois fixes. La proximité des sommes reçues est vérifiée au départ ; elle n’est pas une contrainte ajoutée aux autres configurations. La grille de pas 0,1 ne contient pas s5=0,25.',
});
