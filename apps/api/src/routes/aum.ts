import { Router } from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { Request } from 'express';
import { db, aumImportFiles, aumImportRows, brokerAccounts, contacts, users } from '@cactus/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessAumFile, getUserAccessScope } from '../auth/authorization';

const router = Router();

// AI_DECISION: Guardar uploads en FS local bajo apps/api/uploads y registrar metadata en DB
// Justificación: Simplicidad y trazabilidad en MVP; mover a S3 en el futuro si es necesario
// Impacto: Nuevo endpoint y archivos temporales controlados

const uploadDir = join(process.cwd(), 'apps', 'api', 'uploads');
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
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

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
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

    const broker = (req.query.broker as string) || 'balanz';
    const dbi = db();

    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const rows = await dbi.select().from(aumImportRows)
      .where(and(eq(aumImportRows.fileId, fileId), eq(aumImportRows.matchStatus, 'matched')));

    let upserts = 0;
    for (const r of rows) {
      if (!r.accountNumber || !r.matchedContactId) continue;

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

    return res.json({ ok: true, upserts });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});


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
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    return json.map((r) => ({
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
    const [fileRow] = await dbi.insert(aumImportFiles).values({
      broker,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedByUserId: userId,
      status: 'uploaded'
    }).returning();

    // Parse file to rows
    const parsedRows = await parseFileToRows(file.path, file.originalname);

    let matched = 0;
    const rowsToInsert: any[] = [];
    for (const r of parsedRows) {
      let matchedContactId: string | null = null;
      let matchedUserId: string | null = null;
      let matchStatus: 'matched' | 'ambiguous' | 'unmatched' = 'unmatched';

      // Pre-match by broker account number (raw SQL for robustness)
      if (r.accountNumber) {
        try {
          const res = await dbi.execute(sql`SELECT contact_id FROM broker_accounts WHERE broker = ${broker} AND account_number = ${r.accountNumber} LIMIT 1`);
          const row = (res.rows && res.rows[0]) as any;
          if (row && row.contact_id) {
            matchedContactId = row.contact_id as string;
          }
        } catch {}
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

      if (matchedContactId) {
        matchStatus = 'matched';
        matched += 1;
      }

      rowsToInsert.push({
        fileId: fileRow.id,
        raw: r.raw,
        accountNumber: r.accountNumber,
        holderName: r.holderName,
        advisorRaw: r.advisorRaw,
        matchedContactId,
        matchedUserId,
        matchStatus
      });
    }

    // Insert rows in batches
    const batchSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const chunk = rowsToInsert.slice(i, i + batchSize);
      await dbi.insert(aumImportRows).values(chunk);
    }

    // Update file totals
    await dbi.update(aumImportFiles)
      .set({
        status: 'parsed',
        totalParsed: rowsToInsert.length,
        totalMatched: matched,
        totalUnmatched: rowsToInsert.length - matched
      })
      .where(eq(aumImportFiles.id, fileRow.id));

    return res.status(201).json({
      ok: true,
      fileId: fileRow.id,
      filename: file.originalname,
      totals: {
        parsed: rowsToInsert.length,
        matched,
        unmatched: rowsToInsert.length - matched
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
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

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
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(Number(req.query.limit || 50), 200);
    const dbi = db();

    // Filter files based on user role and access scope
    let whereClause;
    if (userRole === 'admin') {
      // Admin can see all files
      whereClause = undefined; // No filter
    } else if (userRole === 'advisor') {
      // Advisor can only see their own files
      whereClause = eq(aumImportFiles.uploadedByUserId, userId);
    } else if (userRole === 'manager') {
      // Manager can see files from themselves and their team members
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessibleUserIds = [...new Set([...accessScope.accessibleAdvisorIds, userId])];
      whereClause = inArray(aumImportFiles.uploadedByUserId, accessibleUserIds);
    } else {
      // Unknown role - no access
      return res.json({ ok: true, files: [] });
    }

    const rows = whereClause
      ? await dbi.select().from(aumImportFiles).where(whereClause).limit(limit)
      : await dbi.select().from(aumImportFiles).limit(limit);

    return res.json({ ok: true, files: rows });
  } catch (error) {
    (req as any).log?.error?.({ err: error }, 'AUM history failed');
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /admin/aum/uploads/:fileId/match
router.post('/uploads/:fileId/match', requireAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this file
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { rowId, matchedContactId, matchedUserId } = req.body as {
      rowId: string;
      matchedContactId?: string | null;
      matchedUserId?: string | null;
    };
    if (!rowId) return res.status(400).json({ error: 'rowId is required' });

    const dbi = db();
    // Ensure file exists
    const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Update row matching
    const newStatus = matchedContactId ? 'matched' : 'unmatched';
    await dbi.update(aumImportRows)
      .set({
        matchedContactId: matchedContactId ?? null,
        matchedUserId: matchedUserId ?? null,
        matchStatus: newStatus
      })
      .where(and(eq(aumImportRows.id, rowId), eq(aumImportRows.fileId, fileId)));

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

export default router;
