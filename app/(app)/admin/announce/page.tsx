'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminAnnouncePage() {
  const t = useT();
  return (
    <AdminGate icon="📢" title={t('admin_page.announce_title')} desc={t('admin_page.announce_desc')}>
      <AdminPanel section="announce" hideHeader />
    </AdminGate>
  );
}
