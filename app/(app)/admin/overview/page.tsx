'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminOverviewPage() {
  return (
    <AdminGate icon="📊" title="Overview" desc="Stats umum + user baru hari ini + online sekarang.">
      <AdminPanel section="overview" hideHeader />
    </AdminGate>
  );
}
