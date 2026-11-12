import { Calculator } from 'lucide-react'
import { WorkspaceLayout } from './components/workspace-layout'

export default function App() {
  return <WorkspaceLayout navigation={() => <nav aria-label="Calculation threads" className="thread-navigation"><p className="nav-heading">Your threads</p><p className="sidebar-empty">Your calculation threads will appear here.</p></nav>}>
    <main id="workspace" className="workspace-body"><div className="workspace-empty"><Calculator size={32} strokeWidth={1.4} /><h1>Your calculation workspace</h1><p>Keep related calculations together in their own thread.</p></div></main>
  </WorkspaceLayout>
}
