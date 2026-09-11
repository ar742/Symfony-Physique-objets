/** Study orchestration: computed nonlinear dual bound first, spatial search otherwise. */
import { optimiseBranchesGlobal } from './branches-engine.mjs';
import { certifySmoothWitness } from './branches-smooth-certificate.mjs';

const PARAMETERS = ['a', 'b', 'c', 'd'];

function validateUnmodifiedOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Options invalides.');
    // These fields are replaced in the zero-LP preparation call: validate their
    // original values explicitly instead of silently accepting invalid options.
    const budget = options.maxNodes ?? 10000;
    if (!Number.isSafeInteger(budget) || budget < 0 || budget > 1000000) throw new RangeError('maxNodes doit être un entier de 0 à 1000000.');
    for (const name of ['onProgress', 'shouldCancel']) {
        if (options[name] !== undefined && typeof options[name] !== 'function') throw new TypeError(`${name} doit être une fonction.`);
    }
}

function fixedModel(model, boxes) {
    if (boxes === undefined) return model;
    if (!model.branches.every(edge => PARAMETERS.every(key => boxes[edge.id][key][0] === boxes[edge.id][key][1]))) return null;
    return { ...model, branches: model.branches.map(edge => ({ ...edge,
        ...Object.fromEntries(PARAMETERS.map(key => [key, boxes[edge.id][key][0]])) })) };
}

/**
 * maxNodes limits spatial LP subproblems, not the independent dual-bound check.
 * A parameter-box problem may use that check only when every interval is a
 * singleton; then the effective laws are the box values, not the nominal model.
 * No preset or analytic witness metadata is imported.
 */
export function optimiseBranchesStudy(model, options = {}) {
    validateUnmodifiedOptions(options);
    const alreadyCancelled = options.shouldCancel?.() ?? false;
    // The engine validates the model, remaining options, boxes and controls, and
    // constructs its own feasible seeds and universal/source/terminal bounds.
    const base = optimiseBranchesGlobal(model, { ...options, maxNodes: 0, onProgress: undefined });
    const cancelled = () => {
        const result = { ...base, status: 'cancelled', complete: false, globalMethod: 'cancelled-before-search' };
        options.onProgress?.(result);
        return result;
    };
    if (alreadyCancelled || options.shouldCancel?.()) return cancelled();
    const effectiveModel = fixedModel(model, options.parameterBoxes);
    if (effectiveModel && base.best) {
        const smooth = certifySmoothWitness(effectiveModel, base.best, { tolerance: base.tolerance });
        if (options.shouldCancel?.()) return cancelled();
        if (smooth.available && smooth.status === 'certified') {
            const upperBound = Math.min(base.upperBound, smooth.upperBound);
            const result = {
                ...base, upperBound, gap: Math.max(0, upperBound - base.best.production),
                status: 'certified', complete: true, processedNodes: 0, openNodes: 0,
                globalMethod: 'smooth-witness-lagrangian',
                certificates: { ...base.certificates, records: [], frontier: [], unresolved: 0,
                    closedUpper: upperBound, smoothWitness: smooth },
            };
            options.onProgress?.(result);
            return result;
        }
    }
    // Preserve all original budgets, hooks and statuses on the spatial path.
    return optimiseBranchesGlobal(model, options);
}
