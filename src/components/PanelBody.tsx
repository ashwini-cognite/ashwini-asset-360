import { Button } from '@cognite/aura/components/button';
import { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Skeleton } from '@cognite/aura/components/skeleton';
import type { ReactNode } from 'react';

import type { PanelStatus } from '../viewModels/useHomeViewModel';

export function PanelBody({
  status,
  empty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: {
  status: PanelStatus;
  empty?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }
  if (status === 'denied') {
    return (
      <div className="flex w-full justify-center py-6">
        <EmptyState variant="compact" type="no-access">
          <EmptyStateTitle>No access</EmptyStateTitle>
          <EmptyStateDescription>Your account cannot read this data.</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex w-full justify-center py-6">
        <EmptyState variant="compact" type="error-generic">
          <EmptyStateTitle>This panel could not load</EmptyStateTitle>
          <EmptyStateDescription>The rest of the page is still available.</EmptyStateDescription>
          <EmptyStateActions>
            <Button type="button" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </EmptyStateActions>
        </EmptyState>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex w-full justify-center py-6">
        <EmptyState variant="compact" type="no-results">
          <EmptyStateTitle>{emptyTitle}</EmptyStateTitle>
          <EmptyStateDescription>{emptyDescription}</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }
  return children;
}
