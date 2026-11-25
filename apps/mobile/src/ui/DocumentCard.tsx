import { router } from 'expo-router';
import { DOCUMENT_STATUS_LABEL, expiryCountdown, type DocumentStatus } from '@adultingos/shared';
import type { DocumentRecord } from '@/db/documents';
import { AppText, Card, Icon, Row, Stack, StatusBadge, type StatusTone } from './primitives';

export const STATUS_TONE: Record<DocumentStatus, StatusTone> = {
  expired: 'danger', expiring_soon: 'warning', active: 'success', no_expiration: 'neutral', in_progress: 'info', not_obtained: 'neutral', archived: 'neutral',
};

export function DocumentCard({ d, today }: { d: DocumentRecord; today: string }) {
  return (
    <Card onPress={() => router.push(`/document/${d.id}`)} accessibilityLabel={`${d.name}. ${DOCUMENT_STATUS_LABEL[d.status]}. ${expiryCountdown(d.expiryDate, today)}`}>
      <Row gap={12}>
        <Icon name="file-text" color="primary" />
        <Stack gap={4} style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{d.name}</AppText>
          <Row wrap gap={8}>
            <StatusBadge label={DOCUMENT_STATUS_LABEL[d.status]} tone={STATUS_TONE[d.status]} />
            {d.stage === 'obtained' ? <AppText variant="caption" color="textMuted">{expiryCountdown(d.expiryDate, today)}</AppText> : null}
            {d.referenceLast4 ? <AppText variant="caption" color="textMuted">•••• {d.referenceLast4}</AppText> : null}
          </Row>
        </Stack>
        <Icon name="chevron-right" color="textMuted" />
      </Row>
    </Card>
  );
}
