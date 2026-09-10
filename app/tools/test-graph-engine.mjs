import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    CITY_GRAPH, distance, weightedCityGraph, dijkstra, bellmanFord,
    floydWarshall, enumerateSimplePaths, dependentRoutes,
} from '../public/scripts/graph-engine.mjs';

const algorithms = [dijkstra, bellmanFord, floydWarshall];
const makeGraph = (ids, arcs) => ({
    nodes: ids.map(id => ({ id })),
    edges: arcs.map(([from, to, weight]) => ({ from, to, weight })),
});

// Independent oracle: enumerate ordered subsets by permutation, then look up
// their arcs. It does not use a shortest-path algorithm or the engine's DFS.
function permutationOracle(graph, { start = null, end = null, maxDistance = Infinity } = {}) {
    const answer = [];
    const ids = graph.nodes.map(node => node.id);
    const inspect = path => {
        if (path.length < 2 || (start !== null && path[0] !== start)
            || (end !== null && path.at(-1) !== end)) return;
        let cost = 0;
        for (let index = 1; index < path.length; index += 1) {
            const edge = graph.edges.find(arc => arc.from === path[index - 1] && arc.to === path[index]);
            if (!edge) return;
            cost += edge.weight;
        }
        if (cost < maxDistance) answer.push({ path: [...path], distance: cost });
    };
    const permute = (prefix, remaining) => {
        inspect(prefix);
        for (let i = 0; i < remaining.length; i += 1) {
            permute([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
        }
    };
    permute([], ids);
    return answer.sort((a, b) => a.distance - b.distance || a.path.length - b.path.length
        || (a.path.join('\0') < b.path.join('\0') ? -1 : a.path.join('\0') > b.path.join('\0') ? 1 : 0));
}

test('six named cities and nine exact Euclidean bidirectional links', () => {
    assert.deepEqual(CITY_GRAPH.nodes, [
        { id: 'A', name: 'Aulne', x: 0, y: 0 }, { id: 'B', name: 'Bocage', x: 3, y: 0 },
        { id: 'C', name: 'Clairval', x: 0, y: 4 }, { id: 'D', name: 'Dune', x: 3, y: 4 },
        { id: 'E', name: 'Estive', x: 6, y: 4 }, { id: 'F', name: 'Fontaine', x: 6, y: 8 },
    ]);
    const expected = { AB: 3, AC: 4, BC: 5, BD: 4, CD: 3, BE: 5, DE: 3, DF: 5, EF: 4 };
    assert.deepEqual(CITY_GRAPH.edges.map(edge => edge.id), Object.keys(expected));
    const graph = weightedCityGraph();
    assert.equal(graph.edges.length, 18);
    for (const [link, weight] of Object.entries(expected)) {
        for (const [from, to] of [[link[0], link[1]], [link[1], link[0]]]) {
            assert.equal(graph.edges.find(edge => edge.from === from && edge.to === to)?.weight, weight);
        }
    }
    assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
    assert.equal(distance({ x: -3, y: -4 }, { x: -3, y: -4 }), 0);
    assert.equal(distance({ x: 0, y: 0 }, { x: 1, y: 1 }), Math.SQRT2);
});

test('all three algorithms match the independent 6×6 city distance matrix and route oracle', () => {
    const graph = weightedCityGraph();
    const expected = [
        [0, 3, 4, 7, 8, 12], [3, 0, 5, 4, 5, 9], [4, 5, 0, 3, 6, 8],
        [7, 4, 3, 0, 3, 5], [8, 5, 6, 3, 0, 4], [12, 9, 8, 5, 4, 0],
    ];
    const allPaths = permutationOracle(graph);
    for (const [i, from] of graph.nodes.entries()) {
        for (const [j, to] of graph.nodes.entries()) {
            const wanted = i === j ? { distance: 0, path: [from.id] }
                : allPaths.find(route => route.path[0] === from.id && route.path.at(-1) === to.id);
            assert.equal(wanted.distance, expected[i][j]);
            for (const algorithm of algorithms) {
                assert.deepEqual(algorithm(graph, from.id, to.id), wanted, `${algorithm.name}: ${from.id}→${to.id}`);
            }
        }
    }
    assert.deepEqual(dijkstra(graph, 'A', 'F'), { distance: 12, path: ['A', 'B', 'D', 'F'] });
});

test('disconnected directed graphs and identical endpoints have explicit results', () => {
    const graph = makeGraph(['A', 'B', 'C'], [['A', 'B', 2]]);
    for (const algorithm of algorithms) {
        assert.deepEqual(algorithm(graph, 'B', 'A'), { distance: Infinity, path: [] });
        assert.deepEqual(algorithm(graph, 'A', 'C'), { distance: Infinity, path: [] });
        assert.deepEqual(algorithm(graph, 'C', 'C'), { distance: 0, path: ['C'] });
        assert.deepEqual(algorithm(makeGraph(['X'], []), 'X', 'X'), { distance: 0, path: ['X'] });
    }
});

test('ties prefer fewer arcs, then lexical IDs; input order does not matter', () => {
    const graph = makeGraph(['S', 'Z', 'B', 'A', 'T'], [
        ['S', 'Z', 0], ['Z', 'A', 0], ['S', 'A', 0], ['S', 'B', 0],
        ['A', 'B', 0], ['B', 'A', 0], ['A', 'T', 1], ['B', 'T', 1],
    ]);
    const reversed = { nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() };
    for (const algorithm of algorithms) {
        assert.deepEqual(algorithm(graph, 'S', 'T'), { distance: 1, path: ['S', 'A', 'T'] });
        assert.deepEqual(algorithm(reversed, 'S', 'T'), algorithm(graph, 'S', 'T'));
        assert.deepEqual(algorithm(graph, 'S', 'A'), { distance: 0, path: ['S', 'A'] });
    }
    assert.deepEqual(enumerateSimplePaths(graph, { maxDistance: 2 }), enumerateSimplePaths(reversed, { maxDistance: 2 }));
});

test('Bellman–Ford and Floyd–Warshall handle negative edges without negative cycles', () => {
    const graph = makeGraph(['A', 'B', 'C', 'D'], [
        ['A', 'B', 4], ['A', 'C', 5], ['B', 'C', -2], ['C', 'D', 3], ['B', 'D', 10],
    ]);
    for (const algorithm of [bellmanFord, floydWarshall]) {
        assert.deepEqual(algorithm(graph, 'A', 'D'), { distance: 5, path: ['A', 'B', 'C', 'D'] });
        assert.deepEqual(algorithm(graph, 'B', 'C'), { distance: -2, path: ['B', 'C'] });
    }
    assert.throws(() => dijkstra(graph, 'A', 'D'), /non négatifs/);
    assert.throws(() => dijkstra(graph, 'D', 'D'), /non négatifs/);
});

test('negative cycle relevance depends on both requested endpoints', () => {
    const graph = makeGraph(['S', 'A', 'B', 'T', 'X', 'Y'], [
        ['S', 'T', 8], ['S', 'A', 0], ['A', 'B', -2], ['B', 'A', 1],
        ['X', 'Y', -2], ['Y', 'X', 1], ['Y', 'T', 0],
    ]);
    for (const algorithm of [bellmanFord, floydWarshall]) {
        assert.deepEqual(algorithm(graph, 'S', 'T'), { distance: 8, path: ['S', 'T'] });
        assert.deepEqual(algorithm(graph, 'A', 'T'), { distance: Infinity, path: [] });
        assert.deepEqual(algorithm(graph, 'T', 'T'), { distance: 0, path: ['T'] });
        assert.throws(() => algorithm(graph, 'S', 'B'), /Cycle négatif pertinent/);
        assert.throws(() => algorithm(graph, 'X', 'T'), /Cycle négatif pertinent/);
        assert.throws(() => algorithm(graph, 'A', 'A'), /Cycle négatif pertinent/);
        const connected = { ...graph, edges: [...graph.edges, { from: 'B', to: 'T', weight: 2 }] };
        assert.throws(() => algorithm(connected, 'S', 'T'), /Cycle négatif pertinent/);
        assert.throws(() => algorithm(makeGraph(['A'], [['A', 'A', -1]]), 'A', 'A'), /Cycle négatif pertinent/);
    }
});

test('exhaustive all-pairs enumeration equals a permutation oracle at strict bounds', () => {
    const graph = weightedCityGraph();
    for (const maxDistance of [0, 3, 7, 12, 15, 20, 100]) {
        const actual = enumerateSimplePaths(graph, { maxDistance });
        const expected = permutationOracle(graph, { maxDistance });
        assert.deepEqual(actual, expected, `strict bound ${maxDistance}`);
        for (const route of actual) {
            assert.ok(route.path.length >= 2 && route.path.length <= 6);
            assert.equal(new Set(route.path).size, route.path.length);
            assert.ok(route.distance < maxDistance);
        }
    }
    const all = enumerateSimplePaths(graph, { maxDistance: 100 });
    assert.ok(all.length > 100, 'the result is not silently capped at a display limit');
    for (const route of all) {
        assert.ok(all.some(other => other.distance === route.distance && other.path.join(',') === [...route.path].reverse().join(',')));
    }
    assert.deepEqual(enumerateSimplePaths(graph, { start: 'A', end: 'B', maxDistance: 3 }), []);
    assert.deepEqual(enumerateSimplePaths(graph, { start: 'A', end: 'B', maxDistance: 3.000001 }), [{ path: ['A', 'B'], distance: 3 }]);
});

test('all optional endpoint combinations agree with the oracle; no zero-edge or cyclic path', () => {
    const graph = weightedCityGraph();
    for (const start of [null, 'A', 'F']) {
        for (const end of [null, 'A', 'F']) {
            const options = { start, end, maxDistance: 16 };
            assert.deepEqual(enumerateSimplePaths(graph, options), permutationOracle(graph, options));
        }
    }
    assert.deepEqual(enumerateSimplePaths(makeGraph(['A'], [['A', 'A', 0]]), { maxDistance: 10 }), []);
    assert.deepEqual(enumerateSimplePaths(makeGraph(['A', 'B'], []), { maxDistance: 10 }), []);
});

test('enumeration must not prune a costly prefix before a negative arc', () => {
    const graph = makeGraph(['A', 'B', 'C'], [['A', 'B', 10], ['B', 'C', -15], ['C', 'A', 0]]);
    assert.deepEqual(enumerateSimplePaths(graph, { start: 'A', end: 'C', maxDistance: -1 }), [
        { path: ['A', 'B', 'C'], distance: -5 },
    ]);
    assert.deepEqual(enumerateSimplePaths(graph, { maxDistance: 0 }), permutationOracle(graph, { maxDistance: 0 }));
});

test('shortest paths match an exhaustive oracle on deterministic small graph families', () => {
    let seed = 731;
    const random = max => { seed = (1664525 * seed + 1013904223) >>> 0; return seed % max; };
    for (let sample = 0; sample < 18; sample += 1) {
        const ids = ['A', 'B', 'C', 'D', 'E'];
        const potential = ids.map(() => random(9) - 4);
        const positive = [];
        const reweighted = [];
        for (let i = 0; i < ids.length; i += 1) {
            for (let j = 0; j < ids.length; j += 1) {
                if (i !== j && random(3) !== 0) {
                    const weight = random(7);
                    positive.push([ids[i], ids[j], weight]);
                    // A vertex potential preserves every cycle's nonnegative cost.
                    reweighted.push([ids[i], ids[j], weight + potential[j] - potential[i]]);
                }
            }
        }
        for (const [graph, solvers] of [[makeGraph(ids, positive), algorithms], [makeGraph(ids, reweighted), [bellmanFord, floydWarshall]]]) {
            const paths = permutationOracle(graph);
            for (const from of ids) {
                for (const to of ids) {
                    const wanted = from === to ? { distance: 0, path: [from] }
                        : paths.find(route => route.path[0] === from && route.path.at(-1) === to) ?? { distance: Infinity, path: [] };
                    for (const solve of solvers) assert.deepEqual(solve(graph, from, to), wanted, `${sample}: ${solve.name} ${from}→${to}`);
                }
            }
        }
    }
});

test('malformed graphs, endpoints and nonfinite numerical inputs are rejected explicitly', () => {
    const graph = makeGraph(['A', 'B'], [['A', 'B', 1]]);
    const malformed = [
        null, {}, { nodes: [], edges: [] }, { nodes: [null], edges: [] },
        { nodes: [{ id: '' }], edges: [] }, makeGraph(['A', 'A'], []),
        makeGraph(['A'], [['A', 'B', 1]]), { nodes: graph.nodes, edges: [null] },
        makeGraph(['A', 'B'], [['A', 'B', 1], ['A', 'B', 2]]),
        ...[NaN, Infinity, -Infinity, '1', null, undefined].map(weight => makeGraph(['A', 'B'], [['A', 'B', weight]])),
    ];
    for (const bad of malformed) {
        for (const algorithm of algorithms) assert.throws(() => algorithm(bad, 'A', 'B'), TypeError);
        assert.throws(() => enumerateSimplePaths(bad, { maxDistance: 10 }), TypeError);
    }
    for (const algorithm of algorithms) {
        for (const bad of ['', null, undefined, 4]) assert.throws(() => algorithm(graph, bad, 'B'));
        assert.throws(() => algorithm(graph, 'A', 'Z'), /inconnu/);
        assert.throws(() => algorithm(graph, 'Z', 'B'), /inconnu/);
    }
    for (const bad of [null, {}, [], { maxDistance: NaN }, { maxDistance: Infinity }, { maxDistance: '3' },
        { maxDistance: null }, { maxDistance: 3, start: '' }, { maxDistance: 3, end: 'Z' }, { maxDistance: 3, limit: 2 }]) {
        assert.throws(() => enumerateSimplePaths(graph, bad));
    }
    for (const bad of [null, {}, { x: '0', y: 0 }, { x: 0, y: Infinity }]) {
        assert.throws(() => distance(bad, { x: 0, y: 0 }), TypeError);
        assert.throws(() => distance({ x: 0, y: 0 }, bad), TypeError);
    }
    assert.throws(() => distance({ x: Number.MAX_VALUE, y: 0 }, { x: -Number.MAX_VALUE, y: 0 }), RangeError);
});

test('finite arithmetic overflow cannot masquerade as an unreachable route', () => {
    const graph = makeGraph(['A', 'B', 'C'], [['A', 'B', Number.MAX_VALUE], ['B', 'C', Number.MAX_VALUE]]);
    for (const algorithm of algorithms) assert.throws(() => algorithm(graph, 'A', 'C'), /plage numérique/);
    assert.throws(() => enumerateSimplePaths(graph, { maxDistance: Number.MAX_VALUE }), /plage numérique/);
});

test('dependent routes use a fixed external load, minute durations and all tied optima', () => {
    for (const [load, duration, best] of [[0, 4, ['ABD']], [20, 6, ['ABD']], [40, 8, ['ABD', 'ACD']], [60, 8, ['ACD']], [100, 8, ['ACD']]]) {
        const result = dependentRoutes(load);
        assert.equal(result.load, load);
        assert.equal(result.unit, 'min');
        assert.deepEqual(result.routes, [
            { id: 'ABD', path: ['A', 'B', 'D'], times: [2, 2 + load / 10], duration: 4 + load / 10 },
            { id: 'ACD', path: ['A', 'C', 'D'], times: [4, 4], duration: 8 },
        ]);
        assert.equal(result.bestDuration, duration);
        assert.deepEqual(result.best.map(route => route.id), best);
        for (const route of result.routes) assert.equal(route.duration, route.times.reduce((sum, time) => sum + time, 0));
    }
    assert.equal(dependentRoutes(39.9).best[0].id, 'ABD');
    assert.equal(dependentRoutes(40.1).best[0].id, 'ACD');
    assert.equal(dependentRoutes(12.5).routes[0].duration, 5.25);
    for (const load of [-1, 101, NaN, Infinity, -Infinity, '40', null, undefined]) {
        assert.throws(() => dependentRoutes(load));
    }
});

test('engine functions do not mutate inputs or leak shared state between calls', () => {
    const graph = weightedCityGraph();
    const before = structuredClone(graph);
    for (const algorithm of algorithms) algorithm(graph, 'A', 'F');
    enumerateSimplePaths(graph, { maxDistance: 15 });
    assert.deepEqual(graph, before);
    graph.nodes[0].x = 999;
    graph.edges[0].weight = 999;
    assert.equal(CITY_GRAPH.nodes[0].x, 0);
    assert.equal(weightedCityGraph().edges[0].weight, 3);
    const answer = dijkstra(weightedCityGraph(), 'A', 'F');
    answer.path.push('X');
    assert.deepEqual(dijkstra(weightedCityGraph(), 'A', 'F').path, ['A', 'B', 'D', 'F']);
    dependentRoutes(40).routes[0].times[0] = 999;
    assert.equal(dependentRoutes(40).routes[0].times[0], 2);
});
