'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminOverviewPage() {
  const t = useT();
  return (
    <AdminGate icon="📊" title={t('admin_page.overview_title')} desc={t('admin_page.overview_desc')}>
      <AdminPanel section="overview" hideHeader />
    </AdminGate>
  );
}
