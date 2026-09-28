import { Alert, AlertDescription } from '@cognite/aura/components/alert';

import { RELATED_MAX_ITEMS } from '../domain/cdm';

export function TruncationNote({ truncated }: { truncated: boolean }) {
  if (!truncated) return null;
  return (
    <Alert>
      <AlertDescription>
        Showing the first {RELATED_MAX_ITEMS}. More records exist for this asset.
      </AlertDescription>
    </Alert>
  );
}
