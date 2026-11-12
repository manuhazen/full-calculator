import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, ApiError, type Calculation } from './lib/api';
import { mockApi, threadFixture } from './test/mock-api';

export function renderWorkspace() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('thread workspace', () => {
  it('sends power, square root and percentage through the same backend client', async () => {
    const { calculate, histories } = mockApi([threadFixture('first', 'Budget')]);
    const answers = {
      power: ['400', '20 ^ 2'],
      sqrt: ['20', 'sqrt(400)'],
      percent: ['0.2', '20 / 100'],
    };
    calculate.mockImplementation(async (threadId, input) => {
      const [result, expression] = answers[input.operation as keyof typeof answers];
      const item: Calculation = {
        ...input,
        id: input.operation,
        threadId,
        result,
        expression,
        createdAt: '2026-11-12T12:00:00Z',
      };
      histories[threadId] = [...(histories[threadId] ?? []), item];
      return item;
    });
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('20^2{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('400'),
    );
    await user.click(screen.getByRole('button', { name: 'Square root' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('20'),
    );
    await user.click(screen.getByRole('button', { name: 'Percentage' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0.2'),
    );
    expect(calculate).toHaveBeenNthCalledWith(1, 'first', {
      operation: 'power',
      operands: ['20', '2'],
    });
    expect(calculate).toHaveBeenNthCalledWith(2, 'first', { operation: 'sqrt', operands: ['400'] });
    expect(calculate).toHaveBeenNthCalledWith(3, 'first', {
      operation: 'percent',
      operands: ['20'],
    });
  });

  it('chains left to right using each completed server result', async () => {
    const { calculate, histories } = mockApi([threadFixture('first', 'Budget')]);
    const replies = [
      { result: '5', expression: '2 + 3' },
      { result: '20', expression: '5 * 4' },
    ];
    calculate.mockImplementation(async (threadId, input) => {
      const reply = replies.shift();
      if (!reply) throw new Error('Unexpected calculation');
      const item: Calculation = {
        ...input,
        ...reply,
        id: input.operation,
        threadId,
        createdAt: '2026-11-12T12:00:00Z',
      };
      histories[threadId] = [...(histories[threadId] ?? []), item];
      return item;
    });
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('2+3*');
    await screen.findByText('5 ×');
    await user.keyboard('4{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('20'),
    );
    expect(calculate).toHaveBeenNthCalledWith(1, 'first', {
      operation: 'add',
      operands: ['2', '3'],
    });
    expect(calculate).toHaveBeenNthCalledWith(2, 'first', {
      operation: 'multiply',
      operands: ['5', '4'],
    });
  });

  it('counts Unicode codepoints when validating thread names', async () => {
    mockApi([threadFixture('first', 'Budget')]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.click(screen.getByRole('button', { name: 'Rename thread' }));
    const input = screen.getByLabelText('Thread name');
    await user.clear(input);
    await user.paste('🧮'.repeat(81));
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use at most 80 characters.');
    await user.clear(input);
    await user.paste('🧮'.repeat(80));
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByRole('heading', { name: '🧮'.repeat(80) });
    expect(api.renameThread).toHaveBeenCalledWith('first', '🧮'.repeat(80));
  });

  it('supports keyboard backspace and clear while leaving browser modifier shortcuts alone', async () => {
    mockApi([threadFixture('first', 'Budget')]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('123{Backspace}');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('12');
    await user.keyboard('{Control>}7{/Control}');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('12');
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
  });
  it('changes a returned result sign before chaining another server calculation', async () => {
    const { calculate, histories } = mockApi([threadFixture('first', 'Budget')]);
    calculate.mockImplementationOnce(async (threadId, input) => {
      const item: Calculation = {
        ...input,
        id: 'sum-ten',
        threadId,
        result: '10',
        expression: '5 + 5',
        createdAt: '2026-11-12T12:00:00Z',
      };
      histories[threadId] = [item];
      return item;
    });
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('5+5{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('10'),
    );
    await user.click(screen.getByRole('button', { name: 'Change sign' }));
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('-10');
    await user.click(screen.getByRole('button', { name: 'Multiply' }));
    await user.keyboard('2{Enter}');
    await waitFor(() =>
      expect(calculate).toHaveBeenLastCalledWith('first', {
        operation: 'multiply',
        operands: ['-10', '2'],
      }),
    );
  });
  it('shows initial loading and a recoverable query failure', async () => {
    const thread = threadFixture('first', 'Budget');
    mockApi([thread]);
    const pending = deferred<(typeof thread)[]>();
    vi.mocked(api.threads).mockImplementationOnce(() => pending.promise);
    renderWorkspace();
    expect(screen.getByText('Opening your workspace…')).toBeInTheDocument();
    await act(async () => {
      pending.resolve([thread]);
    });
    await screen.findByRole('heading', { name: 'Budget' });
  });

  it('offers retry when the server cannot load threads', async () => {
    mockApi([threadFixture('first', 'Budget')]);
    vi.mocked(api.threads).mockRejectedValueOnce(
      new ApiError('NETWORK_ERROR', 'Cannot reach the server.'),
    );
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Couldn’t load your threads' });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: 'Budget' });
  });

  it('preserves operands on a domain error and allows a corrected retry', async () => {
    const { calculate, histories } = mockApi([threadFixture('first', 'Budget')]);
    calculate.mockRejectedValueOnce(new ApiError('DIVISION_BY_ZERO', 'Cannot divide by zero.'));
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('1/0{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.');
    expect(screen.getByText('1 ÷')).toBeInTheDocument();
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    calculate.mockImplementationOnce(async (threadId, input) => {
      const item: Calculation = {
        ...input,
        id: 'corrected',
        threadId,
        expression: '1 / 2',
        result: '0.5',
        createdAt: '2026-11-12T12:00:00Z',
      };
      histories[threadId] = [item];
      return item;
    });
    await user.keyboard('2{Enter}');
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0.5'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calculate).toHaveBeenLastCalledWith('first', {
      operation: 'divide',
      operands: ['1', '2'],
    });
  });

  it('guards same-tick duplicate Enter and applies late results only to their originating thread', async () => {
    const { calculate, histories } = mockApi([
      threadFixture('first', 'Budget'),
      threadFixture('second', 'Measurements'),
    ]);
    const pending = deferred<Calculation>();
    calculate.mockImplementationOnce(() => pending.promise);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('25+15');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await waitFor(() => expect(calculate).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete thread' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Measurements' }));
    expect(screen.getByText('Finishing another calculation…')).toBeInTheDocument();
    const result: Calculation = {
      id: 'late',
      threadId: 'first',
      operation: 'add',
      operands: ['25', '15'],
      expression: '25 + 15',
      result: '40',
      createdAt: '2026-11-12T12:00:00Z',
    };
    histories.first = [result];
    await act(async () => {
      pending.resolve(result);
    });
    expect(screen.getByRole('heading', { name: 'Measurements' })).toBeInTheDocument();
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('40');
    expect(await screen.findByRole('button', { name: 'Reuse result 40' })).toBeInTheDocument();
  });

  it('keeps a failed deletion open without removing the thread', async () => {
    mockApi([threadFixture('first', 'Budget')]);
    vi.mocked(api.deleteThread).mockRejectedValueOnce(
      new ApiError('NETWORK_ERROR', 'Could not reach the server.'),
    );
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.click(screen.getByRole('button', { name: 'Delete thread' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete thread' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not reach the server.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Keep thread' }));
    expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument();
  });
  it('preserves native Enter activation on controls outside the keypad', async () => {
    const { calculate } = mockApi([threadFixture('first', 'Budget')]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    screen.getByRole('button', { name: 'New thread' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Untitled Thread' });
    expect(api.createThread).toHaveBeenCalledTimes(1);
    expect(calculate).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Rename thread' }).focus();
    await user.keyboard('7');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Rename thread' })).toBeInTheDocument();
  });
  it('supports keyboard calculation, result reuse and normal typing inside rename dialogs', async () => {
    const { calculate } = mockApi([threadFixture('first', 'Budget')]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.keyboard('25+15{Enter}');
    expect(await screen.findByRole('button', { name: 'Reuse result 40' })).toBeInTheDocument();
    expect(calculate).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'Reuse result 40' }));
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('40');
    expect(calculate).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Rename thread' }));
    const input = screen.getByLabelText('Thread name');
    await user.clear(input);
    await user.type(input, '12+34');
    expect(input).toHaveValue('12+34');
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('40');
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: '12+34' });
    expect(calculate).toHaveBeenCalledTimes(1);
  });
  it('renders chronological history for only the selected thread', async () => {
    const first = threadFixture('first', 'Budget'),
      second = threadFixture('second', 'Measurements');
    const { histories } = mockApi([first, second]);
    histories.first = [
      {
        id: 'calc-a',
        threadId: 'first',
        operation: 'add',
        operands: ['12.50', '7.25'],
        expression: '12.50 + 7.25',
        result: '19.75',
        createdAt: '2026-11-12T12:00:00Z',
      },
      {
        id: 'calc-b',
        threadId: 'first',
        operation: 'divide',
        operands: ['19.75', '5'],
        expression: '19.75 / 5',
        result: '3.95',
        createdAt: '2026-11-12T12:01:00Z',
      },
    ];
    const user = userEvent.setup();
    renderWorkspace();
    const list = await screen.findByRole('list', { name: 'Calculation history' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('12.50 + 7.25');
    expect(rows[1]).toHaveTextContent('19.75 / 5');
    await user.click(screen.getByRole('button', { name: 'Measurements' }));
    expect(await screen.findByRole('heading', { name: 'No calculations yet' })).toBeInTheDocument();
    expect(screen.queryByText('12.50 + 7.25')).not.toBeInTheDocument();
  });
  it('creates, validates renaming and confirms deletion of a thread', async () => {
    mockApi();
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'A fresh start for your numbers' });
    await user.click(screen.getByRole('button', { name: 'Create a thread' }));
    await screen.findByRole('heading', { name: 'Untitled Thread' });
    await user.click(screen.getByRole('button', { name: 'Rename thread' }));
    const dialog = screen.getByRole('dialog', { name: 'Rename thread' });
    const input = within(dialog).getByLabelText('Thread name');
    await user.clear(input);
    await user.click(within(dialog).getByRole('button', { name: 'Save name' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a thread name.');
    await user.type(input, '  Budget  ');
    await user.click(within(dialog).getByRole('button', { name: 'Save name' }));
    await screen.findByRole('heading', { name: 'Budget' });
    expect(api.renameThread).toHaveBeenCalledWith(expect.any(String), 'Budget');
    await user.click(screen.getByRole('button', { name: 'Delete thread' }));
    expect(api.deleteThread).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Keep thread' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete thread' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete thread' }),
    );
    await screen.findByRole('heading', { name: 'A fresh start for your numbers' });
    expect(api.deleteThread).toHaveBeenCalledTimes(1);
  });

  it('switches between independent drafts and remembers the selected thread', async () => {
    const first = threadFixture('first', 'Budget'),
      second = threadFixture('second', 'Measurements');
    mockApi([first, second]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Measurements' }));
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect(screen.getByLabelText('Calculator display')).toHaveTextContent('12');
    expect(localStorage.getItem('calculator-workspace:selected-thread')).toBe('first');
  });

  it('submits the selected thread and presents only the returned server result', async () => {
    const { calculate } = mockApi([threadFixture('first', 'Budget')]);
    const user = userEvent.setup();
    renderWorkspace();
    await screen.findByRole('heading', { name: 'Budget' });
    for (const name of ['2', '5', 'Add', '1', '5', 'Calculate'])
      await user.click(screen.getByRole('button', { name }));
    await waitFor(() =>
      expect(screen.getByLabelText('Calculator display')).toHaveTextContent('40'),
    );
    expect(calculate).toHaveBeenCalledWith('first', { operation: 'add', operands: ['25', '15'] });
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled();
  });
});
