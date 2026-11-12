import { useState, type ReactNode } from 'react';
import { Calculator, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Calculator size={21} strokeWidth={1.7} />
      </span>
      <span>
        Calculator<span className="brand-subtitle">Workspace</span>
      </span>
    </div>
  );
}

export function WorkspaceLayout({
  navigation,
  children,
}: {
  navigation: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Brand />
        {navigation(() => {})}
        <p className="sidebar-footer">A place to keep your numbers together.</p>
      </aside>
      <div className="main-column">
        <div className="mobile-bar">
          <Brand />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open threads">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent drawer>
              <DialogTitle className="sr-only">Calculation threads</DialogTitle>
              <DialogDescription className="sr-only">
                Create or switch between your calculation threads.
              </DialogDescription>
              <Brand />
              {navigation(() => setOpen(false))}
            </DialogContent>
          </Dialog>
        </div>
        {children}
      </div>
    </div>
  );
}
