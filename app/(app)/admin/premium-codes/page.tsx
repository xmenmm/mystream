'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminPremiumCodesPage() {
  return (
    <AdminGate icon="⭐" title="Premium Codes" desc="Approve / reject kode pembayaran premium dari user.">
      <AdminPanel section="premium" hideHeader />
    </AdminGate>
  );
}
