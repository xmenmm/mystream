'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminActivityPage() {
  const t = useT();
  return (
    <AdminGate icon="⚡" title={t('admin_page.activity_title')} desc={t('admin_page.activity_desc')}>
      <AdminPanel section="activity" hideHeader />
    </AdminGate>
  );
}
