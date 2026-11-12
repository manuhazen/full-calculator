import type { ComponentProps } from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogClose = Primitive.Close
export const DialogTitle = Primitive.Title
export const DialogDescription = Primitive.Description

export function DialogContent({ className, children, drawer = false, closeDisabled = false, ...props }: ComponentProps<typeof Primitive.Content> & { drawer?: boolean; closeDisabled?: boolean }) {
  return <Primitive.Portal><Primitive.Overlay className="dialog-overlay" /><Primitive.Content data-drawer={drawer || undefined} className={cn('dialog-content', className)} {...props}>
    {children}<Primitive.Close className="dialog-close" aria-label="Close dialog" disabled={closeDisabled}><X size={18} /></Primitive.Close>
  </Primitive.Content></Primitive.Portal>
}
