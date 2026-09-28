import { DataGrid } from '@cognite/aura/data-grid';
import type { ColumnDef, Row } from '@tanstack/react-table';

export function InvestigationGrid<T>({
  label,
  data,
  columns,
  getRowId,
  onRowClick,
  rowHeight = 64,
}: {
  label: string;
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  onRowClick: (row: T) => void;
  rowHeight?: number;
}) {
  return (
    <div className="h-96 w-full min-w-0">
      <DataGrid
        aria-label={label}
        className="h-full border border-border"
        data={data}
        columns={columns}
        getRowId={(row: T) => getRowId(row)}
        onRowClick={(row: Row<T>) => onRowClick(row.original)}
        rowHeight={rowHeight}
      />
    </div>
  );
}
