import { vi } from 'vitest';
import { api, type Calculation, type Thread } from '../lib/api';

const timestamp = '2026-11-12T12:00:00Z';
export const threadFixture = (id: string, name: string): Thread => ({
  id,
  name,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export function mockApi(initial: Thread[] = []) {
  let threads = [...initial];
  let count = initial.length;
  const histories: Record<string, Calculation[]> = {};
  vi.spyOn(api, 'threads').mockImplementation(async () => [...threads]);
  vi.spyOn(api, 'createThread').mockImplementation(async () => {
    const item = threadFixture(
      `00000000-0000-4000-8000-${String(++count).padStart(12, '0')}`,
      'Untitled Thread',
    );
    threads = [item, ...threads];
    return item;
  });
  vi.spyOn(api, 'renameThread').mockImplementation(async (id, name) => {
    const existing = threads.find((thread) => thread.id === id);
    if (!existing) throw new Error('Thread not found.');
    const item = { ...existing, name };
    threads = threads.map((thread) => (thread.id === id ? item : thread));
    return item;
  });
  vi.spyOn(api, 'deleteThread').mockImplementation(async (id) => {
    threads = threads.filter((thread) => thread.id !== id);
    delete histories[id];
  });
  vi.spyOn(api, 'history').mockImplementation(async (id) => [...(histories[id] ?? [])]);
  const calculate = vi.spyOn(api, 'calculate').mockImplementation(async (threadId, input) => {
    const item: Calculation = {
      ...input,
      id: `calculation-${++count}`,
      threadId,
      result: '40',
      expression: input.operands.join(' + '),
      createdAt: timestamp,
    };
    histories[threadId] = [...(histories[threadId] ?? []), item];
    return item;
  });
  return { calculate, histories };
}
