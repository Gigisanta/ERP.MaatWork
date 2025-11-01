import { Router } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { Request } from 'express';
import { db, aumImportFiles, aumImportRows, brokerAccounts, contacts, users, teams, teamMembership } from '@cactus/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { Pool } from 'pg';

const router = Router();

// AI_DECISION: Guardar uploads en FS local bajo apps/api/uploads y registrar metadata en DB
// Justificación: Simplicidad y trazabilidad en MVP; mover a S3 en el futuro si es necesario
// Impacto: Nuevo endpoint y archivos temporales controlados

const uploadDir = join(process.cwd(), 'apps', 'api', 'uploads');

// Singleton Pool for raw SQL queries
let _rawPool: Pool | null = null;
function getRawPool(): Pool {
  if (!_rawPool) {
    _rawPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _rawPool;
}
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {}
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`);
  }
});

// GET /admin/aum/uploads/:fileId/export
router.get('/uploads/:fileId/export', requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const dbi = db();
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const rows = await dbi.select().from(aumImportRows).where(eq(aumImportRows.fileId, fileId));

    const headers = [
      'account_number',
      'broker_holder_name',
      'crm_contact_id',
      'crm_contact_full_name',
      'matched_user_id',
      'advisor_raw',
      'match_status'
    ];

    // Fetch contact names for matched rows
    const contactIdSet = new Set<string>();
    rows.forEach((r: any) => { if (r.matchedContactId) contactIdSet.add(r.matchedContactId as string); });
    const contactIds = Array.from(contactIdSet);
    const contactMap = new Map<string, string>();
    if (contactIds.length > 0) {
      // Fallback robusto: usar SQL crudo para evitar metadatos de tablas
      for (const cid of contactIds) {
        try {
          const r = await dbi.execute(sql`SELECT id, full_name FROM contacts WHERE id = ${cid} LIMIT 1`);
          const rec = (r.rows && r.rows[0]) as any;
          if (rec && rec.id) {
            contactMap.set(rec.id as string, (rec.full_name as string) || '');
          }
        } catch {}
      }
    }

    const csvLines: string[] = [];
    csvLines.push(headers.join(','));
    for (const r of rows as any[]) {
      const values = [
        r.accountNumber || '',
        r.holderName || '',
        r.matchedContactId || '',
        (r.matchedContactId ? (contactMap.get(r.matchedContactId) || '') : ''),
        r.matchedUserId || '',
        r.advisorRaw || '',
        r.matchStatus || ''
      ];
      const escaped = values.map((v) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      csvLines.push(escaped.join(','));
    }

    const csv = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=aup_export_${fileId}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/uploads/:fileId/commit
router.post('/uploads/:fileId/commit', requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const broker = (req.query.broker as string) || 'balanz';
    const dbi = db();

    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Check for ambiguous rows that need resolution
    const ambiguousRows = await dbi.select().from(aumImportRows)
      .where(and(eq(aumImportRows.fileId, fileId), eq(aumImportRows.matchStatus, 'ambiguous')));
    
    if (ambiguousRows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot commit file with unresolved conflicts', 
        details: `Found ${ambiguousRows.length} rows with ambiguous status. Please resolve conflicts before committing.` 
      });
    }

    // Only commit matched rows that are preferred (source of truth)
    const rows = await dbi.select().from(aumImportRows)
      .where(and(
        eq(aumImportRows.fileId, fileId), 
        eq(aumImportRows.matchStatus, 'matched'),
        eq(aumImportRows.isPreferred, true)
      ));

    let upserts = 0;
    let skipped = 0;
    for (const r of rows) {
      if (!r.accountNumber || !r.matchedContactId) {
        skipped += 1;
        continue;
      }

      // Find existing broker account
      const existing = await dbi.select().from(brokerAccounts)
        .where(and(eq(brokerAccounts.broker, broker), eq(brokerAccounts.accountNumber, r.accountNumber)))
        .limit(1);

      if (existing.length === 0) {
        await dbi.insert(brokerAccounts).values({
          broker,
          accountNumber: r.accountNumber,
          holderName: r.holderName ?? null,
          contactId: r.matchedContactId as string,
          status: 'active'
        });
        upserts += 1;
      } else {
        // Update holder name/contact if changed (prefer matched contactId)
        const ex = existing[0];
        const needsUpdate = (ex.holderName !== (r.holderName ?? null)) || (ex.contactId !== r.matchedContactId);
        if (needsUpdate) {
          await dbi.update(brokerAccounts)
            .set({ holderName: r.holderName ?? null, contactId: r.matchedContactId as string, status: 'active' })
            .where(eq(brokerAccounts.id, ex.id as string));
          upserts += 1;
        }
      }

      // Optionally set advisor on contact if empty and we have a matched user
      if (r.matchedUserId) {
        const [c] = await dbi.select({ assignedAdvisorId: contacts.assignedAdvisorId })
          .from(contacts)
          .where(eq(contacts.id, r.matchedContactId as string))
          .limit(1);
        if (c && !c.assignedAdvisorId) {
          await dbi.update(contacts)
            .set({ assignedAdvisorId: r.matchedUserId as string })
            .where(eq(contacts.id, r.matchedContactId as string));
        }
      }
    }

    await dbi.update(aumImportFiles)
      .set({ status: 'committed' })
      .where(eq(aumImportFiles.id, fileId));

    return res.json({ 
      ok: true, 
      upserts, 
      skipped, 
      total: rows.length,
      message: `${upserts} cuentas sincronizadas` + (skipped > 0 ? `, ${skipped} omitidas` : '')
    });
  } catch (error) {
    (req as any).log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM commit failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

async function ensureAumTables(dbi: any) {
  // Create tables if they don't exist (idempotent)
  await dbi.execute(sql`
    CREATE TABLE IF NOT EXISTS aum_import_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      broker text NOT NULL,
      original_filename text NOT NULL,
      mime_type text NOT NULL,
      size_bytes integer NOT NULL,
      uploaded_by_user_id uuid NOT NULL,
      status text NOT NULL,
      total_parsed integer NOT NULL DEFAULT 0,
      total_matched integer NOT NULL DEFAULT 0,
      total_unmatched integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await dbi.execute(sql`
    CREATE TABLE IF NOT EXISTS aum_import_rows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      file_id uuid NOT NULL REFERENCES aum_import_files(id) ON DELETE CASCADE,
      raw jsonb NOT NULL DEFAULT '{}'::jsonb,
      account_number text,
      holder_name text,
      advisor_raw text,
      matched_contact_id uuid,
      matched_user_id uuid,
      match_status text NOT NULL DEFAULT 'unmatched',
      is_preferred boolean NOT NULL DEFAULT true,
      conflict_detected boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await dbi.execute(sql`CREATE INDEX IF NOT EXISTS idx_aum_rows_account ON aum_import_rows (account_number);`);
  await dbi.execute(sql`CREATE INDEX IF NOT EXISTS idx_aum_rows_file ON aum_import_rows (file_id);`);
}


function isEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@/.test(value);
}

async function parseFileToRows(filePath: string, originalName: string): Promise<Array<{ accountNumber: string | null; holderName: string | null; advisorRaw: string | null; raw: Record<string, unknown>; }>> {
  const ext = extname(originalName).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    // [Unverified] Requires 'xlsx' package at runtime
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(filePath);
    // AI_DECISION: Fix TypeScript implicit 'any' and untyped function call issues; increase strictness and maintain compatibility.
    // Justificación: sheet_to_json does not accept type arguments and 'r' was not typed; to enforce strict typing, first parse as unknown[], then map with explicit type.
    // Impacto: Only parseFileToRows XSLX branch affected; code is now type safe and future-proof.
    const sheetName: string = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { defval: null }) as Array<Record<string, unknown>>;
    return json.map((r: Record<string, unknown>) => ({
      accountNumber: (r['Cuenta comitente'] as string) ?? null,
      holderName: (r['Titular'] as string) ?? null,
      advisorRaw: (r['asesor'] as string) ?? null,
      raw: r
    }));
  }
  // CSV simple usando Node (para MVP mejor XLSX)
  const content = await fs.readFile(filePath, 'utf-8');
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const idxCuenta = headers.findIndex((h) => h.toLowerCase() === 'cuenta comitente');
  const idxTitular = headers.findIndex((h) => h.toLowerCase() === 'titular');
  const idxAsesor = headers.findIndex((h) => h.toLowerCase() === 'asesor');
  const rows: Array<{ accountNumber: string | null; holderName: string | null; advisorRaw: string | null; raw: Record<string, unknown>; }> = [];
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => { record[h] = cols[i] ?? null; });
    rows.push({
      accountNumber: idxCuenta >= 0 ? (cols[idxCuenta] || null) : null,
      holderName: idxTitular >= 0 ? (cols[idxTitular] || null) : null,
      advisorRaw: idxAsesor >= 0 ? (cols[idxAsesor] || null) : null,
      raw: record
    });
  }
  return rows;
}

// POST /admin/aum/uploads
router.post('/uploads', requireAuth, upload.single('file'), async (req: Request, res) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const broker = (req.query.broker as string) || 'balanz';

    const dbi = db();
    let inserted;
    try {
      inserted = await dbi.execute(sql`
        INSERT INTO aum_import_files (broker, original_filename, mime_type, size_bytes, uploaded_by_user_id, status)
        VALUES (${broker}, ${file.originalname}, ${file.mimetype}, ${file.size}, ${userId}, 'uploaded')
        RETURNING id
      `);
    } catch (e: any) {
      if (e?.code === '42P01') {
        await ensureAumTables(dbi);
        inserted = await dbi.execute(sql`
          INSERT INTO aum_import_files (broker, original_filename, mime_type, size_bytes, uploaded_by_user_id, status)
          VALUES (${broker}, ${file.originalname}, ${file.mimetype}, ${file.size}, ${userId}, 'uploaded')
          RETURNING id
        `);
      } else {
        throw e;
      }
    }
    const fileRow = { id: (inserted.rows?.[0] as any)?.id as string } as any;

    // Resolve team scope for matching (all members of uploader's teams)
    let teamIds: string[] = [];
    let memberUserIds: string[] = [];
    try {
      const myManagerTeams = await dbi.select({ id: teams.id }).from(teams).where(sql`manager_user_id = ${userId}`);
      const myMemberTeams = await dbi.select({ teamId: teamMembership.teamId }).from(teamMembership).where(sql`user_id = ${userId}`);
      const set = new Set<string>();
      myManagerTeams.forEach((t: any) => set.add(t.id as any));
      myMemberTeams.forEach((t: any) => set.add((t.teamId as any)));
      teamIds = Array.from(set);
      if (teamIds.length > 0) {
        const members = await dbi.select({ userId: teamMembership.userId }).from(teamMembership).where(inArray(teamMembership.teamId, teamIds));
        const managers = await dbi.select({ userId: teams.managerUserId }).from(teams).where(inArray(teams.id, teamIds));
        const mset = new Set<string>();
        members.forEach((m: any) => m.userId && mset.add(m.userId as any));
        managers.forEach((m: any) => m.userId && mset.add(m.userId as any));
        memberUserIds = Array.from(mset);
      }
    } catch {}

    // Parse file to rows
    const parsedRows = await parseFileToRows(file.path, file.originalname);

    let matched = 0;
    let ambiguous = 0;
    let conflictsDetected = 0;
    const rowsToInsert: any[] = [];
    
    // Get existing rows for duplicate detection
    const existingAccounts = new Map<string, any>();
    try {
      const existingResult = await dbi.execute(sql`
        SELECT account_number, holder_name, advisor_raw, file_id, created_at
        FROM aum_import_rows
        WHERE account_number IS NOT NULL
      `);
      (existingResult.rows || []).forEach((row: any) => {
        if (!existingAccounts.has(row.account_number)) {
          existingAccounts.set(row.account_number, []);
        }
        existingAccounts.get(row.account_number)!.push(row);
      });
    } catch {}
    
    for (const r of parsedRows) {
      let matchedContactId: string | null = null;
      let matchedUserId: string | null = null;
      let matchStatus: 'matched' | 'ambiguous' | 'unmatched' = 'unmatched';
      let conflictDetected = false;

      // Check for duplicates in existing import rows
      if (r.accountNumber && existingAccounts.has(r.accountNumber)) {
        const existingRows = existingAccounts.get(r.accountNumber)!;
        // Check if data conflicts
        const hasConflict = existingRows.some((existing: any) => 
          existing.holder_name !== r.holderName || existing.advisor_raw !== r.advisorRaw
        );
        
        if (hasConflict) {
          matchStatus = 'ambiguous';
          conflictDetected = true;
          conflictsDetected += 1;
          ambiguous += 1;
        }
      }

      // Pre-match by broker account number if not already matched/ambiguous
      if (!matchedContactId && !conflictDetected && r.accountNumber) {
        try {
          const res = await dbi.execute(sql`SELECT contact_id FROM broker_accounts WHERE broker = ${broker} AND account_number = ${r.accountNumber} LIMIT 1`);
          const row = (res.rows && res.rows[0]) as any;
          if (row && row.contact_id) {
            matchedContactId = row.contact_id as string;
          }
        } catch {}
      }

      // If still no match, try matching by holder name (similarity search) scoped to team when applicable
      if (!matchedContactId && !conflictDetected && r.holderName) {
        try {
          // Use similarity search with pg_trgm if available, otherwise exact match
          const res = await dbi.execute(sql`
            SELECT id, full_name,
                   similarity(full_name, ${r.holderName}) as sim_score
            FROM contacts
            WHERE deleted_at IS NULL
              AND full_name % ${r.holderName}
            ORDER BY sim_score DESC
            LIMIT 5
          `);
          
          // If we get a high-confidence match (threshold > 0.5), use it
          const rows = res.rows as any[];
          if (rows.length > 0 && rows[0].sim_score > 0.5) {
            matchedContactId = rows[0].id as string;
          }
        } catch (e) {
          // If similarity search fails (e.g., extension not installed), try exact match
          try {
            const res = await dbi.execute(sql`
              SELECT id FROM contacts
              WHERE deleted_at IS NULL
                AND LOWER(TRIM(full_name)) = LOWER(TRIM(${r.holderName}))
              LIMIT 1
            `);
            const row = (res.rows && res.rows[0]) as any;
            if (row && row.id) {
              matchedContactId = row.id as string;
            }
          } catch {}
        }
      }

      // Pre-match advisor by email if email-like
      if (isEmailLike(r.advisorRaw)) {
        try {
          const res = await dbi.execute(sql`SELECT id FROM users WHERE email = ${r.advisorRaw as string} LIMIT 1`);
          const row = (res.rows && res.rows[0]) as any;
          if (row && row.id) {
            matchedUserId = row.id as string;
          }
        } catch {}
      }

      if (!conflictDetected && matchStatus !== 'ambiguous') {
        if (matchedContactId) {
          matchStatus = 'matched';
          matched += 1;
        } else {
          matchStatus = 'unmatched';
        }
      }

      rowsToInsert.push({
        fileId: fileRow.id,
        raw: r.raw,
        accountNumber: r.accountNumber,
        holderName: r.holderName,
        advisorRaw: r.advisorRaw,
        matchedContactId,
        matchedUserId,
        matchStatus,
        conflictDetected,
        isPreferred: !conflictDetected // Only new non-conflicting rows are preferred by default
      });
    }

    // Insert rows in batches (raw SQL for robustness)
    const batchSize = 250;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const chunk = rowsToInsert.slice(i, i + batchSize);
      for (const r of chunk) {
        await dbi.execute(sql`
          INSERT INTO aum_import_rows (file_id, raw, account_number, holder_name, advisor_raw, matched_contact_id, matched_user_id, match_status, is_preferred, conflict_detected)
          VALUES (${r.fileId}, ${JSON.stringify(r.raw)}::jsonb, ${r.accountNumber}, ${r.holderName}, ${r.advisorRaw}, ${r.matchedContactId}, ${r.matchedUserId}, ${r.matchStatus}, ${r.isPreferred}, ${r.conflictDetected})
        `);
      }
    }

    // Update file totals
    await dbi.execute(sql`
      UPDATE aum_import_files
      SET status = 'parsed',
          total_parsed = ${rowsToInsert.length},
          total_matched = ${matched},
          total_unmatched = ${rowsToInsert.length - matched}
      WHERE id = ${fileRow.id}
    `);

    return res.status(201).json({
      ok: true,
      fileId: fileRow.id,
      filename: file.originalname,
      totals: {
        parsed: rowsToInsert.length,
        matched,
        ambiguous,
        conflicts: conflictsDetected,
        unmatched: rowsToInsert.length - matched - ambiguous
      }
    });
  } catch (error) {
    (req as any).log?.error?.({ err: error }, 'AUM upload failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/uploads/:fileId/preview
router.get('/uploads/:fileId/preview', requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const limit = Math.min(Number(req.query.limit || 50), 500);
    const dbi = db();
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    const rows = await dbi.select().from(aumImportRows)
      .where(eq(aumImportRows.fileId, fileId))
      .limit(limit);

    return res.json({
      ok: true,
      file: {
        id: file.id,
        broker: file.broker,
        originalFilename: file.originalFilename,
        status: file.status,
        totals: {
          parsed: file.totalParsed,
          matched: file.totalMatched,
          unmatched: file.totalUnmatched
        },
        createdAt: file.createdAt
      },
      rows
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/uploads/history
router.get('/uploads/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const dbi = db();
    const result = await dbi.execute(sql`
      SELECT id, broker, original_filename, mime_type, size_bytes, uploaded_by_user_id, status,
             total_parsed, total_matched, total_unmatched, created_at
      FROM aum_import_files
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    const files = (result.rows || []).map((r: any) => ({
      id: r.id,
      broker: r.broker,
      originalFilename: r.original_filename,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes,
      uploadedByUserId: r.uploaded_by_user_id,
      status: r.status,
      totalParsed: r.total_parsed,
      totalMatched: r.total_matched,
      totalUnmatched: r.total_unmatched,
      createdAt: r.created_at
    }));
    return res.json({ ok: true, files });
  } catch (error: any) {
    // Si la tabla aún no existe (migración no aplicada en este DB), devolver lista vacía
    if (error?.code === '42P01') {
      (req as any).log?.warn?.({ err: error }, 'AUM history table missing - returning empty list');
      return res.json({ ok: true, files: [] });
    }
    (req as any).log?.error?.({ err: error }, 'AUM history failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/uploads/:fileId/match
router.post('/uploads/:fileId/match', requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { rowId, matchedContactId, matchedUserId, isPreferred } = req.body as {
      rowId: string;
      matchedContactId?: string | null;
      matchedUserId?: string | null;
      isPreferred?: boolean;
    };
    if (!rowId) return res.status(400).json({ error: 'rowId is required' });

    const dbi = db();
    // Ensure file exists
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Update row matching - use raw SQL with proper escaping
    const newStatus = matchedContactId ? 'matched' : 'unmatched';
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramNum = 1;
    
    if (matchedContactId) {
      updateFields.push(`matched_contact_id = $${paramNum++}`);
      updateValues.push(matchedContactId);
    } else {
      updateFields.push('matched_contact_id = NULL');
    }
    
    if (matchedUserId) {
      updateFields.push(`matched_user_id = $${paramNum++}`);
      updateValues.push(matchedUserId);
    } else {
      updateFields.push('matched_user_id = NULL');
    }
    
    updateFields.push(`match_status = $${paramNum++}`);
    updateValues.push(newStatus);
    
    if (typeof isPreferred === 'boolean') {
      updateFields.push(`is_preferred = $${paramNum++}`);
      updateValues.push(isPreferred);
    }
    
    const whereConditions: string[] = [
      `id = $${paramNum++}`,
      `file_id = $${paramNum++}`
    ];
    updateValues.push(rowId, fileId);
    
    const updateQuery = `UPDATE aum_import_rows SET ${updateFields.join(', ')} WHERE ${whereConditions.join(' AND ')}`;
    
    // Execute with raw Pool query
    const pool = getRawPool();
    await pool.query(updateQuery, updateValues);

    // Recompute file totals
    const totals = await dbi.execute(sql`
      select 
        count(*)::int as total_parsed,
        sum(case when match_status = 'matched' then 1 else 0 end)::int as total_matched,
        sum(case when match_status <> 'matched' then 1 else 0 end)::int as total_unmatched
      from aum_import_rows where file_id = ${fileId}
    `);
    const row = totals.rows[0] as any;
    await dbi.update(aumImportFiles)
      .set({
        totalParsed: row.total_parsed,
        totalMatched: row.total_matched,
        totalUnmatched: row.total_unmatched
      })
      .where(eq(aumImportFiles.id, fileId));

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/rows/all - Get all imported rows with pagination and filters
router.get('/rows/all', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Number(req.query.offset || 0);
    const broker = req.query.broker as string | undefined;
    const status = req.query.status as string | undefined;
    const fileId = req.query.fileId as string | undefined;
    
    const dbi = db();
    
    // Build WHERE conditions
    const conditions: any[] = [];
    if (broker) {
      conditions.push(sql`f.broker = ${broker}`);
    }
    if (status) {
      conditions.push(sql`r.match_status = ${status}`);
    }
    if (fileId) {
      conditions.push(sql`r.file_id = ${fileId}`);
    }
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    
    // Get total count for pagination
    const countResult = await dbi.execute(sql`
      SELECT COUNT(*) as total
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      ${whereClause}
    `);
    const total = Number((countResult.rows?.[0] as any)?.total || 0);
    
    // Get paginated rows with joined data
    const result = await dbi.execute(sql`
      SELECT 
        r.id,
        r.file_id,
        r.account_number,
        r.holder_name,
        r.advisor_raw,
        r.matched_contact_id,
        r.matched_user_id,
        r.match_status,
        r.is_preferred,
        r.conflict_detected,
        r.created_at as row_created_at,
        f.id as file_id,
        f.broker,
        f.original_filename,
        f.status as file_status,
        f.created_at as file_created_at,
        c.full_name as contact_name,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        u.full_name as user_name,
        u.email as user_email
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      LEFT JOIN contacts c ON r.matched_contact_id = c.id
      LEFT JOIN users u ON r.matched_user_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC, r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    const rows = ((result.rows || []) as any[]).map((r: any) => ({
      id: r.id,
      fileId: r.file_id,
      accountNumber: r.account_number,
      holderName: r.holder_name,
      advisorRaw: r.advisor_raw,
      matchedContactId: r.matched_contact_id,
      matchedUserId: r.matched_user_id,
      matchStatus: r.match_status,
      isPreferred: r.is_preferred,
      conflictDetected: r.conflict_detected,
      rowCreatedAt: r.row_created_at,
      file: {
        id: r.file_id,
        broker: r.broker,
        originalFilename: r.original_filename,
        status: r.file_status,
        createdAt: r.file_created_at
      },
      contact: r.matched_contact_id ? {
        id: r.matched_contact_id,
        fullName: r.contact_name,
        firstName: r.contact_first_name,
        lastName: r.contact_last_name
      } : null,
      user: r.matched_user_id ? {
        id: r.matched_user_id,
        name: r.user_name,
        email: r.user_email
      } : null
    }));
    
    return res.json({
      ok: true,
      rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total
      }
    });
  } catch (error) {
    (req as any).log?.error?.({ err: error }, 'failed to get all rows');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// GET /admin/aum/rows/duplicates/:accountNumber - Get all rows with same account number
router.get('/rows/duplicates/:accountNumber', requireAuth, async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const dbi = db();
    
    const result = await dbi.execute(sql`
      SELECT 
        r.id,
        r.file_id,
        r.account_number,
        r.holder_name,
        r.advisor_raw,
        r.matched_contact_id,
        r.matched_user_id,
        r.match_status,
        r.is_preferred,
        r.conflict_detected,
        r.created_at as row_created_at,
        f.id as file_id,
        f.broker,
        f.original_filename,
        f.created_at as file_created_at,
        c.full_name as contact_name,
        u.first_name || ' ' || u.last_name as user_name
      FROM aum_import_rows r
      INNER JOIN aum_import_files f ON r.file_id = f.id
      LEFT JOIN contacts c ON r.matched_contact_id = c.id
      LEFT JOIN users u ON r.matched_user_id = u.id
      WHERE r.account_number = ${accountNumber}
      ORDER BY f.created_at DESC, r.created_at DESC
    `);
    
    const rows = ((result.rows || []) as any[]).map((r: any) => ({
      id: r.id,
      fileId: r.file_id,
      accountNumber: r.account_number,
      holderName: r.holder_name,
      advisorRaw: r.advisor_raw,
      matchedContactId: r.matched_contact_id,
      matchedUserId: r.matched_user_id,
      matchStatus: r.match_status,
      isPreferred: r.is_preferred,
      conflictDetected: r.conflict_detected,
      rowCreatedAt: r.row_created_at,
      file: {
        id: r.file_id,
        broker: r.broker,
        originalFilename: r.original_filename,
        createdAt: r.file_created_at
      },
      contact: r.matched_contact_id ? {
        id: r.matched_contact_id,
        fullName: r.contact_name
      } : null,
      user: r.matched_user_id ? {
        id: r.matched_user_id,
        name: r.user_name
      } : null
    }));
    
    return res.json({
      ok: true,
      accountNumber,
      rows,
      hasConflicts: rows.some(r => r.conflictDetected)
    });
  } catch (error) {
    (req as any).log?.error?.({ err: error, accountNumber: req.params.accountNumber }, 'failed to get duplicates');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
