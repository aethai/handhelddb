import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://crxxcojzpavehofzfubq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyeHhjb2p6cGF2ZWhvZnpmdWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0OTA1MSwiZXhwIjoyMDg4NjI1MDUxfQ.ZRiP8ZkRxyONiF2Xkm71mJ5qiyo4tRADSKjMfouZlUA'
);

async function main() {
  // Get all reports with device info
  const allReports: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('performance_reports')
      .select('game_id, device_id')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allReports.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  console.log(`Total reports: ${allReports.length}`);
  
  // Count reports per device
  const deviceCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  
  for (const r of allReports) {
    deviceCounts.set(r.device_id, (deviceCounts.get(r.device_id) ?? 0) + 1);
    const key = `${r.game_id}::${r.device_id}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  
  // Get device names
  const { data: devices } = await sb.from('devices').select('id, name').eq('is_active', true);
  const deviceNames = new Map(devices?.map(d => [d.id, d.name]) ?? []);
  
  console.log('\nReports per device:');
  for (const [id, count] of [...deviceCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${deviceNames.get(id) ?? id}: ${count}`);
  }
  
  // Count pairs with enough reports for consensus
  let pairsWith3Plus = 0;
  let pairsWith2 = 0;
  let pairsWith1 = 0;
  for (const count of pairCounts.values()) {
    if (count >= 3) pairsWith3Plus++;
    else if (count === 2) pairsWith2++;
    else pairsWith1++;
  }
  
  console.log(`\nGame-device pairs:`);
  console.log(`  3+ reports (consensus eligible): ${pairsWith3Plus}`);
  console.log(`  2 reports (need 1 more): ${pairsWith2}`);
  console.log(`  1 report only: ${pairsWith1}`);
  console.log(`  Total unique pairs: ${pairCounts.size}`);
  
  // Get existing consensus count
  const { count: consensusCount } = await sb.from('consensus_ratings').select('id', { count: 'exact', head: true });
  console.log(`\nExisting consensus ratings: ${consensusCount}`);
  
  // Find games with reports on only 1-2 devices
  const gameDevices = new Map<string, Set<string>>();
  for (const r of allReports) {
    if (!gameDevices.has(r.game_id)) gameDevices.set(r.game_id, new Set());
    gameDevices.get(r.game_id)!.add(r.device_id);
  }
  
  let gamesOn1Device = 0, gamesOn2Devices = 0, gamesOn3Plus = 0;
  for (const deviceSet of gameDevices.values()) {
    if (deviceSet.size === 1) gamesOn1Device++;
    else if (deviceSet.size === 2) gamesOn2Devices++;
    else gamesOn3Plus++;
  }
  
  console.log(`\nGames by device coverage:`);
  console.log(`  On 1 device: ${gamesOn1Device}`);
  console.log(`  On 2 devices: ${gamesOn2Devices}`);
  console.log(`  On 3+ devices: ${gamesOn3Plus}`);
  console.log(`  Total games with reports: ${gameDevices.size}`);
}

main().catch(console.error);
