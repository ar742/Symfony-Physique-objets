/**
 * Pure graph calculations: no DOM, network, storage or mutable shared state.
 * Graphs are directed and simple: one finite weight per ordered pair of nodes.
 * Shortest-path ties use fewer arcs, then lexicographic node IDs (code-unit order).
 * Numerical comparisons use JavaScript numbers, without an implicit tolerance.
 */

export const CITY_GRAPH = Object.freeze({
    nodes: Object.freeze([
        { id: 'A', name: 'Aulne', x: 0, y: 0 },
        { id: 'B', name: 'Bocage', x: 3, y: 0 },
        { id: 'C', name: 'Clairval', x: 0, y: 4 },
        { id: 'D', name: 'Dune', x: 3, y: 4 },
        { id: 'E', name: 'Estive', x: 6, y: 4 },
        { id: 'F', name: 'Fontaine', x: 6, y: 8 },
    ].map(Object.freeze)),
    edges: Object.freeze([
        ['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'],
        ['B', 'E'], ['D', 'E'], ['D', 'F'], ['E', 'F'],
    ].map(([from, to]) => Object.freeze({ id: from + to, from, to }))),
});

function finiteNumber(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`${label} doit être un nombre fini.`);
    }
}

function finiteSum(a, b) {
    const result = a + b;
    if (!Number.isFinite(result)) {
        throw new RangeError('Le coût cumulé dépasse la plage numérique finie.');
    }
    return result;
}

function compareIds(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function comparePaths(a, b) {
    if (a.length !== b.length) return a.length - b.length;
    for (let i = 0; i < a.length; i += 1) {
        const order = compareIds(a[i], b[i]);
        if (order !== 0) return order;
    }
    return 0;
}

function compareResults(a, b) {
    if (a.distance !== b.distance) return a.distance < b.distance ? -1 : 1;
    return comparePaths(a.path, b.path);
}

function absent() {
    return { distance: Infinity, path: [] };
}

function validId(id, label) {
    if (typeof id !== 'string' || id.trim() === '') {
        throw new TypeError(`${label} doit être un identifiant non vide.`);
    }
}

function prepareGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)
        || graph.nodes.length === 0) {
        throw new TypeError('Le graphe doit contenir des tableaux nodes et edges et au moins un sommet.');
    }
    const ids = [];
    const known = new Set();
    for (const node of graph.nodes) {
        validId(node?.id, 'Chaque sommet');
        if (known.has(node.id)) throw new TypeError(`Sommet dupliqué : ${node.id}.`);
        known.add(node.id);
        ids.push(node.id);
    }
    ids.sort(compareIds);
    const outgoing = new Map(ids.map(id => [id, []]));
    const incoming = new Map(ids.map(id => [id, []]));
    const pairs = new Map(ids.map(id => [id, new Set()]));
    const edges = graph.edges.map(edge => {
        if (!edge || !known.has(edge.from) || !known.has(edge.to)) {
            throw new TypeError('Chaque arc doit relier deux sommets existants.');
        }
        finiteNumber(edge.weight, 'Le poids de chaque arc');
        if (pairs.get(edge.from).has(edge.to)) {
            throw new TypeError(`Arc dirigé dupliqué : ${edge.from} → ${edge.to}.`);
        }
        pairs.get(edge.from).add(edge.to);
        return { from: edge.from, to: edge.to, weight: edge.weight };
    });
    edges.sort((a, b) => compareIds(a.from, b.from) || compareIds(a.to, b.to));
    for (const edge of edges) {
        outgoing.get(edge.from).push(edge);
        incoming.get(edge.to).push(edge);
    }
    return { ids, known, edges, outgoing, incoming };
}

function endpoint(graph, id, label) {
    validId(id, label);
    if (!graph.known.has(id)) throw new RangeError(`${label} inconnu : ${id}.`);
}

function prepareRequest(graph, start, end) {
    const prepared = prepareGraph(graph);
    endpoint(prepared, start, 'Départ');
    endpoint(prepared, end, 'Arrivée');
    return prepared;
}

