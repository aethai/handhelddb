import { db } from '../src/lib/db/client';
import { devices } from '../src/lib/db/schema';

const DEVICES = [
  {
    name: 'Steam Deck OLED',
    slug: 'steam-deck-oled',
    manufacturer: 'Valve',
    chip: 'AMD Van Gogh (custom APU)',
    gpu: 'RDNA 2, 8 CUs @ 1.6 GHz',
    ramGb: 16,
    storageGb: 512,
    screenResolution: '1280x800',
    screenSize: 7.4,
    screenType: 'HDR OLED',
    batteryWh: 50,
    tdpMin: 3,
    tdpMax: 15,
    tdpDefault: 12,
    weightGrams: 640,
    defaultOs: 'SteamOS 3.6',
    supportsWindows: true,
    msrpUsd: 549,
    releaseDate: new Date('2023-11-16'),
    isActive: true,
  },
  {
    name: 'ASUS ROG Ally X',
    slug: 'rog-ally-x',
    manufacturer: 'ASUS',
    chip: 'AMD Ryzen Z1 Extreme',
    gpu: 'RDNA 3, 12 CUs @ 2.7 GHz',
    ramGb: 24,
    storageGb: 1024,
    screenResolution: '1920x1080',
    screenSize: 7.0,
    screenType: 'IPS',
    batteryWh: 80,
    tdpMin: 9,
    tdpMax: 30,
    tdpDefault: 17,
    weightGrams: 678,
    defaultOs: 'Windows 11',
    supportsWindows: true,
    msrpUsd: 799,
    releaseDate: new Date('2024-07-22'),
    isActive: true,
  },
  {
    name: 'Lenovo Legion Go',
    slug: 'legion-go',
    manufacturer: 'Lenovo',
    chip: 'AMD Ryzen Z1 Extreme',
    gpu: 'RDNA 3, 12 CUs @ 2.7 GHz',
    ramGb: 16,
    storageGb: 512,
    screenResolution: '2560x1600',
    screenSize: 8.8,
    screenType: 'IPS',
    batteryWh: 49.2,
    tdpMin: 8,
    tdpMax: 30,
    tdpDefault: 20,
    weightGrams: 854,
    defaultOs: 'Windows 11',
    supportsWindows: true,
    msrpUsd: 699,
    releaseDate: new Date('2023-10-31'),
    isActive: true,
  },
];

async function seed() {
  console.log('Seeding devices...');

  for (const device of DEVICES) {
    await db
      .insert(devices)
      .values(device)
      .onConflictDoNothing({ target: devices.slug });
    console.log(`  Seeded: ${device.name}`);
  }

  console.log('Done! 3 devices seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
