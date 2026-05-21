'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';
import { useT } from '@/lib/i18n';

export default function AdminBannerPage() {
  const t = useT();
  return (
    <AdminGate icon="🖼" title={t('admin_page.banner_title')} desc={t('admin_page.banner_desc')}>
      <AdminPanel section="banner" hideHeader />
    </AdminGate>
  );
}
