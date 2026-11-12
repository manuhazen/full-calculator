import { LoaderCircle, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Thread } from '../lib/api'
import { Button } from './ui/button'

type Props = { threads: Thread[]; selectedId: string | null; creating: boolean; loading: boolean; pendingThread: string | null; onCreate: () => void; onSelect: (id: string) => void; onRename: (thread: Thread) => void; onDelete: (thread: Thread) => void }

export function ThreadNavigation({ threads, selectedId, creating, loading, pendingThread, onCreate, onSelect, onRename, onDelete }: Props) {
  return <nav aria-label="Calculation threads" className="thread-navigation">
    <Button variant="outline" className="new-thread-button" onClick={onCreate} disabled={creating}>{creating ? <LoaderCircle className="animate-spin" /> : <Plus />}New thread</Button>
    <p className="nav-heading">Your threads <span>{threads.length || ''}</span></p>
    {loading ? <p className="sidebar-empty" role="status">Loading threads…</p> : threads.length === 0 ? <p className="sidebar-empty">Start a thread for a project, a plan, or a passing thought.</p> : <ul className="thread-list">{threads.map(thread => <li key={thread.id} className="thread-row" data-selected={thread.id === selectedId || undefined}>
      <button className="thread-select" aria-current={thread.id === selectedId ? 'page' : undefined} title={thread.name} onClick={() => onSelect(thread.id)}><MessageSquare size={15} strokeWidth={1.6} /><span>{thread.name}</span></button>
      <div className="thread-row-actions"><button aria-label={`Rename ${thread.name}`} title="Rename thread" onClick={() => onRename(thread)}><Pencil size={13} /></button><button aria-label={`Delete ${thread.name}`} title="Delete thread" disabled={pendingThread === thread.id} onClick={() => onDelete(thread)}><Trash2 size={13} /></button></div>
    </li>)}</ul>}
  </nav>
}
