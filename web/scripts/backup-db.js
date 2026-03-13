/**
 * DepMi DB Backup Script
 * ─────────────────────
 * Dumps every table to a timestamped JSON file in web/backups/
 * Run BEFORE any `prisma db push` or destructive schema change.
 *
 * Usage:  node scripts/backup-db.js
 */

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const TABLES = [
  'User', 'Account', 'Store', 'Product', 'ProductImage',
  'Demand', 'DemandMedia', 'Order', 'OrderItem', 'Bid',
  'Review', 'Comment', 'PostComment', 'Post', 'PostImage',
  'Message', 'Conversation', 'Notification',
  'UserFollow', 'StoreFollow',
  'ProductLike', 'DemandLike', 'PostLike',
  'SavedProduct', 'SavedDemand',
  'ProductWatch', 'OtpToken',
  'DepTransaction', 'KycStatus',
  'ReferralCode', 'ReferralTransaction',
  'StoreInvite',
];

async function backup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, '..', 'backups', timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { timestamp, tables: {}, rowCounts: {} };

  for (const table of TABLES) {
    try {
      const res = await client.query(`SELECT * FROM "${table}"`);
      const file = path.join(outDir, `${table}.json`);
      fs.writeFileSync(file, JSON.stringify(res.rows, null, 2));
      manifest.rowCounts[table] = res.rows.length;
      process.stdout.write(`  ✓ ${table.padEnd(24)} ${res.rows.length} rows\n`);
    } catch (err) {
      process.stdout.write(`  ✗ ${table.padEnd(24)} ${err.message}\n`);
      manifest.rowCounts[table] = 'ERROR';
    }
  }

  fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  await client.end();

  console.log(`\nBackup complete → web/backups/${timestamp}/`);
  console.log(`Total tables: ${Object.keys(manifest.rowCounts).length}`);
}

backup().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
