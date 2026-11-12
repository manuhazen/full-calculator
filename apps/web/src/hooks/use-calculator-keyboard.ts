import { useEffect } from 'react';
import type { BinaryOperation, DraftAction } from '../lib/calculator-state';

type Props = {
  enabled: boolean;
  onEdit: (action: DraftAction) => void;
  onOperation: (operation: BinaryOperation) => void;
  onCalculate: () => void;
  onUnary: (operation: 'sqrt' | 'percent') => void;
};

export function useCalculatorKeyboard({
  enabled,
  onEdit,
  onOperation,
  onCalculate,
  onUnary,
}: Props) {
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (
        !enabled ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"]',
        )
      )
        return;
      if (target?.closest('button, a, summary') && !target.closest('[aria-label="Calculator"]'))
        return;
      const operations: Record<string, BinaryOperation> = {
        '+': 'add',
        '-': 'subtract',
        '*': 'multiply',
        '/': 'divide',
        '^': 'power',
      };
      if (/^\d$/.test(event.key)) onEdit({ type: 'digit', value: event.key });
      else if (event.key === '.') onEdit({ type: 'decimal' });
      else if (event.key === 'Backspace') onEdit({ type: 'backspace' });
      else if (event.key === 'Escape') onEdit({ type: 'clear' });
      else if (event.key === 'Enter' || event.key === '=') {
        if (!event.repeat) onCalculate();
      } else if (operations[event.key]) onOperation(operations[event.key]);
      else if (event.key === '%') onUnary('percent');
      else if (event.key.toLowerCase() === 'r') onUnary('sqrt');
      else return;
      event.preventDefault();
      document.getElementById('calculator-display')?.focus();
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, onEdit, onOperation, onCalculate, onUnary]);
}
