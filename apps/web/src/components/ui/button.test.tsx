import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('exposes a real accessible control and prevents disabled interactions', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Calculate
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Calculate' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
