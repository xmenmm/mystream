'use client';
import { AdminTools } from '@/components/AdminTools';
import { AdminGate } from '../AdminGate';

export default function AdminToolsPage() {
  return (
    <AdminGate icon="🛠" title="Tools" desc="Generate image AI, player layers global, send to discord, daily report, running text & banner.">
      <AdminTools />
    </AdminGate>
  );
}
