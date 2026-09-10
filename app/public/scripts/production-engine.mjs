/**
 * Fictitious, dimensionless production model with synchronous discrete cycles.
 * Normalised outputs of different machines are not physically interchangeable:
 * conversion maps a source's allocated output to a destination's normalised input.
 * No DOM, storage, optimisation, adaptive allocation or implicit stock is used.
 */

function finite(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`${label} doit être un nombre fini.`);
    }
}

function unitInterval(value, label) {
    finite(value, label);
    if (value < 0 || value > 1) throw new RangeError(`${label} doit être compris entre 0 et 1.`);
}

function parameters(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        throw new TypeError('Les paramètres de production a, b, c, d sont requis.');
    }
    for (const key of ['a', 'b', 'c', 'd']) unitInterval(params[key], key);
    if (!(params.a < params.b && params.b < 1)) {
        throw new RangeError('Les seuils doivent respecter 0 ≤ a < b < 1.');
    }
    if (params.d > params.c) throw new RangeError('Les productions doivent respecter 0 ≤ d ≤ c ≤ 1.');
}

function evaluate(x, params) {
    if (x <= params.a) return 0;
    if (x <= params.b) return params.c * ((x - params.a) / (params.b - params.a));
    if (x === 1) return params.d;
    return params.c + (params.d - params.c) * ((x - params.b) / (1 - params.b));
}

/** Continuous piecewise linear response; inputs and parameters are never clamped. */
export function productionRate(x, params) {
    parameters(params);
    unitInterval(x, 'L’alimentation x');
    return evaluate(x, params);
}

function compareIds(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function prepareModel(model) {
    if (!model || !Array.isArray(model.machines) || model.machines.length === 0
        || !Array.isArray(model.allocations)) {
        throw new TypeError('Le modèle doit définir des machines et un tableau allocations.');
    }
    const index = new Map();
    const machines = [];
    for (const machine of model.machines) {
        if (!machine || typeof machine.id !== 'string' || machine.id.trim() === '') {
            throw new TypeError('Chaque machine doit posséder un identifiant non vide.');
        }
        if (index.has(machine.id)) throw new TypeError(`Machine dupliquée : ${machine.id}.`);
        parameters(machine);
        unitInterval(machine.external, `Alimentation externe de ${machine.id}`);
        const initial = machine.initial === undefined ? 0 : machine.initial;
        unitInterval(initial, `Production initiale de ${machine.id}`);
        index.set(machine.id, machines.length);
        machines.push({ ...machine, initial });
    }
    const seen = new Map(machines.map(machine => [machine.id, new Set()]));
    const allocations = [];
    for (const allocation of model.allocations) {
        if (!allocation || !index.has(allocation.from) || !index.has(allocation.to)) {
            throw new TypeError('Chaque allocation doit relier des machines existantes.');
        }
        unitInterval(allocation.fraction, 'La fraction allouée');
        finite(allocation.conversion, 'Le coefficient de conversion');
        if (allocation.conversion <= 0) throw new RangeError('Le coefficient de conversion doit être strictement positif.');
        if (allocation.from === allocation.to && allocation.fraction !== 0) {
            throw new RangeError('Les fractions diagonales doivent être nulles.');
        }
        if (seen.get(allocation.from).has(allocation.to)) {
            throw new TypeError(`Allocation dupliquée : ${allocation.from} → ${allocation.to}.`);
        }
        seen.get(allocation.from).add(allocation.to);
        allocations.push({
            from: allocation.from, to: allocation.to,
            fraction: allocation.fraction, conversion: allocation.conversion,
        });
    }
    // Canonical summation order makes machine and allocation ordering irrelevant.
    allocations.sort((a, b) => compareIds(a.from, b.from) || compareIds(a.to, b.to));
    const fractions = machines.map(() => 0);
    for (const allocation of allocations) fractions[index.get(allocation.from)] += allocation.fraction;
    for (let i = 0; i < fractions.length; i += 1) {
        if (fractions[i] > 1) {
            throw new RangeError(`Les fractions sortantes de ${machines[i].id} dépassent 1.`);
        }
    }
    return { machines, allocations, index, fractions };
}

function outputVector(outputs, count) {
    if (!Array.isArray(outputs) || outputs.length !== count) {
        throw new TypeError('Le vecteur de production doit contenir une valeur par machine.');
    }
    for (let i = 0; i < count; i += 1) unitInterval(outputs[i], `Production ${i + 1}`);
    return [...outputs];
}

function maximumDifference(a, b) {
    let result = 0;
    for (let i = 0; i < a.length; i += 1) result = Math.max(result, Math.abs(a[i] - b[i]));
    return result;
}

function transition(model, previousOutputs) {
    const rawInput = model.machines.map(machine => machine.external);
    const flows = model.allocations.map(allocation => {
        const source = model.index.get(allocation.from);
        const target = model.index.get(allocation.to);
        const sent = allocation.fraction * previousOutputs[source];
        const offered = allocation.conversion * sent;
        rawInput[target] += offered;
        if (!Number.isFinite(rawInput[target])) {
            throw new RangeError('L’alimentation cumulée dépasse la plage numérique finie.');
        }
        return { ...allocation, sent, offered };
    });
    // This saturation is part of the model, not a repair of invalid parameters.
    const input = rawInput.map(value => Math.min(1, value));
    const overflow = rawInput.map((value, i) => value - input[i]);
    const outputs = model.machines.map((machine, i) => evaluate(input[i], machine));
    const externalOutputs = outputs.map((value, i) => (1 - model.fractions[i]) * value);
    for (const flow of flows) {
        flow.nextSent = flow.fraction * outputs[model.index.get(flow.from)];
        flow.nextOffered = flow.conversion * flow.nextSent;
        if (!Number.isFinite(flow.nextOffered)) {
            throw new RangeError('Le flux converti dépasse la plage numérique finie.');
        }
    }
    return {
        previousOutputs: [...previousOutputs], rawInput, input, overflow, outputs,
        externalOutputs, flows, residual: maximumDifference(outputs, previousOutputs),
    };
}

/**
 * y[k] is read once for every machine; outputs contains y[k+1].
 * Arrays follow model.machines order. Flows are ordered by source/destination IDs.
 * sent/offered refer to y[k]; nextSent/nextOffered refer to y[k+1].
 * offered is before saturation: it is not claimed to be entirely consumed.
 * residual is the maximum change in outputs over THIS transition.
 */
export function stepProduction(model, outputsArray) {
    const prepared = prepareModel(model);
    const previousOutputs = outputVector(outputsArray, prepared.machines.length);
    return transition(prepared, previousOutputs);
}

/**
 * Simulate exactly the requested finite horizon, including the initial row.
 * Initial outputs default individually to zero when machine.initial is omitted.
 * No early stopping: an approximate fixed point is not an optimisation result.
 * Final residual is ||F(y_final)-y_final||∞, recomputed AFTER the last transition.
 * period2Observed means only that the last five sampled states alternate within
 * tolerance and the final fixed-point residual exceeds tolerance; no asymptotic
 * period, attractor stability or global convergence is inferred from this flag.
 */
export function simulateProduction(model, options = {}) {
    const prepared = prepareModel(model);
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('Les options de simulation doivent être un objet.');
    }
    if (Object.keys(options).some(key => !['cycles', 'tolerance'].includes(key))) {
        throw new TypeError('Option de simulation inconnue.');
    }
    const { cycles = 40, tolerance = 1e-7 } = options;
    if (!Number.isInteger(cycles) || cycles < 0 || cycles > 10000) {
        throw new RangeError('Le nombre de cycles doit être un entier compris entre 0 et 10 000.');
    }
    finite(tolerance, 'La tolérance');
    if (tolerance <= 0) throw new RangeError('La tolérance doit être strictement positive.');
    let outputs = prepared.machines.map(machine => machine.initial);
    const history = [{
        index: 0, previousOutputs: null, rawInput: null, input: null, overflow: null,
        outputs: [...outputs], externalOutputs: null, flows: [], residual: null,
    }];
    for (let index = 1; index <= cycles; index += 1) {
        const row = transition(prepared, outputs);
        history.push({ index, ...row });
        outputs = row.outputs;
    }
    const residual = transition(prepared, outputs).residual;
    const approximate = residual <= tolerance;
    const period2Observed = !approximate && cycles >= 4
        && [0, 1, 2].every(offset => maximumDifference(
            history[cycles - offset].outputs,
            history[cycles - offset - 2].outputs,
        ) <= tolerance);
    return {
        history, finalOutputs: [...outputs], residual,
        status: approximate ? 'approximate' : 'stillvarying',
        cycles, tolerance, period2Observed,
    };
}

