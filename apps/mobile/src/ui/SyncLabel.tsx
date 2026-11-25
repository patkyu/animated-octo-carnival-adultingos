import { useAppStore } from '@/state/appStore';
import { BACKEND_CONFIGURED } from '@/config/env';
import { AppText, Icon, Row } from './primitives';

/** Honest save state: never claims "synced" before the server confirmed it. */
export function SyncLabel({ state }: { state: 'local' | 'pending' | 'synced' }) {
  const mode = useAppStore((s) => s.app.mode);
  if (mode !== 'account' || !BACKEND_CONFIGURED) {
    return (
      <Row gap={6}><Icon name="smartphone" size={14} color="textMuted" /><AppText variant="caption" color="textMuted">Saved on this device</AppText></Row>
    );
  }
  if (state === 'synced') return <Row gap={6}><Icon name="cloud" size={14} color="success" /><AppText variant="caption" color="textMuted">Backed up</AppText></Row>;
  return <Row gap={6}><Icon name="upload-cloud" size={14} color="warning" /><AppText variant="caption" color="textMuted">Saved on this device · waiting to sync</AppText></Row>;
}
