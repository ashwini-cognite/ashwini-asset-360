import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('shows a reload action instead of a blank screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <ExplodingView />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByText('The workspace hit an unexpected error')).toBeInTheDocument();
  });
});

function ExplodingView(): never {
  throw new Error('render failed');
}
