import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// KRYROS — Cloudinary Media Migration Script
//
// Usage:
//   Dry run (scan only, no changes):
//     npx ts-node prisma/migrate-media.ts --dry-run
//
//   Live migration:
//     npx ts-node prisma/migrate-media.ts
//
// Requirements:
//   - DATABASE_URL env var (Prisma DB connection)
//   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars
//
// Safety:
//   - Already-Cloudinary URLs are ALWAYS skipped (idempotent — safe to re-run)
//   - Null / empty fields are skipped
//   - Each migration is logged to migration-report.json
//   - A record is only updated AFTER the Cloudinary upload succeeds
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 5;           // uploads per concurrent batch
const BATCH_DELAY_MS = 700;     // ms between batches (respect Cloudinary rate limits)

const LOG_FILE = path.join(__dirname, 'migration-report.json');

// ── Types ─────────────────────────────────────────────────────────────────────
type UrlType = 'base64' | 'external-url' | 'already-cloudinary' | 'null' | 'unknown';
type EntryStatus = 'skipped' | 'migrated' | 'error' | 'dry-run';

interface MigrationEntry {
  table: string;
  id: string | number;
  field: string;
  type: UrlType;
  preview?: string;
  newUrl?: string;
  status: EntryStatus;
  error?: string;
}

