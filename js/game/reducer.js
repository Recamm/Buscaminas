import { emptyBoard, generateBoard, hasWon, neighbors, revealRegion, seededRandom } from './engine.js';
import { validateConfig } from './config.js';
export function createGame(config, difficulty) {
    const errors = validateConfig(config);
    if (errors.length)
        throw new Error(errors.join(' '));
    return { round: 0, config: { ...config }, difficulty, cells: emptyBoard(config), generated: false, status: 'ready', startedAt: null, endedAt: null, detonated: null };
}
export function gameReducer(state, action) {
    if (action.type === 'reset')
        return { ...createGame(action.config, action.difficulty), round: state.round + 1 };
    if (state.status === 'won' || state.status === 'lost' || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.cells.length)
        return state;
    const cell = state.cells[action.index];
    if (action.type === 'flag') {
        if (cell.revealed)
            return state;
        const cells = state.cells.slice();
        cells[action.index] = { ...cell, flagged: !cell.flagged };
        return { ...state, cells };
    }
    if (cell.flagged)
        return state;
    let indices = [action.index];
    if (cell.revealed) {
        if (!cell.adjacent)
            return state;
        const around = neighbors(action.index, state.config);
        if (around.filter(i => state.cells[i].flagged).length !== cell.adjacent)
            return state;
        indices = around.filter(i => !state.cells[i].flagged && !state.cells[i].revealed);
        if (!indices.length)
            return state;
    }
    const board = state.generated ? state.cells : generateBoard(state.config, action.index, seededRandom(action.seed), state.cells);
    const result = revealRegion(board, state.config, indices);
    // Resolve all neighbors first. Detonation takes precedence over completing safe cells.
    const status = result.detonated !== null ? 'lost' : hasWon(result.cells) ? 'won' : 'playing';
    return { ...state, ...result, generated: true, startedAt: state.startedAt ?? action.now, endedAt: status === 'playing' ? null : action.now, status };
}
