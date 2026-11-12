import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  const [health, setHealth] = useState('Connecting to API…')
  useEffect(() => {
    fetch('/api/v1/health').then(response => {
      if (!response.ok) throw new Error('API health check failed')
      return response.json() as Promise<{ message: string }>
    }).then(data => setHealth(data.message)).catch(() => setHealth('API is unavailable'))
  }, [])
  return <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '10vh auto', padding: 24 }}><h1>Calculator Workspace</h1><p>Docker development environment</p><p role="status">{health}</p></main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
