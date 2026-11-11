/**
 * Where the dots go. A kolam starts as a grid of dots (pulli); the line is drawn around them
 * afterwards. Every arrangement here is symmetric about both axes and centred on a dot.
 */
export const ARRANGEMENTS = ['square-5', 'diamond-5', 'diamond-7'] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export const ARRANGEMENT_LABEL: Readonly<Record<Arrangement, string>> = {
  'square-5': '5 × 5 square',
  'diamond-5': '1-3-5-3-1 diamond',
  'diamond-7': '1-3-5-7-5-3-1 diamond',
};

/** A dot position in whole grid steps from the centre dot. Rows grow downwards. */
export interface GridDot {
  readonly col: number;
  readonly row: number;
}

/** Dots per row, top to bottom. */
const ROWS: Readonly<Record<Arrangement, readonly number[]>> = {
  'square-5': [5, 5, 5, 5, 5],
  'diamond-5': [1, 3, 5, 3, 1],
  'diamond-7': [1, 3, 5, 7, 5, 3, 1],
};

export function dotsFor(arrangement: Arrangement): readonly GridDot[] {
  return dotsFromRows(ROWS[arrangement]);
}

/**
 * Builds a centred arrangement from the number of dots in each row.
 * Rows must be odd in number, odd in length and mirrored top to bottom, so that the figure has
 * a centre dot and both mirror axes.
 */
export function dotsFromRows(rows: readonly number[]): readonly GridDot[] {
  assertSymmetricRows(rows);
  const middleRow = (rows.length - 1) / 2;

  return rows.flatMap((count, rowIndex) => {
    const reach = (count - 1) / 2;
    return Array.from({ length: count }, (_, index) => ({
      col: index - reach,
      row: rowIndex - middleRow,
    }));
  });
}

function assertSymmetricRows(rows: readonly number[]): void {
  const isOdd = (value: number) => Number.isSafeInteger(value) && value > 0 && value % 2 === 1;

  if (!isOdd(rows.length) || !rows.every(isOdd)) {
    throw new RangeError('A kolam needs an odd number of rows, each with an odd number of dots.');
  }
  const mirrored = rows.every((count, index) => count === rows[rows.length - 1 - index]);
  if (!mirrored) {
    throw new RangeError('The rows of a kolam must mirror top to bottom.');
  }
}
