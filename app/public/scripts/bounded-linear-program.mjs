/** Small numerical LP solver shared by the branch studies. No DOM or state. */
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

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);

/** Maximise c*x+constant, A*x<=b, with explicit finite box 0<=x<=bounds. */
export function solveBoundedLinearProgram({ A, b, c, bounds, constant = 0 }, { tolerance = 1e-8 } = {}) {
    const n = c?.length;
    if (!Number.isInteger(n) || n < 1 || !Array.isArray(A) || !Array.isArray(b) || A.length !== b.length
        || !Array.isArray(bounds) || bounds.length !== n || !Number.isFinite(constant)
        || !Number.isFinite(tolerance) || tolerance <= 0
        || !c.every(Number.isFinite) || !bounds.every(x => Number.isFinite(x) && x >= 0)
        || !b.every(Number.isFinite) || !A.every(row => Array.isArray(row) && row.length === n && row.every(Number.isFinite))) {
        throw new TypeError('Programme linéaire borné invalide.');
    }
    const rawA = A.map(row => [...row]), rawB = [...b];
    for (let j = 0; j < n; j += 1) {
        rawA.push(Array.from({ length: n }, (_, k) => j === k ? 1 : 0)); rawB.push(bounds[j]);
    }
    const scales = rawA.map((row, i) => Math.max(1, Math.abs(rawB[i]), ...row.map(Math.abs)));
    const matrix = rawA.map((row, i) => row.map(value => value / scales[i]));
    const rhs = rawB.map((value, i) => value / scales[i]);
    const objectiveScale = Math.max(1, ...c.map(Math.abs));
    const solved = linearProgram(matrix, rhs, c.map(value => value / objectiveScale));
    if (!solved.multipliers) return { status: 'uncertain', reason: 'simplex', pivots: solved.pivots };
    const infeasible = solved.status === 'infeasible';
    const objective = infeasible ? Array(n).fill(0) : c;
    const offset = infeasible ? 0 : constant;
    const multipliers = solved.multipliers.map(value => Math.max(0, value * (infeasible ? 1 : objectiveScale)));
    if (!multipliers.every(Number.isFinite)) return { status: 'uncertain', reason: 'multipliers' };
    let value = offset, magnitude = Math.abs(offset), dualResidual = 0, correction = 0, coefficientMargin = 0;
    for (let i = 0; i < rhs.length; i += 1) {
        const term = multipliers[i] * rhs[i]; value += term; magnitude += Math.abs(term);
    }
    for (let j = 0; j < n; j += 1) {
        let residual = objective[j], columnMagnitude = Math.abs(objective[j]);
        for (let i = 0; i < rhs.length; i += 1) {
            const term = multipliers[i] * matrix[i][j]; residual -= term; columnMagnitude += Math.abs(term);
        }
        const allowance = 128 * Number.EPSILON * (1 + columnMagnitude);
        dualResidual = Math.max(dualResidual, residual);
        correction += Math.max(0, residual) * bounds[j];
        coefficientMargin += (Math.max(0, residual + allowance) - Math.max(0, residual)) * bounds[j];
    }
    const margin = coefficientMargin + 1024 * Number.EPSILON * (1 + magnitude + correction);
    const upperBound = value + correction + margin;
    const certificate = { upperBound, dualResidual, correction, margin, multipliers, scales, pivots: solved.pivots };
    if (![upperBound, margin, correction].every(Number.isFinite)) return { status: 'uncertain', reason: 'bound' };
    if (infeasible) return upperBound < 0
        ? { status: 'infeasible', certificate }
        : { status: 'uncertain', certificate, reason: 'infeasibility-not-verified' };
    const point = solved.point;
    const primalResidual = Math.max(0, ...point.map(x => -x), ...rawA.map((row, i) => dot(row, point) - rawB[i]));
    if (!Number.isFinite(primalResidual) || primalResidual > tolerance) return { status: 'uncertain', certificate, primalResidual, reason: 'primal-residual' };
    const objectiveValue = offset + dot(c, point);
    if (objectiveValue > upperBound + tolerance) return { status: 'uncertain', certificate, primalResidual, reason: 'contradictory-bound' };
    return { status: 'optimal', point, objectiveValue, primalResidual, certificate };
}
