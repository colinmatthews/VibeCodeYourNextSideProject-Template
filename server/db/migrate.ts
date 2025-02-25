
import { db } from '../db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  try {
    const sql = readFileSync(join(__dirname, '../migrations/0000_create_tables.sql'), 'utf8');
    await db.execute(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
