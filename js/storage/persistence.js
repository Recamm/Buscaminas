import { isConfig } from '../game/config.js';
export const STORAGE_KEY = 'buscaminas:v1';
export const defaults = () => ({ difficulty: 'easy', custom: { rows: 10, cols: 10, mines: 15 }, records: {} });
export function parseSaved(raw) {
    const fallback = defaults();
    if (!raw)
        return fallback;
    try {
        const value = JSON.parse(raw);
        if (typeof value !== 'object' || value === null)
            return fallback;
        const v = value;
        if (['easy', 'medium', 'expert', 'custom'].includes(String(v.difficulty)))
            fallback.difficulty = v.difficulty;
        if (isConfig(v.custom))
            fallback.custom = v.custom;
        if (typeof v.records === 'object' && v.records !== null) {
            const records = v.records;
            for (const key of ['easy', 'medium', 'expert'])
                if (typeof records[key] === 'number' && Number.isFinite(records[key]) && records[key] >= 0 && records[key] <= Number.MAX_SAFE_INTEGER)
                    fallback.records[key] = records[key];
        }
    }
    catch { /* Invalid JSON must never prevent playing. */ }
    return fallback;
}
export function loadSaved() { try {
    return parseSaved(window.localStorage.getItem(STORAGE_KEY));
}
catch {
    return defaults();
} }
export function saveData(data) { try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
catch { /* Storage can be disabled or full. */ } }
export function improveRecord(data, difficulty, milliseconds) {
    if (difficulty === 'custom' || !Number.isFinite(milliseconds) || milliseconds < 0)
        return data;
    const old = data.records[difficulty];
    return old === undefined || milliseconds < old ? { ...data, records: { ...data.records, [difficulty]: milliseconds } } : data;
}