/** Fresh editable illustrative data, never a calibrated industrial network. */
export function createProductionScenario(preset = 'balanced') {
    if (!['balanced', 'threshold', 'oscillating'].includes(preset)) {
        throw new RangeError(`Scénario de production inconnu : ${String(preset)}.`);
    }
    const makeMachines = (params, external) => ['M1', 'M2', 'M3'].map((id, i) => ({
        id, name: `Machine ${i + 1}`, ...params, external: external[i], initial: 0,
    }));
    const links = rows => rows.map(([from, to, fraction]) => ({ from, to, fraction, conversion: 1 }));
    if (preset === 'balanced') {
        return {
            preset, title: 'Production équilibrée',
            description: 'Réponse progressive avec rétroactions modérées ; les données sont fictives et les parts restent propres à chaque machine.',
            machines: makeMachines({ a: 0.1, b: 0.5, c: 0.8, d: 0.4 }, [0.2, 0.15, 0.1]),
            allocations: links([['M1', 'M2', 0.3], ['M1', 'M3', 0.1], ['M2', 'M3', 0.25], ['M3', 'M1', 0.2]]),
        };
    }
    if (preset === 'threshold') {
        return {
            preset, title: 'Démarrage bloqué par les seuils',
            description: 'Depuis zéro, les apports externes restent sous les seuils. Une autre initialisation peut conduire à un autre état ; zéro n’est pas l’unique équilibre.',
            machines: makeMachines({ a: 0.2, b: 0.4, c: 0.8, d: 0.6 }, [0.1, 0.1, 0.1]),
            allocations: links([['M1', 'M2', 0.5], ['M2', 'M3', 0.5], ['M3', 'M1', 0.5]]),
        };
    }
    return {
        preset, title: 'Alternance de deux états',
        description: 'Deux machines couplées atteignent le segment décroissant de leur réponse. Depuis zéro, elles alternent ; la troisième reste inactive dans ce scénario.',
        machines: makeMachines({ a: 0, b: 0.5, c: 1, d: 0 }, [0.5, 0.5, 0]),
        allocations: links([['M1', 'M2', 0.5], ['M2', 'M1', 0.5]]),
    };
}