interface Report {
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  totalScanned: number;
  migrated: number;
  skipped: number;
  errors: number;
  entries: MigrationEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function classifyUrl(value: string | null | undefined): UrlType {
  if (!value || value.trim() === '') return 'null';
  if (value.startsWith('data:')) return 'base64';
  if (
    value.includes('res.cloudinary.com') ||
    value.includes('cloudinary.com/')
  ) return 'already-cloudinary';
  if (value.startsWith('http://') || value.startsWith('https://')) return 'external-url';
  // relative path or icon name — skip
  return 'unknown';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadToCloudinary(value: string, folder: string): Promise<string> {
  const result = await cloudinary.uploader.upload(value, {
    folder,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
}

function preview(s: string | null | undefined): string {
  if (!s) return '(null)';
  if (s.startsWith('data:')) {
    const approxKb = Math.round((s.length * 3) / 4 / 1024);
    return `[base64 ~${approxKb}KB]`;
  }
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
}

function log(msg: string) { process.stdout.write(msg + '\n'); }

// ── Task definition ───────────────────────────────────────────────────────────
interface Task {
  label: string;
  folder: string;
  fetch: (prisma: PrismaClient) => Promise<Array<Record<string, any>>>;
  fields: string[];
  updateRecord: (
    prisma: PrismaClient,
    id: string | number,
    field: string,
    newUrl: string,
  ) => Promise<void>;
}

function buildTasks(): Task[] {
  return [
    {
      label: 'product_images → url',
      folder: 'kryros/products',
      fetch: p => p.productImage.findMany({ select: { id: true, url: true } }),
      fields: ['url'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.productImage.update({ where: { id: id as string }, data: { url } })),
    },
    {
      label: 'categories → image, icon',
      folder: 'kryros/categories',
      fetch: p => p.category.findMany({ select: { id: true, image: true, icon: true } }),
      fields: ['image', 'icon'],
      updateRecord: async (p, id, field, url) =>
        void (await p.category.update({ where: { id: id as string }, data: { [field]: url } })),
    },
    {
      label: 'brands → logo',
      folder: 'kryros/brands',
      fetch: p => p.brand.findMany({ select: { id: true, logo: true } }),
      fields: ['logo'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.brand.update({ where: { id: id as number }, data: { logo: url } })),
    },
    {
      label: 'users → avatar',
      folder: 'kryros/avatars',
      fetch: p => p.user.findMany({ select: { id: true, avatar: true } }),
      fields: ['avatar'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.user.update({ where: { id: id as string }, data: { avatar: url } })),
    },
    {
      label: 'reviews → imageUrl',
      folder: 'kryros/reviews',
      fetch: p => p.review.findMany({ select: { id: true, imageUrl: true } }),
      fields: ['imageUrl'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.review.update({ where: { id: id as string }, data: { imageUrl: url } })),
    },
    {
      label: 'cms_banners → image',
      folder: 'kryros/cms/banners',
      fetch: p => p.cMSBanner.findMany({ select: { id: true, image: true } }),
      fields: ['image'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.cMSBanner.update({ where: { id: id as string }, data: { image: url } })),
    },
    {
      label: 'cms_brand_banners → imageUrl',
      folder: 'kryros/cms/brand-banners',
      fetch: p => p.cMSBrandBanner.findMany({ select: { id: true, imageUrl: true } }),
      fields: ['imageUrl'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.cMSBrandBanner.update({ where: { id: id as string }, data: { imageUrl: url } })),
    },
    {
      label: 'cms_sections → imageUrl',
      folder: 'kryros/cms/sections',
      fetch: p => p.cMSSection.findMany({ select: { id: true, imageUrl: true } }),
      fields: ['imageUrl'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.cMSSection.update({ where: { id: id as string }, data: { imageUrl: url } })),
    },
    {
      label: 'homepage_sections → imageUrl',
      folder: 'kryros/cms/homepage',
      fetch: p => p.homePageSection.findMany({ select: { id: true, imageUrl: true } }),
      fields: ['imageUrl'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.homePageSection.update({ where: { id: id as string }, data: { imageUrl: url } })),
    },
    {
      label: 'footer_config → logo, newsletterPopupImage',
      folder: 'kryros/cms/footer',
      fetch: p => p.footerConfig.findMany({
        select: { id: true, logo: true, newsletterPopupImage: true },
      }),
      fields: ['logo', 'newsletterPopupImage'],
      updateRecord: async (p, id, field, url) =>
        void (await p.footerConfig.update({ where: { id: id as string }, data: { [field]: url } })),
    },
    {
      label: 'services → image',
      folder: 'kryros/services',
      fetch: p => p.service.findMany({ select: { id: true, image: true } }),
      fields: ['image'],
      updateRecord: async (p, id, _f, url) =>
        void (await p.service.update({ where: { id: id as string }, data: { image: url } })),
    },
  ];
}

// ── Process a single task ─────────────────────────────────────────────────────
async function processTask(
  prisma: PrismaClient,
  task: Task,
  report: Report,
): Promise<void> {
  log(`\n📂  ${task.label}`);

  const records = await task.fetch(prisma);

  // Flatten to (record, field, value) pairs
  const items = records.flatMap(rec =>
    task.fields.map(field => ({ rec, field, value: rec[field] as string | null | undefined })),
  );

  let taskMigrated = 0, taskSkipped = 0, taskErrors = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async ({ rec, field, value }) => {
        report.totalScanned++;
        const type = classifyUrl(value);
        const entry: MigrationEntry = {
          table: task.label,
          id: rec.id,
          field,
          type,
          preview: preview(value),
          status: 'skipped',
        };

        // Already on Cloudinary / null / unknown — skip safely
        if (type === 'null' || type === 'already-cloudinary' || type === 'unknown') {
          entry.status = 'skipped';
          taskSkipped++;
          report.skipped++;
          report.entries.push(entry);
          return;
        }

        // Dry-run: just report what we would do
        if (DRY_RUN) {
          entry.status = 'dry-run';
          taskMigrated++;
          log(`    [DRY-RUN] ${type.padEnd(12)} id:${rec.id}  .${field}  =  ${preview(value)}`);
          report.entries.push(entry);
          return;
        }

        // Live: upload → update DB atomically
        try {
          const newUrl = await uploadToCloudinary(value!, task.folder);
          await task.updateRecord(prisma, rec.id, field, newUrl);
          entry.newUrl = newUrl;
          entry.status = 'migrated';
          taskMigrated++;
          report.migrated++;
          log(`    ✅  id:${rec.id}  .${field}  →  ${preview(newUrl)}`);
        } catch (err: unknown) {
          // Cloudinary SDK throws plain objects {message, http_code} — not Error instances.
          // JSON.stringify gives us the real error message.
          let msg: string;
          if (err instanceof Error) {
            msg = err.message;
          } else if (err && typeof err === 'object' && 'message' in err) {
            // Cloudinary-style error object: { message: '...', http_code: NNN }
            const errObj = err as Record<string, unknown>;
            msg = String(errObj.message);
            if (errObj.http_code) msg += ` (HTTP ${errObj.http_code})`;
          } else {
            msg = JSON.stringify(err);
          }
          entry.status = 'error';
          entry.error = msg;
          taskErrors++;
          report.errors++;
          log(`    ❌  id:${rec.id}  .${field}  ERROR: ${msg}`);
          // On the FIRST error per table, dump the full error object so we can diagnose
          if (taskErrors === 1) {
            log(`       [DEBUG] Full error: ${JSON.stringify(err)}`);
          }
        }

        report.entries.push(entry);
      }),
    );

    // Throttle between batches to stay within Cloudinary rate limits
    if (i + BATCH_SIZE < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  log(`    → migrated: ${taskMigrated}  |  skipped: ${taskSkipped}  |  errors: ${taskErrors}`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  log('\n' + '═'.repeat(62));
  log(`  KRYROS Cloudinary Media Migration`);
  log(`  Mode: ${DRY_RUN ? '⚠  DRY RUN — no changes will be made' : '🚀 LIVE — database will be updated'}`);
  log('═'.repeat(62));

  // Validate env vars
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .filter(k => !process.env[k]);
  if (missing.length) {
    log(`\n❌  Missing env vars: ${missing.join(', ')}`);
    log('   Add them to your .env file or Render environment before running.\n');
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
  });

  const prisma = new PrismaClient();
  const report: Report = {
    startedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    totalScanned: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    entries: [],
  };

  try {
    for (const task of buildTasks()) {
      await processTask(prisma, task, report);
    }
  } finally {
    await prisma.$disconnect();
  }

  report.finishedAt = new Date().toISOString();

  // ── Print summary ─────────────────────────────────────────────────────────
  log('\n' + '═'.repeat(62));
  log('  SUMMARY');
  log('═'.repeat(62));
  log(`  Total scanned  : ${report.totalScanned}`);
  if (DRY_RUN) {
    const wouldMigrate = report.entries.filter(e => e.status === 'dry-run').length;
    const byType: Record<string, number> = {};
    report.entries.filter(e => e.status === 'dry-run').forEach(e => {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
    });
    log(`  Would migrate  : ${wouldMigrate}`);
    Object.entries(byType).forEach(([t, n]) => log(`    - ${t}: ${n}`));
    log(`  Would skip     : ${report.skipped}  (null or already on Cloudinary)`);
    log('');
    log('  Run without --dry-run to execute the migration.');
  } else {
    log(`  Migrated       : ${report.migrated}`);
    log(`  Skipped        : ${report.skipped}  (null or already on Cloudinary)`);
    log(`  Errors         : ${report.errors}`);
  }
  log('');

  // Save report
  fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2));
  log(`📋  Report saved → ${LOG_FILE}`);

  if (report.errors > 0) {
    log(`\n⚠   ${report.errors} error(s) occurred. Check migration-report.json for details.\n`);
    process.exit(1);
  } else if (!DRY_RUN && report.migrated === 0) {
    log('\n✅  Nothing to migrate — all images are already on Cloudinary!\n');
  } else if (!DRY_RUN) {
    log(`\n✅  Migration complete! ${report.migrated} image(s) moved to Cloudinary.\n`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
