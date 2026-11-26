import { describe, expect, it } from 'vitest';
import { flushes, unique5 } from '.';
import { flushes as shippedFlushes } from './fixtures/flushes';
import { unique5 as shippedUnique5 } from './fixtures/unique5';

/*
 * The tables are generated at import. Each one must equal, element for element,
 * the table the package shipped as data (src/tables/fixtures/, identical to 1.0.1).
 */
describe.each([
  ['flushes', flushes, shippedFlushes],
  ['unique5', unique5, shippedUnique5],
])('%s', (_name, table, expected) => {
  it('is a plain array, like the one 1.0.1 exported', () => {
    expect(Array.isArray(table)).toBe(true);
  });

  it('has as many entries as the shipped table', () => {
    expect(table.length).toBe(expected.length);
  });

  it('equals the shipped table, element by element', () => {
    const mismatches = expected.flatMap((value, index) =>
      table[index] === value ? [] : [{ index, expected: value, actual: table[index] }],
    );
    expect(mismatches.slice(0, 10)).toEqual([]);
  });
});
