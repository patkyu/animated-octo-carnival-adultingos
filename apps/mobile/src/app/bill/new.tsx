import { router } from 'expo-router';
import { createBill } from '@/db/finance';
import { BillForm, emptyBill } from '@/features/forms/BillForm';
import { useAppStore } from '@/state/appStore';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

export default function NewBill() {
  const tz = useAppStore((s) => s.profile.timezone);
  return (
    <Screen title="Add a bill">
      <BillForm initial={emptyBill(tz)} submitLabel="Save bill" onSubmit={async (v) => {
        const id = await createBill(v);
        toast('Bill saved. Piso will remind you before it is due.', 'success', { mascot: 'piso' });
        router.replace(`/bill/${id}`);
      }} />
    </Screen>
  );
}
