import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, rowToTestCase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/testcases — list every test case, sorted numerically by id where possible
export async function GET() {
  try {
    await ensureSchema();
    const { rows } = await sql`
      SELECT * FROM test_cases
      ORDER BY
        CASE WHEN id ~ '^[0-9]+$' THEN 0 ELSE 1 END,
        (CASE WHEN id ~ '^[0-9]+$' THEN id::int ELSE 0 END),
        id
    `;
    return NextResponse.json(rows.map(rowToTestCase));
  } catch (err) {
    console.error("GET /api/testcases failed:", err);
    return NextResponse.json({ error: "Failed to load test cases" }, { status: 500 });
  }
}

// POST /api/testcases — create a new test case. Body may include an explicit `id`;
// if omitted (or blank), the next available numeric id is assigned.
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();
    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let id = (body.id ?? "").toString().trim();
    if (!id) {
      const { rows } = await sql`
        SELECT COALESCE(MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::int ELSE 0 END), 0) + 1 AS next_id
        FROM test_cases
      `;
      id = String(rows[0].next_id);
    } else {
      const existing = await sql`SELECT 1 FROM test_cases WHERE id = ${id}`;
      if (existing.rowCount && existing.rowCount > 0) {
        return NextResponse.json({ error: "That ID is already in use" }, { status: 409 });
      }
    }

    const status = body.status ?? "not-set";
    const automation = body.automation ?? "not-set";
    const author = body.author ?? "";
    const automationPickedBy = body.automationPickedBy ?? "";
    const automationId = body.automationId ?? "";
    const automatedBy = body.automatedBy ?? "";
    const automationMergedDate = body.automationMergedDate ?? "";

    const { rows } = await sql`
      INSERT INTO test_cases (
        id, title, status, automation, author,
        automation_picked_by, automation_id, automated_by, automation_merged_date
      ) VALUES (
        ${id}, ${title}, ${status}, ${automation}, ${author},
        ${automationPickedBy}, ${automationId}, ${automatedBy}, ${automationMergedDate}
      )
      RETURNING *
    `;

    return NextResponse.json(rowToTestCase(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/testcases failed:", err);
    return NextResponse.json({ error: "Failed to create test case" }, { status: 500 });
  }
}
