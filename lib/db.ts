import { sql } from "@vercel/postgres";

export type TestCase = {
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

let schemaReady: Promise<void> | null = null;

/**
 * Creates the test_cases table if it doesn't already exist.
 * Safe to call on every request — CREATE TABLE IF NOT EXISTS is idempotent.
 * Cached per server instance so we don't re-check on every call.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
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
    `.then(() => undefined);
  }
  return schemaReady;
}

// Row shape as returned by Postgres (snake_case columns)
type DbRow = {
  id: string;
  title: string;
  status: string;
  automation: string;
  author: string;
  automation_picked_by: string;
  automation_id: string;
  automated_by: string;
  automation_merged_date: string;
};

export function rowToTestCase(row: Record<string, any>): TestCase {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    automation: row.automation,
    author: row.author,
    automationPickedBy: row.automation_picked_by,
    automationId: row.automation_id,
    automatedBy: row.automated_by,
    automationMergedDate: row.automation_merged_date,
  };
}
