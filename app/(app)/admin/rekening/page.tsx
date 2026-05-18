'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminGate } from '../AdminGate';

export default function AdminRekeningPage() {
  return (
    <AdminGate icon="🏦" title="Rekening" desc="Atur nomor rekening pembayaran (DANA, BCA, OVO, dll). User akan lihat ini di modal Premium.">
      <AdminPanel section="payments" hideHeader />
    </AdminGate>
  );
}
