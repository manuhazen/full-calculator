import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const variants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-teal-800 text-white hover:bg-teal-900',
        secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200',
        outline: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
        ghost: 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-950',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: { default: 'min-h-11 px-4 py-2', sm: 'min-h-9 px-3 py-1.5', icon: 'size-11 p-0' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(variants({ variant, size }), className)}
      {...props}
    />
  );
}