function canReachEnd(graph, end) {
    const reached = new Set([end]);
    const pending = [end];
    while (pending.length > 0) {
        for (const edge of graph.incoming.get(pending.pop())) {
            if (!reached.has(edge.from)) {
                reached.add(edge.from);
                pending.push(edge.from);
            }
        }
    }
    return reached;
}

/** Euclidean distance; x and y are expressed in kilometres in CITY_GRAPH. */
export function distance(a, b) {
    for (const [point, label] of [[a, 'Premier point'], [b, 'Second point']]) {
        finiteNumber(point?.x, `${label} : x`);
        finiteNumber(point?.y, `${label} : y`);
    }
    const result = Math.hypot(a.x - b.x, a.y - b.y);
    if (!Number.isFinite(result)) throw new RangeError('La distance dépasse la plage numérique finie.');
    return result;
}

/** A fresh graph with both directed arcs of each bidirectional city link. */
export function weightedCityGraph() {
    const nodes = CITY_GRAPH.nodes.map(node => ({ ...node }));
    const byId = new Map(nodes.map(node => [node.id, node]));
    const edges = CITY_GRAPH.edges.flatMap(({ id, from, to }) => {
        const weight = distance(byId.get(from), byId.get(to));
        return [{ id, from, to, weight }, { id, from: to, to: from, weight }];
    });
    return { nodes, edges };
}

/** Dijkstra requires every arc weight to be nonnegative, including disconnected arcs. */
export function dijkstra(graph, start, end) {
    const g = prepareRequest(graph, start, end);
    if (g.edges.some(edge => edge.weight < 0)) {
        throw new RangeError('Dijkstra exige des poids non négatifs.');
    }
    const labels = new Map(g.ids.map(id => [id, absent()]));
    labels.set(start, { distance: 0, path: [start] });
    const unsettled = new Set(g.ids);
    while (unsettled.size > 0) {
        let chosen = null;
        for (const id of unsettled) {
            if (chosen === null || compareResults(labels.get(id), labels.get(chosen)) < 0) chosen = id;
        }
        const current = labels.get(chosen);
        if (current.distance === Infinity) break;
        unsettled.delete(chosen);
        if (chosen === end) break;
        for (const edge of g.outgoing.get(chosen)) {
            if (!unsettled.has(edge.to)) continue;
            const candidate = {
                distance: finiteSum(current.distance, edge.weight),
                path: [...current.path, edge.to],
            };
            if (compareResults(candidate, labels.get(edge.to)) < 0) labels.set(edge.to, candidate);
        }
    }
    return labels.get(end);
}

/** Negative cycles are errors only if reachable from start and able to reach end. */
export function bellmanFord(graph, start, end) {
    const g = prepareRequest(graph, start, end);
    let labels = new Map(g.ids.map(id => [id, absent()]));
    labels.set(start, { distance: 0, path: [start] });
    // Synchronous passes describe walks with at most pass arcs.
    for (let pass = 1; pass < g.ids.length; pass += 1) {
        const next = new Map(labels);
        let changed = false;
        for (const edge of g.edges) {
            const prefix = labels.get(edge.from);
            if (prefix.distance === Infinity) continue;
            const candidate = {
                distance: finiteSum(prefix.distance, edge.weight),
                path: [...prefix.path, edge.to],
            };
            if (compareResults(candidate, next.get(edge.to)) < 0) {
                next.set(edge.to, candidate);
                changed = true;
            }
        }
        labels = next;
        if (!changed) break;
    }
    const reachesEnd = canReachEnd(g, end);
    for (const edge of g.edges) {
        const prefix = labels.get(edge.from);
        if (prefix.distance !== Infinity && reachesEnd.has(edge.to)
            && finiteSum(prefix.distance, edge.weight) < labels.get(edge.to).distance) {
            throw new RangeError('Cycle négatif pertinent : aucun plus court chemin fini entre ce départ et cette arrivée.');
        }
    }
    return labels.get(end);
}

