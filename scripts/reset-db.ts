import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function resetDatabase() {
  try {
    console.log('🗑️  Dropping all tables...');

    // Drop tables in correct order (respecting foreign key constraints)
    await sql`DROP TABLE IF EXISTS ai_messages CASCADE;`;
    await sql`DROP TABLE IF EXISTS ai_threads CASCADE;`;
    await sql`DROP TABLE IF EXISTS files CASCADE;`;
    await sql`DROP TABLE IF EXISTS items CASCADE;`;
    await sql`DROP TABLE IF EXISTS users CASCADE;`;

    console.log('✅ All tables dropped successfully!');
    console.log('');
    console.log('Now run: npm run db:push');
    console.log('This will recreate all tables with the updated schema.');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
