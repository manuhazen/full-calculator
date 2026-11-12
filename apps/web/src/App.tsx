import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Calculator as CalculatorIcon, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { WorkspaceLayout } from './components/workspace-layout'
import { ThreadNavigation } from './components/thread-navigation'
import { DeleteThreadDialog, RenameThreadDialog } from './components/thread-dialogs'
import { Calculator } from './components/calculator'
import { CalculationHistory } from './components/calculation-history'
import { KeyboardHelp } from './components/keyboard-help'
import { useCalculatorKeyboard } from './hooks/use-calculator-keyboard'
import { Button } from './components/ui/button'
import { api, type Calculation, type Thread } from './lib/api'
import { historyOptions, keys, threadOptions } from './lib/queries'
import { draftReducer, emptyDraft, operand, submission, type BinaryOperation, type CalculationInput, type Draft, type DraftAction } from './lib/calculator-state'

const selectionKey = 'calculator-workspace:selected-thread'
function rememberedThread() { try { return localStorage.getItem(selectionKey) } catch { return null } }
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export default function App() {
  const client = useQueryClient()
  const threads = useQuery(threadOptions())
  const [preferredId, setPreferredId] = useState<string | null>(rememberedThread)
  const selected = threads.data?.find(thread => thread.id === preferredId) ?? threads.data?.[0] ?? null
  const history = useQuery(historyOptions(selected?.id ?? ''))
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const draft = selected ? drafts[selected.id] ?? emptyDraft() : emptyDraft()
  const [renameTarget, setRenameTarget] = useState<Thread | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Thread | null>(null)
  const [threadError, setThreadError] = useState('')
  const calculating = useRef(false)
  const focusOnSelection = useRef(false)
  const creating = useRef(false)
  const create = useMutation({ mutationFn: api.createThread })
  const rename = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => api.renameThread(id, name) })
  const remove = useMutation({ mutationFn: api.deleteThread })
  const calculate = useMutation({ mutationFn: ({ id, input }: { id: string; input: CalculationInput }) => api.calculate(id, input) })
  const pendingThread = calculate.isPending ? calculate.variables?.id ?? null : null

  useEffect(() => {
    try { if (selected) localStorage.setItem(selectionKey, selected.id); else if (!threads.isPending) localStorage.removeItem(selectionKey) } catch { /* Selection remains usable without local storage. */ }
  }, [selected, threads.isPending])
  useEffect(() => { if (selected && focusOnSelection.current) { document.getElementById('calculator-display')?.focus(); focusOnSelection.current = false } }, [selected])

  const updateDraft = useCallback((id: string, action: DraftAction) => {
    setDrafts(current => ({ ...current, [id]: draftReducer(current[id] ?? emptyDraft(), action) }))
  }, [])

  async function newThread() {
    if (creating.current) return
    creating.current = true; setThreadError('')
    try {
      const item = await create.mutateAsync()
      await client.cancelQueries({ queryKey: keys.threads })
      client.setQueryData<Thread[]>(keys.threads, current => [item, ...(current ?? [])])
      focusOnSelection.current = true; setPreferredId(item.id)
      void client.invalidateQueries({ queryKey: keys.threads })
    } catch (error) { setThreadError(message(error)) } finally { creating.current = false }
  }

  async function renameThread(name: string) {
    if (!renameTarget) return
    const item = await rename.mutateAsync({ id: renameTarget.id, name })
    client.setQueryData<Thread[]>(keys.threads, current => (current ?? []).map(thread => thread.id === item.id ? item : thread))
    setRenameTarget(null)
    void client.invalidateQueries({ queryKey: keys.threads })
  }

  async function deleteThread() {
    if (!deleteTarget || pendingThread === deleteTarget.id) return
    const id = deleteTarget.id
    await remove.mutateAsync(id)
    const remaining = (client.getQueryData<Thread[]>(keys.threads) ?? []).filter(thread => thread.id !== id)
    client.setQueryData(keys.threads, remaining)
    client.removeQueries({ queryKey: keys.history(id) })
    setDrafts(current => { const next = { ...current }; delete next[id]; return next })
    if (selected?.id === id) setPreferredId(remaining[0]?.id ?? null)
    setDeleteTarget(null)
    void client.invalidateQueries({ queryKey: keys.threads })
  }

  async function runCalculation(input: CalculationInput, nextOperation?: BinaryOperation) {
    if (!selected || calculating.current) return
    const id = selected.id
    calculating.current = true
    try {
      const item = await calculate.mutateAsync({ id, input })
      updateDraft(id, { type: 'success', value: item.result, expression: item.expression, nextOperation })
      client.setQueryData<Calculation[]>(keys.history(id), current => [...(current ?? []), item])
      void client.invalidateQueries({ queryKey: keys.history(id) })
      void client.invalidateQueries({ queryKey: keys.threads })
    } catch (error) { updateDraft(id, { type: 'error', message: message(error) }) } finally { calculating.current = false }
  }

  function edit(action: DraftAction) { if (selected && !calculating.current) updateDraft(selected.id, action) }
  function chooseOperation(operation: BinaryOperation) {
    if (!selected || calculating.current) return
    const input = submission(draft)
    if (input) void runCalculation(input, operation)
    else updateDraft(selected.id, { type: 'operator', operation })
  }
  function equals() { const input = submission(draft); if (input) void runCalculation(input) }
  function unary(operation: 'sqrt' | 'percent') { if (!draft.operation) void runCalculation({ operation, operands: [operand(draft.entry)] }) }
  function reuse(value: string) { edit({ type: 'load', value }); document.getElementById('calculator-display')?.focus() }
  useCalculatorKeyboard({ enabled: Boolean(selected) && !calculate.isPending, onEdit: edit, onOperation: chooseOperation, onCalculate: equals, onUnary: unary })

  return <WorkspaceLayout navigation={close => <ThreadNavigation threads={threads.data ?? []} selectedId={selected?.id ?? null} creating={create.isPending} loading={threads.isPending} pendingThread={pendingThread} onCreate={() => { void newThread(); close() }} onSelect={id => { focusOnSelection.current = true; setPreferredId(id); setThreadError(''); close(); if (selected?.id === id) document.getElementById('calculator-display')?.focus() }} onRename={setRenameTarget} onDelete={setDeleteTarget} />}>
    <main id="workspace" className="workspace-body">
      {threadError && <div className="error-banner" role="alert"><AlertCircle size={18} /><span>{threadError}</span></div>}
      {threads.isPending ? <div className="workspace-empty" role="status"><LoaderCircle className="animate-spin" /><p>Opening your workspace…</p></div> : threads.isError ? <div className="workspace-empty"><AlertCircle size={30} /><h1>Couldn’t load your threads</h1><p>{message(threads.error)}</p><Button onClick={() => void threads.refetch()}>Try again</Button></div> : !selected ? <div className="workspace-empty"><CalculatorIcon size={34} strokeWidth={1.4} /><h1>A fresh start for your numbers</h1><p>Create a thread to collect related calculations. Pick it up again whenever you need.</p><Button onClick={() => void newThread()} disabled={create.isPending}>{create.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}Create a thread</Button></div> : <>
        <header className="workspace-heading"><div><h1>{selected.name}</h1><p>A little space to work things out.</p></div><div className="workspace-actions"><Button variant="ghost" size="icon" aria-label="Rename thread" title="Rename thread" onClick={() => setRenameTarget(selected)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Delete thread" title="Delete thread" disabled={pendingThread === selected.id} onClick={() => setDeleteTarget(selected)}><Trash2 /></Button></div></header>
        <div className="workspace-grid"><div className="calculator-column"><Calculator draft={draft} busy={calculate.isPending} onEdit={edit} onOperation={chooseOperation} onCalculate={equals} onUnary={unary} />{draft.error && <div className="error-banner calculation-error" role="alert"><AlertCircle size={18} /><span>{draft.error}</span></div>}<KeyboardHelp /></div><CalculationHistory key={selected.id} items={history.data ?? []} loading={history.isPending} error={history.isError ? message(history.error) : null} onRetry={() => void history.refetch()} onReuse={reuse} busy={calculate.isPending} /></div>
      </>}
    </main>
    {renameTarget && <RenameThreadDialog key={renameTarget.id} thread={renameTarget} busy={rename.isPending} onClose={() => setRenameTarget(null)} onSave={renameThread} />}
    {deleteTarget && <DeleteThreadDialog key={deleteTarget.id} thread={deleteTarget} busy={remove.isPending} onClose={() => setDeleteTarget(null)} onDelete={deleteThread} />}
  </WorkspaceLayout>
}
