import { Keyboard } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog'

export function KeyboardHelp() {
  return <div className="keyboard-help"><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><Keyboard />Keyboard shortcuts</Button></DialogTrigger><DialogContent><DialogTitle>Keep your hands on the keys</DialogTitle><DialogDescription>Shortcuts work in the calculator and pause while you’re editing a thread.</DialogDescription><dl className="shortcut-list">
    <div><dt>Numbers and decimal</dt><dd><kbd>0–9</kbd> <kbd>.</kbd></dd></div><div><dt>Basic operations</dt><dd><kbd>+</kbd> <kbd>−</kbd> <kbd>*</kbd> <kbd>/</kbd></dd></div><div><dt>Power</dt><dd><kbd>^</kbd></dd></div><div><dt>Square root / percentage</dt><dd><kbd>R</kbd> <kbd>%</kbd></dd></div><div><dt>Calculate</dt><dd><kbd>Enter</kbd> <kbd>=</kbd></dd></div><div><dt>Remove digit / clear</dt><dd><kbd>Backspace</kbd> <kbd>Esc</kbd></dd></div>
  </dl></DialogContent></Dialog></div>
}
