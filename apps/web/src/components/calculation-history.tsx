import { useEffect, useRef } from 'react'
import { ArrowDown, History } from 'lucide-react'
import type { Calculation } from '../lib/api'
import { Button } from './ui/button'

const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
type Props = { items: Calculation[]; loading: boolean; error: string | null; onRetry: () => void }

export function CalculationHistory({ items, loading, error, onRetry }: Props) {
  const list = useRef<HTMLOListElement>(null)
  const stickToLatest = useRef(true)
  useEffect(() => { if (list.current && stickToLatest.current) list.current.scrollTop = list.current.scrollHeight }, [items.length])
  const latest = () => { if (list.current) { list.current.scrollTop = list.current.scrollHeight; stickToLatest.current = true } }
  return <section className="history-pane" aria-labelledby="history-title"><header className="history-heading"><div><History size={16} /><h2 id="history-title">History</h2><span className="history-count">{items.length || ''}</span></div>{items.length > 0 && <Button variant="ghost" size="sm" onClick={latest}><ArrowDown />Latest</Button>}</header>
    {error ? <div className="history-feedback" role="alert"><p>{error}</p><Button variant="outline" size="sm" onClick={onRetry}>Retry history</Button></div> : loading ? <p className="history-feedback" role="status">Loading calculations…</p> : items.length === 0 ? <div className="history-empty"><History size={27} strokeWidth={1.3} /><h3>No calculations yet</h3><p>Your results will appear here as you work.</p></div> : <ol aria-label="Calculation history" className="history-list" ref={list} onScroll={event => { const node = event.currentTarget; stickToLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80 }}>{items.map(item => <li key={item.id} className="history-entry" data-calculation-id={item.id}><p className="history-expression">{item.expression}</p><div className="history-result-row"><span className="history-result">= {item.result}</span><time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{time.format(new Date(item.createdAt))}</time></div></li>)}</ol>}
  </section>
}
