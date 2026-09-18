/**
 * One-time import of data/seed.json into the Postgres database.
 *
 * Usage:
 *   1. vercel env pull .env.local      (pulls POSTGRES_URL etc. from your Vercel project)
 *   2. npm install
 *   3. npm run seed
 *
 * Safe to re-run — existing IDs are skipped via ON CONFLICT DO NOTHING.
 */
import { sql } from "@vercel/postgres";
import seedData from "../data/seed.json";

type SeedRow = {
  id: string;
  title: string;
  status: string;
  automation: string;
  author: string;
  automationPickedBy: string;
  automationId: string;
  automatedBy: string;
  automationMergedDate: string;
};

async function main() {
  console.log(`Seeding ${seedData.length} test cases...`);

  await sql`
    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not-set',
      automation TEXT NOT NULL DEFAULT 'not-set',
      author TEXT NOT NULL DEFAULT '',
      automation_picked_by TEXT NOT NULL DEFAULT '',
      automation_id TEXT NOT NULL DEFAULT '',
      automated_by TEXT NOT NULL DEFAULT '',
      automation_merged_date TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const rows = seedData as SeedRow[];
  let inserted = 0;
  let skipped = 0;

  const BATCH_SIZE = 25;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((row) =>
        sql`
          INSERT INTO test_cases (
            id, title, status, automation, author,
            automation_picked_by, automation_id, automated_by, automation_merged_date
          ) VALUES (
            ${row.id}, ${row.title}, ${row.status}, ${row.automation}, ${row.author},
            ${row.automationPickedBy}, ${row.automationId}, ${row.automatedBy}, ${row.automationMergedDate}
          )
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `
      )
    );
    for (const r of results) {
      if (r.rowCount && r.rowCount > 0) inserted++;
      else skipped++;
    }
    process.stdout.write(`\r${i + batch.length}/${rows.length} processed`);
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already existed).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
