import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://crxxcojzpavehofzfubq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyeHhjb2p6cGF2ZWhvZnpmdWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0OTA1MSwiZXhwIjoyMDg4NjI1MDUxfQ.ZRiP8ZkRxyONiF2Xkm71mJ5qiyo4tRADSKjMfouZlUA'
);

const updates = [
  { slug: 'steam-deck-oled', image: 'https://cdn.akamai.steamstatic.com/steamdeck/images/press/renderings/press_oled_front_english.png' },
  { slug: 'rog-ally', image: 'https://dlcdnwebimgs.asus.com/gain/E70351F2-3579-45FB-95AC-4D41DA42EF2C' },
  { slug: 'rog-ally-x', image: 'https://dlcdnwebimgs.asus.com/gain/F12D7B4D-DC78-4228-8426-D2C474B7BD0D' },
  { slug: 'legion-go', image: 'https://p2-ofp.static.pub/ShareResource/na/products/legion/560x450/lenovo-legion-go-front-community-award.png' },
  { slug: 'legion-go-s', image: 'https://p4-ofp.static.pub/ShareResource/na/subseries/hero/lenovo-legion-go-white-nebula.png' },
  { slug: 'msi-claw-8-ai-plus', image: 'https://www.notebookcheck.net/fileadmin/_processed_/1/c/csm_claw_8_ai_case_01_19ade297e4.jpg' },
];

async function main() {
  for (const { slug, image } of updates) {
    const { error } = await sb.from('devices').update({ image }).eq('slug', slug);
    if (error) console.error('Failed', slug, error.message);
    else console.log('Updated', slug);
  }

  // Verify
  const { data } = await sb.from('devices').select('name, slug, image').eq('is_active', true).order('name');
  console.log('\nVerification:');
  for (const d of data ?? []) {
    console.log(`  ${d.name}: ${d.image ? 'HAS IMAGE' : 'NO IMAGE'}`);
  }
}

main().catch(console.error);
