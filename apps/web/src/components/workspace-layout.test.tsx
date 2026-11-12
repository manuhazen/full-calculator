import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WorkspaceLayout } from './workspace-layout'

describe('workspace navigation', () => {
  it('opens an accessible mobile drawer and restores focus when dismissed', async () => {
    const user = userEvent.setup()
    render(<WorkspaceLayout navigation={() => <nav aria-label="Threads">No threads</nav>}><main><h1>Workspace</h1></main></WorkspaceLayout>)
    const trigger = screen.getByRole('button', { name: 'Open threads' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Calculation threads' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
