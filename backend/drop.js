import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);
async function drop() {
  try {
    await sql`DROP SCHEMA public CASCADE;`;
    await sql`CREATE SCHEMA public;`;
    console.log("Dropped and recreated public schema.");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
drop();
