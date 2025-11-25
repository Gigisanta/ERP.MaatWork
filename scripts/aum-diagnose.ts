import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FormData, Blob } from 'node:undici';
import { db, aumImportRows, aumImportFiles } from '@cactus/db';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.AUM_API_BASE ?? 'http://localhost:3001';
const BASE_FILE = path.resolve(__dirname, '../Balanz Cactus 2025 - AUM Balanz.csv');
const MONTHLY_FILE = path.resolve(__dirname, '../reporteClusterCuentasV2.csv');

interface UploadResult {
  ok: boolean;
  fileId: string;
  totals: {
    parsed: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
    conflicts: number;
  };
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: process.env.AUM_ADMIN_EMAIL ?? 'giolivosantarelli@gmail.com',
      password: process.env.AUM_ADMIN_PASSWORD ?? 'admin123',
      rememberMe: true
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }

  const cookies: string[] =
    // @ts-ignore Node 20+ provides getSetCookie
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : // Fallback for older Node
        // @ts-ignore
        res.headers.raw?.()['set-cookie'] ?? [];

  const token = cookies
    .map((cookie) => /token=([^;]+)/.exec(cookie))
    .find((match): match is RegExpExecArray => Boolean(match))?.[1];

  if (!token) {
    throw new Error('Login succeeded but no token cookie was returned');
  }

  return token;
}

async function uploadFile(token: string, filePath: string): Promise<UploadResult> {
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.promises.readFile(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);

  const res = await fetch(`${API_BASE}/v1/admin/aum/uploads?broker=balanz`, {
    method: 'POST',
    body: formData,
    headers: {
      Cookie: `token=${token}`
    }
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return JSON.parse(text) as UploadResult;
}

async function fetchTotals(token: string, params: URLSearchParams): Promise<{
  total: number;
  previewIds: string[];
}> {
  const res = await fetch(`${API_BASE}/v1/admin/aum/rows/all?${params.toString()}`, {
    headers: {
      Cookie: `token=${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetching totals failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    total: data.pagination?.total ?? 0,
    previewIds: (data.rows ?? []).slice(0, 5).map((row: any) => row.id)
  };
}

async function queryDuplicates(): Promise<
  Array<{
    accountNumber: string;
    rows: number;
    fileIds: string[];
  }>
> {
  const dbi = db();
  const result = await dbi.execute(sql`
    SELECT account_number, COUNT(*) AS rows,
           ARRAY_AGG(DISTINCT file_id) AS files
    FROM aum_import_rows
    WHERE account_number IS NOT NULL
    GROUP BY account_number
    HAVING COUNT(*) > 1
    ORDER BY rows DESC
  `);

  return (result.rows ?? []).map((row: any) => ({
    accountNumber: row.account_number,
    rows: Number(row.rows),
    fileIds: row.files
  }));
}

async function summarizeFiles() {
  const dbi = db();
  const files = await dbi.select().from(aumImportFiles);
  return files.map((file) => ({
    id: file.id,
    broker: file.broker,
    status: file.status,
    totals: {
      parsed: file.totalParsed,
      matched: file.totalMatched,
      unmatched: file.totalUnmatched
    },
    createdAt: file.createdAt
  }));
}

async function main() {
  console.log('🔐 Logging in as admin…');
  const token = await login();
  console.log('✅ Logged in');

  console.log(`\n📤 Uploading base file: ${BASE_FILE}`);
  const baseResult = await uploadFile(token, BASE_FILE);
  console.log('   -> File ID:', baseResult.fileId);
  console.log('   -> Totals:', baseResult.totals);

  const baseTotals = await fetchTotals(
    token,
    new URLSearchParams({
      limit: '1',
      preferredOnly: 'false',
      onlyUpdated: 'false'
    })
  );
  console.log('   -> API total rows (all):', baseTotals.total);

  console.log(`\n📤 Uploading monthly file: ${MONTHLY_FILE}`);
  const monthlyResult = await uploadFile(token, MONTHLY_FILE);
  console.log('   -> File ID:', monthlyResult.fileId);
  console.log('   -> Totals:', monthlyResult.totals);

  const preferredTotals = await fetchTotals(
    token,
    new URLSearchParams({
      limit: '1',
      preferredOnly: 'true',
      onlyUpdated: 'false'
    })
  );
  const allTotals = await fetchTotals(
    token,
    new URLSearchParams({
      limit: '1',
      preferredOnly: 'false',
      onlyUpdated: 'false'
    })
  );

  console.log('\n📊 Totals after monthly upload:');
  console.log('   -> Preferred only:', preferredTotals.total);
  console.log('   -> All rows:', allTotals.total);

  const duplicates = await queryDuplicates();
  console.log(`\n⚠️ Accounts with duplicates: ${duplicates.length}`);
  duplicates.slice(0, 10).forEach((dup, index) => {
    console.log(
      `   ${index + 1}. ${dup.accountNumber} -> ${dup.rows} rows (files: ${dup.fileIds.join(', ')})`
    );
  });
  if (duplicates.length > 10) {
    console.log('   …');
  }

  const fileSummaries = await summarizeFiles();
  console.log('\n📁 File summaries:');
  fileSummaries.forEach((file) => {
    console.log(
      `   ${file.id} (${file.status}) parsed=${file.totals.parsed} matched=${file.totals.matched} unmatched=${file.totals.unmatched}`
    );
  });

  await db().execute(sql`SELECT 1`); // keep connection tidy
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


