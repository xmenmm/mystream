'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminUsersPage() {
  return (
    <AdminGate icon="👥" title="Users" desc="Manage user — suspend, warn, grant / revoke premium.">
      <AdminPanel section="users" hideHeader />
    </AdminGate>
  );
}
