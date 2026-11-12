import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { api } from './lib/api'
import { mockApi, threadFixture } from './test/mock-api'

export function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><App /></QueryClientProvider>)
  return client
}

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('thread workspace', () => {
  it('creates, validates renaming and confirms deletion of a thread', async () => {
    mockApi(); const user = userEvent.setup(); renderWorkspace()
    await screen.findByRole('heading', { name: 'A fresh start for your numbers' })
    await user.click(screen.getByRole('button', { name: 'Create a thread' }))
    await screen.findByRole('heading', { name: 'Untitled Thread' })
    await user.click(screen.getByRole('button', { name: 'Rename thread' }))
    const dialog = screen.getByRole('dialog', { name: 'Rename thread' })
    const input = within(dialog).getByLabelText('Thread name')
    await user.clear(input); await user.click(within(dialog).getByRole('button', { name: 'Save name' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a thread name.')
    await user.type(input, '  Budget  '); await user.click(within(dialog).getByRole('button', { name: 'Save name' }))
    await screen.findByRole('heading', { name: 'Budget' })
    expect(api.renameThread).toHaveBeenCalledWith(expect.any(String), 'Budget')
    await user.click(screen.getByRole('button', { name: 'Delete thread' }))
    expect(api.deleteThread).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep thread' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete thread' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete thread' }))
    await screen.findByRole('heading', { name: 'A fresh start for your numbers' })
    expect(api.deleteThread).toHaveBeenCalledTimes(1)
  })

  it('switches between independent drafts and remembers the selected thread', async () => {
    const first = threadFixture('first', 'Budget'), second = threadFixture('second', 'Measurements')
    mockApi([first, second]); const user = userEvent.setup(); renderWorkspace()
    await screen.findByRole('heading', { name: 'Budget' })
    await user.click(screen.getByRole('button', { name: '1' })); await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Measurements' }))
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0')
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'Budget' }))
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('12')
    expect(localStorage.getItem('calculator-workspace:selected-thread')).toBe('first')
  })

  it('submits the selected thread and presents only the returned server result', async () => {
    const { calculate } = mockApi([threadFixture('first', 'Budget')]); const user = userEvent.setup(); renderWorkspace()
    await screen.findByRole('heading', { name: 'Budget' })
    for (const name of ['2', '5', 'Add', '1', '5', 'Calculate']) await user.click(screen.getByRole('button', { name }))
    await waitFor(() => expect(screen.getByLabelText('Calculator display')).toHaveTextContent('40'))
    expect(calculate).toHaveBeenCalledWith('first', { operation: 'add', operands: ['25', '15'] })
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled()
  })
})
