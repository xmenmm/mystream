'use client';
import { AdminTools } from '@/components/AdminTools';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminToolsPage() {
  const t = useT();
  return (
    <AdminGate icon="🛠" title={t('admin_page.tools_title')} desc={t('admin_page.tools_desc')}>
      <AdminTools />
    </AdminGate>
  );
}
