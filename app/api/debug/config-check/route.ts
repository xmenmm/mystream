import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { supa } from '@/lib/supabase';
import { setConfig, getConfig } from '@/lib/config';

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

  // Step 5: Test UPDATE existing row (banner key)
  const updateTestValue = { _debug_update_test: Date.now() };
  const updateRes = await sb
    .from('app_config')
    .upsert({ key: 'banner', value: updateTestValue, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select();
  result.updateError = updateRes.error?.message || null;
  result.updateReturnedRows = updateRes.data?.length || 0;
  result.updateReturnedValue = updateRes.data?.[0]?.value;

  // Step 6: Read back the banner row to see if UPDATE persisted
  const readbackBanner = await sb.from('app_config').select('value, updated_at').eq('key', 'banner').maybeSingle();
  result.bannerReadbackValue = readbackBanner.data?.value;
  result.bannerReadbackUpdatedAt = readbackBanner.data?.updated_at;
  result.updatePersisted = JSON.stringify(readbackBanner.data?.value) === JSON.stringify(updateTestValue);

  // Step 7: Test setConfig wrapper langsung (untuk isolasi bug — apakah wrapper bermasalah?)
  const wrapperTestValue = { _wrapper_test: Date.now(), title: 'wrapper test' };
  try {
    await setConfig('banner', wrapperTestValue);
    result.wrapperError = null;
  } catch (e: any) {
    result.wrapperError = e.message;
  }
  // Read back via getConfig
  const viaGetConfig = await getConfig('banner', null);
  result.wrapperReadbackValue = viaGetConfig;
  result.wrapperPersisted = JSON.stringify(viaGetConfig) === JSON.stringify(wrapperTestValue);

  // Read back via direct SQL
  const directRead = await sb.from('app_config').select('value, updated_at').eq('key', 'banner').maybeSingle();
  result.directReadValue = directRead.data?.value;
  result.directReadUpdatedAt = directRead.data?.updated_at;

  return NextResponse.json(result);
}
