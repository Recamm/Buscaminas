export function seededRandom(seed) {
    let value = seed >>> 0;
    return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function emptyBoard(config) {
    return Array.from({ length: config.rows * config.cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false }));
}
export function neighbors(index, config) {
    const row = Math.floor(index / config.cols), col = index % config.cols, result = [];
    for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if ((dr || dc) && r >= 0 && r < config.rows && c >= 0 && c < config.cols)
                result.push(r * config.cols + c);
        }
    return result;
}
export function countAdjacent(cells, config) {
    return cells.map((cell, index) => ({ ...cell, adjacent: neighbors(index, config).filter(i => cells[i].mine).length }));
}
export function generateBoard(config, first, random, previous = emptyBoard(config)) {
    const excluded = new Set([first, ...neighbors(first, config)]);
    const candidates = previous.map((_, index) => index).filter(index => !excluded.has(index));
    if (config.mines > candidates.length)
        throw new Error('Demasiadas minas para una primera jugada segura.');
    const cells = previous.map(cell => ({ ...cell, mine: false, adjacent: 0 }));
    // Partial Fisher–Yates: each eligible position has the same probability, with no duplicates.
    for (let i = 0; i < config.mines; i++) {
        const draw = random();
        if (!Number.isFinite(draw) || draw < 0 || draw >= 1)
            throw new Error('La aleatoriedad debe estar entre 0 y 1 (exclusivo).');
        const j = i + Math.floor(draw * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        cells[candidates[i]].mine = true;
    }
    return countAdjacent(cells, config);
}
export function revealRegion(cells, config, indices) {
    const result = cells.slice(), queue = [...indices], visited = new Set();
    let detonated = null;
    for (let head = 0; head < queue.length; head++) {
        const index = queue[head];
        if (visited.has(index) || index < 0 || index >= cells.length)
            continue;
        visited.add(index);
        const cell = result[index];
        if (cell.flagged || cell.revealed)
            continue;
        result[index] = { ...cell, revealed: true };
        if (cell.mine) {
            detonated ??= index;
            continue;
        }
        if (cell.adjacent === 0)
            queue.push(...neighbors(index, config));
    }
    return { cells: result, detonated };
}
export const hasWon = (cells) => cells.every(cell => cell.mine || cell.revealed);
