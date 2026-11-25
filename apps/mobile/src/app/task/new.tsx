import { router, useLocalSearchParams } from 'expo-router';
import { createTask } from '@/db/obligations';
import { TaskForm, defaultTaskInput } from '@/features/forms/TaskForm';
import { useAppStore } from '@/state/appStore';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

export default function NewTask() {
  const tz = useAppStore((s) => s.profile.timezone);
  const { reminder, category } = useLocalSearchParams<{ reminder?: string; category?: string }>();
  const initial = { ...defaultTaskInput(tz), ...(category ? { category } : {}), ...(reminder ? { reminderOffsets: [0] } : {}) };
  return (
    <Screen title={reminder ? 'New reminder' : 'New task'}>
      <TaskForm
        initial={initial}
        draftKey="draft:task:new"
        submitLabel="Save"
        onSubmit={async (v) => {
          const { obligationId } = await createTask(v);
          toast('Saved. Tiki will remind you.', 'success');
          router.replace(`/task/${obligationId}`);
        }}
      />
    </Screen>
  );
}
