'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminRekeningPage() {
  const t = useT();
  return (
    <AdminGate icon="🏦" title={t('admin_page.rekening_title')} desc={t('admin_page.rekening_desc')}>
      <AdminPanel section="payments" hideHeader />
    </AdminGate>
  );
}
