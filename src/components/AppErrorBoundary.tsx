import { Button } from '@cognite/aura/components/button';
import { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type BoundaryState = { failed: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-muted p-8 text-foreground">
        <EmptyState variant="full" type="error-generic">
          <EmptyStateTitle>The workspace hit an unexpected error</EmptyStateTitle>
          <EmptyStateDescription>Reload the page to continue the investigation.</EmptyStateDescription>
          <EmptyStateActions>
            <Button type="button" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </EmptyStateActions>
        </EmptyState>
      </main>
    );
  }
}
