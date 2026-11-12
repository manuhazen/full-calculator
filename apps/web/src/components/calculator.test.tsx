import { useReducer } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Calculator } from './calculator'
import { draftReducer, emptyDraft, submission } from '../lib/calculator-state'

describe('calculator keypad', () => {
  it('collects numeric operands and delegates calculation then displays the server result', async () => {
    const submit = vi.fn()
    function Harness() {
      const [draft, dispatch] = useReducer(draftReducer, undefined, emptyDraft)
      return <Calculator draft={draft} onEdit={dispatch} onOperation={operation => dispatch({ type: 'operator', operation })} onUnary={() => {}} onCalculate={() => { submit(submission(draft)); dispatch({ type: 'success', value: '19.75', expression: '12.50 + 7.25' }) }} />
    }
    const user = userEvent.setup(); render(<Harness />)
    for (const label of ['1', '2', 'Decimal point', '5', '0', 'Add', '7', 'Decimal point', '2', '5', 'Calculate']) await user.click(screen.getByRole('button', { name: label }))
    expect(submit).toHaveBeenCalledWith({ operation: 'add', operands: ['12.50', '7.25'] })
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('19.75')
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled()
  })
})
