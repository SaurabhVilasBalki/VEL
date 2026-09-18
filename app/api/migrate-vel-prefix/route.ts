import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/migrate-vel-prefix?secret=YOUR_SEED_SECRET
 *
 * One-time fix for databases seeded before IDs were prefixed with "VEL-".
 * Renames every row whose id is bare digits (e.g. "3229") to "VEL-3229".
 * Safe to call more than once — rows that already have a prefix are left
 * untouched, since the WHERE clause only matches pure-digit ids.
 *
 * Run this BEFORE importing any other product's test cases (e.g. HMB-*),
 * so IDs from different products never collide.
 */
export async function POST(req: NextRequest) {
  const configuredSecret = process.env.SEED_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Set the SEED_SECRET environment variable in your Vercel project first." },
      { status: 500 }
    );
  }

  const providedSecret = req.nextUrl.searchParams.get("secret");
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Invalid or missing secret" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const result = await sql`
      UPDATE test_cases
      SET id = 'VEL-' || id, updated_at = now()
      WHERE id ~ '^[0-9]+$'
    `;
    return NextResponse.json({ ok: true, renamed: result.rowCount ?? 0 });
  } catch (err) {
    console.error("POST /api/migrate-vel-prefix failed:", err);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
