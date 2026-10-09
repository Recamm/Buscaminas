export const maxMines = (rows, cols) => Math.min(Math.floor(rows * cols * 0.35), rows * cols - 9);
export function validateConfig(config) {
    const errors = [];
    if (!Number.isInteger(config.rows) || config.rows < 5 || config.rows > 30)
        errors.push('Las filas deben ser un número entero entre 5 y 30.');
    if (!Number.isInteger(config.cols) || config.cols < 5 || config.cols > 30)
        errors.push('Las columnas deben ser un número entero entre 5 y 30.');
    if (!errors.length && (!Number.isInteger(config.mines) || config.mines < 1 || config.mines > maxMines(config.rows, config.cols)))
        errors.push(`Las minas deben ser un número entero entre 1 y ${maxMines(config.rows, config.cols)}.`);
    return errors;
}
export function isConfig(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const v = value;
    return typeof v.rows === 'number' && typeof v.cols === 'number' && typeof v.mines === 'number' && !validateConfig({ rows: v.rows, cols: v.cols, mines: v.mines }).length;
}
