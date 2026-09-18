import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import hmbData from "@/data/hmb-seed.json";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

/**
 * POST /api/seed-hmb?secret=YOUR_SEED_SECRET
 *
 * One-time import of data/hmb-seed.json (1,255 HMB test cases, IDs prefixed
 * "HMB-") into the database, alongside the existing VEL-* test cases.
 * Skips rows whose ID already exists, so it's safe to call more than once.
 *
 * Run /api/migrate-vel-prefix first if your existing VEL rows still have
 * bare-numeric IDs, so nothing collides with the HMB- prefixed IDs here.
 */
export async function POST(req: NextRequest) {
  const configuredSecret = process.env.SEED_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Set the SEED_SECRET environment variable in your Vercel project before seeding." },
      { status: 500 }
    );
  }

  const providedSecret = req.nextUrl.searchParams.get("secret");
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Invalid or missing secret" }, { status: 401 });
  }

  try {
    await ensureSchema();

    const rows = hmbData as SeedRow[];
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
    }

    return NextResponse.json({ ok: true, inserted, skipped, total: rows.length });
  } catch (err) {
    console.error("POST /api/seed-hmb failed:", err);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
