import { router, useLocalSearchParams } from 'expo-router';
import { checklistFor, currentOccurrence, getObligation, updateTask } from '@/db/obligations';
import { TaskForm } from '@/features/forms/TaskForm';
import { useData } from '@/lib/useData';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { ErrorState, LoadingList } from '@/ui/states';

export default function EditTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useData(['task-edit', id], async () => {
    const ob = await getObligation(id);
    if (!ob) return null;
    const occ = await currentOccurrence(id);
    return { ob, occ, checklist: await checklistFor(id) };
  });
  if (isLoading) return <Screen title="Edit task"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Edit task"><ErrorState title="This task no longer exists" body="It may have been deleted on another device." onRetry={() => router.replace('/tasks')} /></Screen>;
  const { ob, occ } = data;
  return (
    <Screen title="Edit task">
      <TaskForm
        initial={{
          title: ob.title, description: ob.description, category: ob.category, priority: ob.priority, dueDate: occ?.dueDate ?? new Date().toISOString().slice(0, 10),
          dueTime: ob.dueTime, recurrence: ob.recurrence, reminderOffsets: ob.reminderOffsets, tags: ob.tags, notes: ob.notes,
          checklist: [], // checklist items are edited on the detail screen
        }}
        draftKey={`draft:task:${id}`}
        submitLabel="Save changes"
        showChecklist={false}
        onSubmit={async (v) => {
          await updateTask(id, v);
          toast('Changes saved.', 'success');
          router.back();
        }}
      />
    </Screen>
  );
}
