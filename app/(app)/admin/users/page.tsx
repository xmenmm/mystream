'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminUsersPage() {
  const t = useT();
  return (
    <AdminGate icon="👥" title={t('admin_page.users_title')} desc={t('admin_page.users_desc')}>
      <AdminPanel section="users" hideHeader />
    </AdminGate>
  );
}
