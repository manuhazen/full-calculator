import { describe, expect, it } from 'vitest';
import { draftReducer as reduce, emptyDraft, submission } from './calculator-state';

describe('calculator input strings', () => {
  it('changes the sign of a returned result and preserves it when chaining', () => {
    const result = reduce(emptyDraft(), { type: 'success', value: '10', expression: '5 + 5' });
    const negative = reduce(result, { type: 'sign' });
    expect(negative.entry).toBe('-10');
    expect(reduce(negative, { type: 'sign' }).entry).toBe('10');
    const pending = reduce(negative, { type: 'operator', operation: 'multiply' });
    expect(submission(reduce(pending, { type: 'digit', value: '2' }))).toEqual({
      operation: 'multiply',
      operands: ['-10', '2'],
    });
  });
  it('edits decimals, sign and backspace without doing arithmetic', () => {
    let state = reduce(emptyDraft(), { type: 'digit', value: '1' });
    state = reduce(state, { type: 'decimal' });
    state = reduce(state, { type: 'digit', value: '5' });
    state = reduce(state, { type: 'decimal' });
    expect(state.entry).toBe('1.5');
    state = reduce(state, { type: 'sign' });
    expect(state.entry).toBe('-1.5');
    state = reduce(state, { type: 'backspace' });
    expect(state.entry).toBe('-1.');
    state = reduce(state, { type: 'operator', operation: 'add' });
    expect(state.left).toBe('-1');
    state = reduce(state, { type: 'operator', operation: 'multiply' });
    expect(state.left).toBe('-1');
    state = reduce(state, { type: 'digit', value: '2' });
    expect(submission(state)).toEqual({ operation: 'multiply', operands: ['-1', '2'] });
    expect(state.entry).toBe('2');
  });
  it('uses returned results, starts fresh typing and keeps chaining structured', () => {
    const result = reduce(emptyDraft(), {
      type: 'success',
      value: '19.75',
      expression: '12.50 + 7.25',
    });
    expect(submission(result)).toBeNull();
    expect(reduce(result, { type: 'digit', value: '3' }).entry).toBe('3');
    const chained = reduce(result, { type: 'operator', operation: 'divide' });
    expect(chained.left).toBe('19.75');
    expect(chained.awaiting).toBe(true);
  });
  it('limits input length and preserves a pending operation when reusing a result', () => {
    let state = emptyDraft();
    for (let n = 0; n < 25; n++) state = reduce(state, { type: 'digit', value: '9' });
    expect(state.entry).toHaveLength(24);
    expect(state.error).toContain('24 integer');
    state = reduce(state, { type: 'operator', operation: 'add' });
    state = reduce(state, { type: 'load', value: '0.000000000001' });
    expect(submission(state)?.operands[1]).toBe('0.000000000001');
    expect(reduce(state, { type: 'clear' })).toEqual(emptyDraft());
  });
});
