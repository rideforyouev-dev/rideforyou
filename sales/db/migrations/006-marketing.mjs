import { mkdirSync } from "node:fs";
import path from "node:path";
import { transaction } from "../../core/transactions.mjs";

export function upgradeMarketing(db, { backupPath } = {}) {
  if (db.prepare("SELECT 1 FROM app_meta WHERE key='marketing-v1'").get()) return;
  if (backupPath) {
    mkdirSync(path.dirname(backupPath), { recursive: true });
    db.prepare("VACUUM INTO ?").run(backupPath);
  }
  transaction(db, () => {
    db.exec(`
      CREATE TABLE marketing_customers(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
        subscribed INTEGER NOT NULL DEFAULT 0 CHECK(subscribed IN (0,1)),
        consent_note TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        created TEXT NOT NULL, updated TEXT NOT NULL
      );
      CREATE TABLE marketing_contact_events(
        id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES marketing_customers(id),
        subscribed INTEGER NOT NULL, note TEXT NOT NULL, actor TEXT NOT NULL, created TEXT NOT NULL
      );
      CREATE TABLE marketing_images(
        id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL, created TEXT NOT NULL
      );
      CREATE TABLE marketing_campaigns(
        id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, image_id TEXT REFERENCES marketing_images(id),
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued','completed','cancelled')),
        template TEXT, language TEXT, request_key TEXT UNIQUE, review_hash TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
      );
      CREATE TABLE marketing_recipients(
        id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id),
        customer_id TEXT NOT NULL REFERENCES marketing_customers(id), name TEXT NOT NULL, phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','failed','unknown','skipped')),
        provider_id TEXT, detail TEXT NOT NULL DEFAULT '', updated TEXT NOT NULL,
        UNIQUE(campaign_id,phone)
      );
      CREATE INDEX marketing_outbox ON marketing_recipients(status, campaign_id);
      INSERT INTO app_meta VALUES('marketing-v1','enabled');
    `);
  });
}
