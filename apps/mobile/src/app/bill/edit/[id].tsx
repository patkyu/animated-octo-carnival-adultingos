import { router, useLocalSearchParams } from 'expo-router';
import { getBillByObligation, updateBill } from '@/db/finance';
import { BillForm } from '@/features/forms/BillForm';
import { useData } from '@/lib/useData';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { EmptyState, LoadingList } from '@/ui/states';

export default function EditBill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useData(['bill', id], () => getBillByObligation(id));
  if (isLoading) return <Screen title="Edit bill"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Edit bill"><EmptyState mascot="piso" title="Bill not found" body="It may have been deleted." /></Screen>;
  return (
    <Screen title="Edit bill">
      <BillForm
        initial={{
          name: data.obligation.title, provider: data.provider, category: data.category, amountMinor: data.amountMinor, variableAmount: data.variableAmount,
          currency: data.currency, dueDate: data.current?.dueDate ?? new Date().toISOString().slice(0, 10), recurrence: data.obligation.recurrence,
          reminderOffsets: data.obligation.reminderOffsets, notes: data.obligation.notes,
        }}
        submitLabel="Save changes"
        onSubmit={async (v) => {
          await updateBill(id, v);
          toast('Changes saved.', 'success');
          router.back();
        }}
      />
    </Screen>
  );
}
