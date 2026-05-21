'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminPremiumCodesPage() {
  const t = useT();
  return (
    <AdminGate icon="⭐" title={t('admin_page.premium_codes_title')} desc={t('admin_page.premium_codes_desc')}>
      <AdminPanel section="premium" hideHeader />
    </AdminGate>
  );
}
