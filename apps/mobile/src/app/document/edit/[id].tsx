import { router, useLocalSearchParams } from 'expo-router';
import { getDocument, updateDocument } from '@/db/documents';
import { DocumentForm } from '@/features/forms/DocumentForm';
import { useData } from '@/lib/useData';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { EmptyState, LoadingList } from '@/ui/states';

export default function EditDocument() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useData(['document', id], () => getDocument(id));
  if (isLoading) return <Screen title="Edit document"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Edit document"><EmptyState mascot="doki" title="Document not found" body="It may have been deleted." /></Screen>;
  return (
    <Screen title="Edit document">
      <DocumentForm
        lockTemplate
        initial={{
          templateKey: data.templateKey, name: data.name, issuer: data.issuer, stage: data.stage, issueDate: data.issueDate, expiryDate: data.expiryDate,
          referenceLast4: data.referenceLast4, officialUrl: data.officialUrl, reminderOffsets: data.reminderOffsets, notes: data.notes,
        }}
        submitLabel="Save changes"
        onSubmit={async (v) => {
          await updateDocument(id, v);
          toast('Changes saved.', 'success');
          router.back();
        }}
      />
    </Screen>
  );
}
