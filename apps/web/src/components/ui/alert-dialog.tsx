import type { ComponentProps } from 'react';
import * as Primitive from '@radix-ui/react-alert-dialog';

export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export const AlertDialogAction = Primitive.Action;
export const AlertDialogCancel = Primitive.Cancel;

export function AlertDialogContent({
  children,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content className="dialog-content" {...props}>
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
