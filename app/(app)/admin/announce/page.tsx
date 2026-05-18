'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminAnnouncePage() {
  return (
    <AdminGate icon="📢" title="Announce" desc="Set pengumuman global yang muncul untuk semua user.">
      <AdminPanel section="announce" hideHeader />
    </AdminGate>
  );
}
