'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminActivityPage() {
  return (
    <AdminGate icon="⚡" title="Activity" desc="Recent activity dari semua user (auto-refresh 10s).">
      <AdminPanel section="activity" hideHeader />
    </AdminGate>
  );
}
