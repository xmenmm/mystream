'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminBannerPage() {
  return (
    <AdminGate icon="🖼" title="Banner" desc="Edit banner running text + image upload (drag-drop, object-fit picker).">
      <AdminPanel section="banner" hideHeader />
    </AdminGate>
  );
}
