import { Delete, Equal, LoaderCircle } from 'lucide-react';
import {
  type BinaryOperation,
  type Draft,
  type DraftAction,
  operand,
  operationSymbols,
  submission,
} from '../lib/calculator-state';

type Props = {
  draft: Draft;
  busy?: boolean;
  disabled?: boolean;
  busyMessage?: string;
  onEdit: (action: DraftAction) => void;
  onOperation: (operation: BinaryOperation) => void;
  onCalculate: () => void;
  onUnary: (operation: 'sqrt' | 'percent') => void;
};

export function Calculator({
  draft,
  busy = false,
  disabled = false,
  busyMessage = 'Calculating…',
  onEdit,
  onOperation,
  onCalculate,
  onUnary,
}: Props) {
  const locked = busy || disabled;
  const op = (name: BinaryOperation, label: string) => (
    <button
      className="calc-key operation-key"
      aria-label={label}
      aria-pressed={draft.operation === name}
      disabled={locked}
      onClick={() => onOperation(name)}
    >
      {operationSymbols[name]}
    </button>
  );
  const digit = (value: string, wide = false) => (
    <button
      className={`calc-key number-key${wide ? ' zero-key' : ''}`}
      disabled={locked}
      onClick={() => onEdit({ type: 'digit', value })}
    >
      {value}
    </button>
  );
  const expression = draft.operation
    ? `${draft.left} ${operationSymbols[draft.operation]}`
    : draft.expression
      ? `${draft.expression} =`
      : 'Ready when you are';
  return (
    <section className="calculator" aria-label="Calculator" aria-busy={busy}>
      <div className="calc-display">
        <div className="display-expression" title={expression}>
          {expression}
        </div>
        <output
          id="calculator-display"
          tabIndex={-1}
          aria-label="Calculator display"
          className="display-number"
          data-long={draft.entry.length > 14 || undefined}
        >
          {draft.entry}
        </output>
        <div className="display-caption">
          {busy
            ? busyMessage
            : draft.result
              ? 'Result'
              : draft.awaiting
                ? 'Enter the next number'
                : 'Current input'}
        </div>
      </div>
      <div className="advanced-keys">
        <button
          aria-label="Power"
          className="advanced-key"
          aria-pressed={draft.operation === 'power'}
          disabled={locked}
          onClick={() => onOperation('power')}
        >
          x<sup>y</sup>
        </button>
        <button
          aria-label="Square root"
          className="advanced-key"
          disabled={locked || Boolean(draft.operation)}
          onClick={() => onUnary('sqrt')}
        >
          √x
        </button>
        <button
          aria-label="Percentage"
          className="advanced-key"
          disabled={locked || Boolean(draft.operation)}
          onClick={() => onUnary('percent')}
        >
          %
        </button>
      </div>
      <div className="keypad">
        <button
          className="calc-key utility-key"
          aria-label="Clear calculator"
          disabled={locked}
          onClick={() => onEdit({ type: 'clear' })}
        >
          AC
        </button>
        <button
          className="calc-key utility-key"
          aria-label="Change sign"
          disabled={locked}
          onClick={() => onEdit({ type: 'sign' })}
        >
          ±
        </button>
        <button
          className="calc-key utility-key"
          aria-label="Backspace"
          disabled={locked || draft.result || draft.awaiting}
          onClick={() => onEdit({ type: 'backspace' })}
        >
          <Delete size={21} strokeWidth={1.6} />
        </button>
        {op('divide', 'Divide')}
        {digit('7')}
        {digit('8')}
        {digit('9')}
        {op('multiply', 'Multiply')}
        {digit('4')}
        {digit('5')}
        {digit('6')}
        {op('subtract', 'Subtract')}
        {digit('1')}
        {digit('2')}
        {digit('3')}
        {op('add', 'Add')}
        {digit('0', true)}
        <button
          className="calc-key number-key"
          aria-label="Decimal point"
          disabled={locked}
          onClick={() => onEdit({ type: 'decimal' })}
        >
          .
        </button>
        <button
          className="calc-key equals-key"
          aria-label="Calculate"
          disabled={locked || !submission(draft)}
          onClick={onCalculate}
        >
          {busy ? <LoaderCircle className="animate-spin" size={22} /> : <Equal size={24} />}
        </button>
      </div>
      <p className="calculator-hint">
        {draft.operation === 'power'
          ? 'Integer exponents from −20 to 20'
          : 'Precise to 12 decimal places'}
        <span className="sr-only"> Current value {operand(draft.entry)}</span>
      </p>
    </section>
  );
}