/** Floyd–Warshall computes the pair requested after building the all-pairs matrix. */
export function floydWarshall(graph, start, end) {
    const g = prepareRequest(graph, start, end);
    const indices = new Map(g.ids.map((id, index) => [id, index]));
    const matrix = g.ids.map(from => g.ids.map(to => from === to
        ? { distance: 0, path: [from] } : absent()));
    for (const edge of g.edges) {
        const i = indices.get(edge.from);
        const j = indices.get(edge.to);
        const direct = { distance: edge.weight, path: [edge.from, edge.to] };
        if (compareResults(direct, matrix[i][j]) < 0) matrix[i][j] = direct;
    }
    for (let k = 0; k < g.ids.length; k += 1) {
        // Each layer uses only paths whose internal vertices precede k.
        const previous = matrix.map(row => row.slice());
        for (let i = 0; i < g.ids.length; i += 1) {
            for (let j = 0; j < g.ids.length; j += 1) {
                const left = previous[i][k];
                const right = previous[k][j];
                if (left.distance === Infinity || right.distance === Infinity) continue;
                const candidate = {
                    distance: finiteSum(left.distance, right.distance),
                    path: [...left.path, ...right.path.slice(1)],
                };
                if (compareResults(candidate, matrix[i][j]) < 0) matrix[i][j] = candidate;
            }
        }
    }
    const s = indices.get(start);
    const t = indices.get(end);
    for (let k = 0; k < g.ids.length; k += 1) {
        if (matrix[s][k].distance !== Infinity && matrix[k][t].distance !== Infinity
            && matrix[k][k].distance < 0) {
            throw new RangeError('Cycle négatif pertinent : aucun plus court chemin fini entre ce départ et cette arrivée.');
        }
    }
    return matrix[s][t];
}

/**
 * Exhaustive simple directed paths, sorted by cost, arc count, then node IDs.
 * At least one arc, no repeated vertex. All endpoints are ordered when omitted.
 * maxDistance is required and finite; the comparison is strictly <, not <=.
 * Negative weights/bounds are supported: no prefix-cost pruning is performed.
 * Enumeration is intentionally untruncated; the interactive city graph has six nodes.
 */
export function enumerateSimplePaths(graph, options) {
    const g = prepareGraph(graph);
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('Les paramètres de recherche doivent préciser maxDistance.');
    }
    if (Object.keys(options).some(key => !['start', 'end', 'maxDistance'].includes(key))) {
        throw new TypeError('Paramètre de recherche inconnu.');
    }
    const { start = null, end = null, maxDistance } = options;
    finiteNumber(maxDistance, 'maxDistance');
    if (start !== null) endpoint(g, start, 'Départ');
    if (end !== null) endpoint(g, end, 'Arrivée');
    const results = [];
    for (const origin of start === null ? g.ids : [start]) {
        const visit = (current, path, visited, cost) => {
            if (path.length > 1 && (end === null || current === end) && cost < maxDistance) {
                results.push({ path: [...path], distance: cost });
            }
            if (end !== null && current === end) return;
            for (const edge of g.outgoing.get(current)) {
                if (visited.has(edge.to)) continue;
                visited.add(edge.to);
                path.push(edge.to);
                visit(edge.to, path, visited, finiteSum(cost, edge.weight));
                path.pop();
                visited.delete(edge.to);
            }
        };
        visit(origin, [origin], new Set([origin]), 0);
    }
    return results.sort(compareResults);
}

/**
 * Two alternative directed routes with load held externally fixed, in vehicles/min.
 * Costs are durations in minutes, not distances. This is a static comparison,
 * not a traffic equilibrium or a solver for mutually dependent network flows.
 */
export function dependentRoutes(load) {
    finiteNumber(load, 'Le débit externe');
    if (load < 0 || load > 100) throw new RangeError('Le débit externe doit être compris entre 0 et 100 véhicules/min.');
    const routes = [
        { id: 'ABD', path: ['A', 'B', 'D'], times: [2, 2 + load / 10], duration: 4 + load / 10 },
        { id: 'ACD', path: ['A', 'C', 'D'], times: [4, 4], duration: 8 },
    ];
    const bestDuration = Math.min(...routes.map(route => route.duration));
    return { load, unit: 'min', routes, best: routes.filter(route => route.duration === bestDuration), bestDuration };
}
