'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminTopPage() {
  return (
    <AdminGate icon="🏆" title="Top" desc="Top creators by views / likes / videos / followers.">
      <AdminPanel section="top" hideHeader />
    </AdminGate>
  );
}
