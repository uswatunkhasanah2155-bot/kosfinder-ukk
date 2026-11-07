import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

// max kecil supaya koneksi ke Supabase tidak cepat habis saat jalan di Vercel (serverless)
const pool = new pg.Pool({ connectionString, max: 3 });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;