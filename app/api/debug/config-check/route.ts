import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { supa } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint — cek apakah tabel app_config exist & writable.
 * Akses: admin only. URL: /api/debug/config-check
 */
export async function GET(req: NextRequest) {
  const a = await getAuthFromRequest(req);
  if (!a || !a.user.isAdmin) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  const sb = supa();
  const result: any = {
    tableExists: false,
    canRead: false,
    canWrite: false,
    rowCount: null,
    sampleRows: null,
    writeTestKey: '_debug_test_' + Date.now(),
    writeError: null,
    readbackMatch: false,
  };

  // Step 1: Coba SELECT — kalau tabel gak ada, error muncul
  const readRes = await sb.from('app_config').select('key, value, updated_at');
  if (readRes.error) {
    result.tableError = readRes.error.message;
    return NextResponse.json(result);
  }
  result.tableExists = true;
  result.canRead = true;
  result.rowCount = readRes.data?.length || 0;
  result.sampleRows = (readRes.data || []).map((r: any) => ({
    key: r.key,
    valueKeys: Object.keys(r.value || {}),
    updated_at: r.updated_at,
  }));

  // Step 2: Test write
  const testKey = result.writeTestKey;
  const testValue = { test: true, ts: Date.now() };
  const writeRes = await sb
    .from('app_config')
    .upsert({ key: testKey, value: testValue, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select();
  if (writeRes.error) {
    result.writeError = writeRes.error.message;
    return NextResponse.json(result);
  }
  result.canWrite = true;
  result.writeReturnedRows = writeRes.data?.length || 0;

  // Step 3: Read back
  const readback = await sb.from('app_config').select('value').eq('key', testKey).maybeSingle();
  result.readbackData = readback.data?.value;
  result.readbackError = readback.error?.message;
  result.readbackMatch = JSON.stringify(readback.data?.value) === JSON.stringify(testValue);

  // Step 4: Cleanup
  await sb.from('app_config').delete().eq('key', testKey);

  return NextResponse.json(result);
}
