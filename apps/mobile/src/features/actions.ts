import { router } from 'expo-router';
import { completeOccurrence, reopenOccurrence, type Item } from '@/db/obligations';
import { toast } from '@/ui/overlays';

/**
 * One-tap toggle used by every list. Bills open the payment confirmation
 * (amount + date are recorded); tasks complete immediately with Undo.
 */
export async function toggleItem(item: Item): Promise<void> {
  try {
    if (item.status === 'done') {
      await reopenOccurrence(item.id);
      toast(`Reopened “${item.title}”`);
      return;
    }
    if (item.kind === 'bill') {
      router.push(`/bill/pay/${item.id}`);
      return;
    }
    const res = await completeOccurrence(item.id);
    toast(res.nextOccurrenceId ? `Done! The next one is scheduled.` : `Nice work — “${item.title}” is done.`, 'success', {
      mascot: 'adu',
      action: { label: 'Undo', onPress: () => void reopenOccurrence(item.id) },
    });
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Could not update this item.', 'error');
  }
}

/** Safe deep-link navigation: missing records fall back to Tasks with a message. */
export function openUrl(url: string | undefined | null) {
  if (!url) return;
  const path = url.replace(/^adultingos:\/\//, '/').replace(/^\/\//, '/');
  try {
    router.push(path as never);
  } catch {
    router.replace('/tasks');
  }
}
