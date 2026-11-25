import { router } from 'expo-router';
import { createDocument } from '@/db/documents';
import { DocumentForm, emptyDocument } from '@/features/forms/DocumentForm';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

export default function NewDocument() {
  return (
    <Screen title="Track a document">
      <DocumentForm
        initial={emptyDocument()}
        submitLabel="Save document"
        onSubmit={async (v) => {
          const id = await createDocument(v);
          toast(v.expiryDate ? 'Saved. Doki will remind you before it expires.' : 'Document saved.', 'success', { mascot: 'doki' });
          router.replace(`/document/${id}`);
        }}
      />
    </Screen>
  );
}
