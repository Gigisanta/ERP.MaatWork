import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

console.log('🔌 Configuring environment...');

// Configure dotenv to look for .env in the root if not found
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Try apps/api/.env which is where drizzle.config.ts looks
  const apiEnvPath = path.resolve(__dirname, '../../../apps/api/.env');
  console.log(`Looking for .env at: ${apiEnvPath}`);
  
  if (fs.existsSync(apiEnvPath)) {
    console.log('✅ Found .env file at apps/api');
    const result = dotenv.config({ path: apiEnvPath });
    if (result.error) {
        console.error('❌ Error loading .env:', result.error);
    } else {
        console.log('✅ Loaded .env');
    }
  } else {
    // Fallback to root .env
    const rootEnvPath = path.resolve(__dirname, '../../../.env');
    console.log(`Looking for .env at: ${rootEnvPath}`);
    if (fs.existsSync(rootEnvPath)) {
        console.log('✅ Found .env file at root');
        const result = dotenv.config({ path: rootEnvPath });
        if (result.error) {
            console.error('❌ Error loading .env:', result.error);
        } else {
            console.log('✅ Loaded .env');
        }
    } else {
        console.log('❌ .env file not found');
        // Fallback to hardcoded dev string if nothing found (useful for local dev default)
        if (!process.env.DATABASE_URL) {
            console.log('⚠️ Using default local DATABASE_URL');
            process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/CRM';
        }
    }
  }
} catch (e) {
  console.error('❌ Error in env-setup:', e);
}

if (!process.env.DATABASE_URL) {
    console.error('⚠️ DATABASE_URL is NOT set after setup');
} else {
    console.log('✅ DATABASE_URL is set');
}
