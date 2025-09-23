import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from 'shared/schema';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database???');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Azure requires SSL
});
export const db = drizzle(pool, { schema });

pool.connect()
  .then(client => {
    console.log("✅ Successfully connected to DB");
    client.release();
  })
  .catch(err => {
    console.error("❌ Failed to connect to DB");
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
  });
