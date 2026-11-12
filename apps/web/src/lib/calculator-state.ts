export type BinaryOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power';
export type Operation = BinaryOperation | 'sqrt' | 'percent';
export type CalculationInput = { operation: Operation; operands: string[] };
export type Draft = {
  entry: string;
  left: string | null;
  operation: BinaryOperation | null;
  awaiting: boolean;
  result: boolean;
  expression: string;
  error: string | null;
};
export type DraftAction =
  | { type: 'digit'; value: string }
  | { type: 'decimal' | 'sign' | 'backspace' | 'clear' }
  | { type: 'operator'; operation: BinaryOperation }
  | { type: 'load'; value: string }
  | { type: 'success'; value: string; expression: string; nextOperation?: BinaryOperation }
  | { type: 'error'; message: string }
  | { type: 'pending' };

export const operationSymbols: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  sqrt: '√',
  percent: '%',
};
export const emptyDraft = (): Draft => ({
  entry: '0',
  left: null,
  operation: null,
  awaiting: false,
  result: false,
  expression: '',
  error: null,
});
const editable = /^-?(0|[1-9]\d{0,23})(\.\d{0,12})?$/;
export const operand = (entry: string) => (entry.endsWith('.') ? entry.slice(0, -1) : entry);

export function submission(draft: Draft): CalculationInput | null {
  return draft.operation && draft.left !== null && !draft.awaiting
    ? { operation: draft.operation, operands: [draft.left, operand(draft.entry)] }
    : null;
}

// This reducer edits decimal strings only. Every arithmetic result comes from Go.
export function draftReducer(state: Draft, action: DraftAction): Draft {
  if (action.type === 'clear') return emptyDraft();
  if (action.type === 'error') return { ...state, error: action.message };
  if (action.type === 'pending') return { ...state, error: null };
  if (action.type === 'success')
    return {
      entry: action.value,
      left: action.nextOperation ? action.value : null,
      operation: action.nextOperation ?? null,
      awaiting: Boolean(action.nextOperation),
      result: !action.nextOperation,
      expression: action.expression,
      error: null,
    };
  if (action.type === 'operator')
    return {
      ...state,
      left: state.operation && state.awaiting ? state.left : operand(state.entry),
      operation: action.operation,
      awaiting: true,
      result: false,
      expression: '',
      error: null,
    };
  if (action.type === 'load')
    return {
      ...state,
      entry: action.value,
      awaiting: false,
      result: false,
      expression: '',
      error: null,
    };
  if (action.type === 'backspace' && (state.result || state.awaiting)) return state;
  let entry = state.awaiting || (state.result && action.type !== 'sign') ? '0' : state.entry;
  if (action.type === 'digit') {
    if (!/^\d$/.test(action.value)) return state;
    entry =
      entry === '0' ? action.value : entry === '-0' ? `-${action.value}` : entry + action.value;
  } else if (action.type === 'decimal') {
    if (entry.includes('.')) return state;
    entry += '.';
  } else if (action.type === 'sign') entry = entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
  else if (action.type === 'backspace') {
    entry = entry.slice(0, -1);
    if (!entry || entry === '-') entry = '0';
  }
  if (!editable.test(entry))
    return { ...state, error: 'Use at most 24 integer digits and 12 decimal places.' };
  return { ...state, entry, awaiting: false, result: false, expression: '', error: null };
}
