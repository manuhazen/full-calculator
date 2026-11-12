import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LoaderCircle } from 'lucide-react'
import type { Thread } from '../lib/api'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog'

const nameSchema = z.object({ name: z.string().trim().min(1, 'Enter a thread name.').refine(value => Array.from(value).length <= 80, 'Use at most 80 characters.') })

export function RenameThreadDialog({ thread, busy, onClose, onSave }: { thread: Thread; busy: boolean; onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ name: string }>({ resolver: zodResolver(nameSchema), defaultValues: { name: thread.name } })
  const submit = handleSubmit(async values => { setError(''); try { await onSave(values.name) } catch (error) { setError(error instanceof Error ? error.message : 'Could not rename the thread. Try again.') } })
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent closeDisabled={busy}><DialogTitle>Rename thread</DialogTitle><DialogDescription>Give these calculations a name that makes sense to you.</DialogDescription><form onSubmit={submit}>
    <label className="field-label" htmlFor="thread-name">Thread name</label><input autoComplete="off" className="text-field" id="thread-name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} {...register('name')} />
    {errors.name && <p id="name-error" className="field-error" role="alert">{errors.name.message}</p>}{error && <p className="field-error" role="alert">{error}</p>}
    <div className="dialog-actions"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || isSubmitting}>{busy && <LoaderCircle className="animate-spin" />}Save name</Button></div>
  </form></DialogContent></Dialog>
}

export function DeleteThreadDialog({ thread, busy, onClose, onDelete }: { thread: Thread; busy: boolean; onClose: () => void; onDelete: () => Promise<void> }) {
  const [error, setError] = useState('')
  return <AlertDialog open onOpenChange={open => { if (!open && !busy) onClose() }}><AlertDialogContent><AlertDialogTitle>Delete this thread?</AlertDialogTitle><AlertDialogDescription>“{thread.name}” and all of its calculations will be permanently deleted.</AlertDialogDescription>{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions">
    <AlertDialogCancel asChild><Button variant="outline" disabled={busy}>Keep thread</Button></AlertDialogCancel><AlertDialogAction asChild><Button variant="destructive" disabled={busy} onClick={event => { event.preventDefault(); setError(''); void onDelete().catch(error => setError(error instanceof Error ? error.message : 'Could not delete the thread. Try again.')) }}>{busy && <LoaderCircle className="animate-spin" />}Delete thread</Button></AlertDialogAction>
  </div></AlertDialogContent></AlertDialog>
}
