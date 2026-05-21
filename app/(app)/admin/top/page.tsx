'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminTopPage() {
  const t = useT();
  return (
    <AdminGate icon="🏆" title={t('admin_page.top_title')} desc={t('admin_page.top_desc')}>
      <AdminPanel section="top" hideHeader />
    </AdminGate>
  );
}
