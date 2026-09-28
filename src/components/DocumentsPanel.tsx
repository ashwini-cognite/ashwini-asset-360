import { Button } from '@cognite/aura/components/button';
import { Loader } from '@cognite/aura/components/loader';
import type { ColumnDef } from '@tanstack/react-table';

import type { DocumentSummary } from '../domain/models';
import { formatDate, instanceKey } from '../domain/values';
import type { useAsset360ViewModel } from '../viewModels/useAsset360ViewModel';

import { InvestigationGrid } from './InvestigationGrid';
import { PanelBody } from './PanelBody';
import { SectionPanel } from './SectionPanel';
import { TruncationNote } from './TruncationNote';

type AssetModel = ReturnType<typeof useAsset360ViewModel>;

type DocumentRow = {
  id: string;
  document: DocumentSummary;
  selected: boolean;
};

export function DocumentsPanel({ model }: { model: AssetModel }) {
  const selected = model.selectedDocument;
  const selectedKey = selected ? instanceKey(selected.ref) : undefined;
  const rows = model.documents.map((document) => ({
    id: instanceKey(document.ref),
    document,
    selected: instanceKey(document.ref) === selectedKey,
  }));
  return (
    <SectionPanel
      title="Documents"
      description="PDFs and images open here. Other files open in a new tab."
      count={model.documentsStatus === 'ready' ? model.documents.length : undefined}
    >
      <PanelBody
        status={model.documentsStatus}
        empty={model.documents.length === 0}
        emptyTitle="No documents linked"
        emptyDescription="No files are linked to this asset."
        onRetry={model.retryDocuments}
      >
        <InvestigationGrid
          label="Documents"
          data={rows}
          columns={documentColumns}
          getRowId={(row) => row.id}
          onRowClick={(row) => model.openDocument(row.document)}
          rowHeight={48}
        />
      </PanelBody>
      <TruncationNote truncated={model.documentsTruncated} />
      {selected?.preview === 'external' ? <ExternalFile model={model} document={selected} /> : null}
      {selected && selected.preview !== 'external' ? <InlinePreview model={model} document={selected} /> : null}
    </SectionPanel>
  );
}

const documentColumns: ColumnDef<DocumentRow>[] = [
  {
    id: 'file',
    accessorFn: (row) => row.document.name,
    header: 'File',
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.document.name}
        {row.original.selected ? <span className="sr-only">Selected</span> : null}
      </div>
    ),
  },
  {
    id: 'type',
    accessorFn: (row) => row.document.mimeType || 'Unknown type',
    header: 'Type',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.document.mimeType || 'Unknown type'}</span>,
  },
  {
    id: 'modified',
    accessorFn: (row) => formatDate(row.document.modifiedMs),
    header: 'Modified',
    cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.document.modifiedMs)}</span>,
  },
];

function ExternalFile({ model, document }: { model: AssetModel; document: DocumentSummary }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" onClick={() => model.openDocument(document)}>
        Open {document.name}
      </Button>
      {model.externalOpenStatus === 'loading' ? (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
          <Loader size={16} />
          Opening file
        </div>
      ) : (
        <PanelBody
          status={model.externalOpenStatus}
          empty={false}
          emptyTitle=""
          emptyDescription=""
          onRetry={model.retryExternalOpen}
        >
          <p className="text-sm text-muted-foreground">This file type opens outside the workspace.</p>
        </PanelBody>
      )}
    </div>
  );
}

function InlinePreview({ model, document }: { model: AssetModel; document: DocumentSummary }) {
  if (!model.documentUrl) {
    return (
      <PanelBody status={model.documentUrlStatus} empty={false} emptyTitle="" emptyDescription="" onRetry={model.retryDocuments}>
        <span className="sr-only">Loading preview</span>
      </PanelBody>
    );
  }
  if (document.preview === 'image') {
    return <img alt={document.name} className="max-h-[32rem] w-full rounded-xl border border-border object-contain" src={model.documentUrl} />;
  }
  return <iframe title={document.name} className="h-[32rem] w-full rounded-xl border border-border" src={model.documentUrl} />;
}
