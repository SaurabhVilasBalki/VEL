import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, rowToTestCase } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLUMN_MAP: Record<string, string> = {
  title: "title",
  status: "status",
  automation: "automation",
  author: "author",
  automationPickedBy: "automation_picked_by",
  automationId: "automation_id",
  automatedBy: "automated_by",
  automationMergedDate: "automation_merged_date",
};

// PATCH /api/testcases/[id] — partial update. Include `id` in the body to rename
// the test case's ID (rejected with 409 if the new ID is already taken).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema();
    const currentId = params.id;
    const body = await req.json();

    // Handle ID rename separately, since it's the primary key.
    if (typeof body.id === "string" && body.id.trim() && body.id.trim() !== currentId) {
      const newId = body.id.trim();
      const existing = await sql`SELECT 1 FROM test_cases WHERE id = ${newId}`;
      if (existing.rowCount && existing.rowCount > 0) {
        return NextResponse.json({ error: "That ID is already in use" }, { status: 409 });
      }
      const { rows } = await sql`
        UPDATE test_cases SET id = ${newId}, updated_at = now()
        WHERE id = ${currentId}
        RETURNING *
      `;
      if (rows.length === 0) {
        return NextResponse.json({ error: "Test case not found" }, { status: 404 });
      }
      return NextResponse.json(rowToTestCase(rows[0]));
    }

    // Build a dynamic SET clause for whichever fields were provided.
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, column] of Object.entries(COLUMN_MAP)) {
      if (key in body) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(body[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    setClauses.push(`updated_at = now()`);
    values.push(currentId);

    const query = `
      UPDATE test_cases SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const { rows } = await sql.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }
    return NextResponse.json(rowToTestCase(rows[0]));
  } catch (err) {
    console.error(`PATCH /api/testcases/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update test case" }, { status: 500 });
  }
}

// DELETE /api/testcases/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema();
    await sql`DELETE FROM test_cases WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/testcases/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete test case" }, { status: 500 });
  }
}
