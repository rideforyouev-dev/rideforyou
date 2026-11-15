import { createHash, randomUUID } from "node:crypto";
import { normalizePhone } from "../../auth.mjs";
import { fail, text } from "../../core/validation.mjs";
import { transaction } from "../../core/transactions.mjs";
import { marketingConfig, sendMarketing } from "./provider.mjs";

const now = () => new Date().toISOString();
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const imageUrl = (basePath, id) => id ? `${basePath}/campaign-media/${id}` : null;

export function campaignMedia(db, app) {
  // Random media IDs expose only the flyer, never customer data. The provider
  // needs a publicly accessible image URL; login cookies must not be required.
  app.get("/campaign-media/:id", (req, res) => {
    if (!/^[a-f0-9-]{36}$/.test(req.params.id)) return res.sendStatus(404);
    const image = db.prepare("SELECT mime,bytes FROM marketing_images WHERE id=?").get(req.params.id);
    if (!image) return res.sendStatus(404);
    res.type(image.mime).set("Content-Disposition", "inline").send(Buffer.from(image.bytes));
  });
}

function saveImage(db, value) {
  if (typeof value !== "string" || value.length > 2_800_000) fail("Choose a JPG or PNG image up to 2 MB.");
  const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) fail("Choose a JPG or PNG image.");
  const bytes = Buffer.from(match[2], "base64");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || !(match[1] === "image/png" ? png : jpeg)) fail("The image content does not match a JPG or PNG file.");
  const id = randomUUID();
  db.prepare("INSERT INTO marketing_images VALUES(?,?,?,?)").run(id, match[1], bytes, now());
  return id;
}

export function marketingRoutes(db, app, { config = marketingConfig(), autoStart = true } = {}) {
  const getCampaign = (id) => db.prepare("SELECT * FROM marketing_campaigns WHERE id=?").get(id) || fail("Campaign not found.", 404);
  const counts = (id) => Object.fromEntries(db.prepare("SELECT status,COUNT(*) n FROM marketing_recipients WHERE campaign_id=? GROUP BY status").all(id).map(r => [r.status,r.n]));
  const campaignView = (row) => ({ ...row, imageUrl: imageUrl(config.basePath, row.image_id), counts: counts(row.id) });
  const audience = () => db.prepare("SELECT id,name,phone,updated FROM marketing_customers WHERE subscribed=1 ORDER BY phone").all();
  const review = (row) => {
    const recipients = audience();
    return { recipients, count: recipients.length, reviewHash: digest([row, recipients, config.textTemplate, config.imageTemplate, config.language]), campaign: campaignView(row) };
  };
  const ready = (row) => {
    if (!config.ready) fail("WhatsApp sending is not configured. " + config.reasons.join(" "), 503);
    if (row.image_id && !config.mediaReady) fail("Set a public HTTPS PUBLIC_ORIGIN before sending an image campaign.", 503);
  };
  app.get("/api/marketing/config", (_req, res) => res.json({ ready: config.ready, mediaReady: config.mediaReady, reasons: config.reasons, textTemplate: config.textTemplate, imageTemplate: config.imageTemplate, language: config.language }));
  app.get("/api/customers", (_req, res) => res.json(db.prepare("SELECT * FROM marketing_customers ORDER BY created DESC,id").all()));
  const saveCustomer = (req, res) => {
    const old = req.params.id ? db.prepare("SELECT * FROM marketing_customers WHERE id=?").get(req.params.id) : null;
    if (req.params.id && !old) fail("Customer not found.",404);
    const name = text(req.body.name,"customer name",150), phone = normalizePhone(req.body.phone);
    if (!phone) fail("Enter a valid Indian mobile number, e.g. +91 98765 43210.");
    if (typeof req.body.subscribed !== "boolean") fail("Choose the customer's promotion preference.");
    const subscribed = Number(req.body.subscribed), consentNote = text(req.body.consentNote,"permission source",500,!!subscribed), notes = text(req.body.notes,"notes",1500,false);
    if (old && old.phone !== phone && subscribed && consentNote === old.consent_note)
      fail("Record fresh permission for the new mobile number, or leave promotions unchecked.");
    const duplicate = db.prepare("SELECT id FROM marketing_customers WHERE phone=?").get(phone);
    if (duplicate && duplicate.id !== old?.id) fail("A customer with this mobile number already exists.",409);
    const id = old?.id || randomUUID(), date = now();
    transaction(db, () => {
      if (old) db.prepare("UPDATE marketing_customers SET name=?,phone=?,subscribed=?,consent_note=?,notes=?,updated=? WHERE id=?").run(name,phone,subscribed,consentNote,notes,date,id);
      else db.prepare("INSERT INTO marketing_customers VALUES(?,?,?,?,?,?,?,?)").run(id,name,phone,subscribed,consentNote,notes,date,date);
      if (!old || old.subscribed !== subscribed || old.phone !== phone || old.consent_note !== consentNote)
        db.prepare("INSERT INTO marketing_contact_events VALUES(?,?,?,?,?,?)").run(randomUUID(),id,subscribed,`${phone}: ${consentNote || 'Not subscribed'}`,req.sessionToken,date);
    });
    res.json({ id });
  };
  app.post("/api/customers",saveCustomer);
  app.put("/api/customers/:id",saveCustomer);
  app.post("/api/customers/import-invoices", (req,res) => {
    let imported = 0, skipped = 0;
    transaction(db, () => {
      for (const row of db.prepare("SELECT body FROM invoices ORDER BY created").all()) {
        const customer = JSON.parse(row.body).customer, phone = normalizePhone(customer?.phone);
        if (!phone || !customer?.name) { skipped++; continue; }
        const date = now();
        const result = db.prepare("INSERT OR IGNORE INTO marketing_customers VALUES(?,?,?,0,'',?,?,?)").run(randomUUID(),String(customer.name).slice(0,150),phone,"Imported from invoice; marketing permission has not been recorded.",date,date);
        if (result.changes) imported++; else skipped++;
      }
    });
    res.json({imported,skipped});
  });
  app.get("/api/campaigns", (_req,res) => res.json(db.prepare("SELECT * FROM marketing_campaigns ORDER BY created DESC,id").all().map(campaignView)));
  app.get("/api/campaigns/:id", (req,res) => res.json({ ...campaignView(getCampaign(req.params.id)), recipients: db.prepare("SELECT id,name,phone,status,provider_id,detail,updated FROM marketing_recipients WHERE campaign_id=? ORDER BY phone").all(req.params.id) }));
  const saveCampaign = (req,res) => {
    const old = req.params.id ? getCampaign(req.params.id) : null;
    if (old && old.status !== "draft") fail("Queued campaigns cannot be edited. Create a new campaign.",409);
    const title = text(req.body.title,"campaign name",150), message = text(req.body.message,"message",900);
    const id = old?.id || randomUUID(), date = now();
    transaction(db, () => {
      let imageId = req.body.removeImage ? null : old?.image_id || null;
      if (req.body.image) imageId = saveImage(db,req.body.image);
      if (old) db.prepare("UPDATE marketing_campaigns SET title=?,message=?,image_id=?,updated=? WHERE id=?").run(title,message,imageId,date,id);
      else db.prepare("INSERT INTO marketing_campaigns(id,title,message,image_id,created,updated) VALUES(?,?,?,?,?,?)").run(id,title,message,imageId,date,date);
    });
    res.json({ id });
  };
  app.post("/api/campaigns",saveCampaign);
  app.put("/api/campaigns/:id",saveCampaign);
  app.post("/api/campaigns/:id/review", (req,res) => {
    const row = getCampaign(req.params.id);
    if (row.status !== "draft") fail("This campaign has already been queued.",409);
    res.json(review(row));
  });
  app.post("/api/campaigns/:id/send", (req,res) => {
    const key = text(req.body.requestKey,"send request key",80), reviewHash = text(req.body.reviewHash,"recipient review",64);
    const result = transaction(db, () => {
      const row = getCampaign(req.params.id);
      if (row.request_key === key && row.review_hash === reviewHash) return campaignView(row);
      if (row.status !== "draft") fail("This campaign was already queued. Open its results instead of resending.",409);
      if (db.prepare("SELECT id FROM marketing_campaigns WHERE request_key=?").get(key)) fail("This send request was already used.",409);
      ready(row);
      const current = review(row);
      if (reviewHash !== current.reviewHash) fail("The message or customer list changed. Review recipients again.",409);
      if (!current.count) fail("No customers have permission recorded for promotions.");
      if (current.count > 10000) fail("Limit a campaign to 10,000 customers.");
      const date = now();
      for (const person of current.recipients) db.prepare("INSERT INTO marketing_recipients(id,campaign_id,customer_id,name,phone,updated) VALUES(?,?,?,?,?,?)").run(randomUUID(),row.id,person.id,person.name,person.phone,date);
      db.prepare("UPDATE marketing_campaigns SET status='queued',template=?,language=?,request_key=?,review_hash=?,updated=? WHERE id=?").run(row.image_id ? config.imageTemplate : config.textTemplate,config.language,key,reviewHash,date,row.id);
      return campaignView(getCampaign(row.id));
    });
    res.json(result);
  });
  app.post("/api/campaigns/:id/cancel", (req,res) => {
    transaction(db, () => {
      const row = getCampaign(req.params.id);
      if (row.status !== "queued") fail("Only a queued campaign can be stopped.");
      db.prepare("UPDATE marketing_campaigns SET status='cancelled',updated=? WHERE id=?").run(now(),row.id);
      db.prepare("UPDATE marketing_recipients SET status='skipped',detail='Campaign stopped by owner.',updated=? WHERE campaign_id=? AND status='pending'").run(now(),row.id);
    });
    res.json({ok:true});
  });

  // Crash recovery preserves pending work but never repeats an in-flight send.
  db.prepare("UPDATE marketing_recipients SET status='unknown',detail='Process restarted during send. Check provider logs before resending.',updated=? WHERE status='sending'").run(now());
  let busy = false, stopped = false;
  const tick = async () => {
    if (busy || stopped || !config.ready) return;
    busy = true;
    try {
      const item = transaction(db, () => {
        const recipient = db.prepare("SELECT r.* FROM marketing_recipients r JOIN marketing_campaigns c ON c.id=r.campaign_id WHERE r.status='pending' AND c.status='queued' ORDER BY c.created,r.phone LIMIT 1").get();
        if (!recipient) return null;
        const customer = db.prepare("SELECT subscribed,phone FROM marketing_customers WHERE id=?").get(recipient.customer_id);
        if (!customer?.subscribed || customer.phone !== recipient.phone) {
          db.prepare("UPDATE marketing_recipients SET status='skipped',detail='Customer unsubscribed or mobile number changed.',updated=? WHERE id=?").run(now(),recipient.id);
          return null;
        }
        const campaign = getCampaign(recipient.campaign_id);
        if (campaign.image_id && !config.mediaReady) return null;
        db.prepare("UPDATE marketing_recipients SET status='sending',updated=? WHERE id=?").run(now(),recipient.id);
        return {recipient,campaign};
      });
      if (item) {
        const result = await sendMarketing(config,item.recipient,item.campaign);
        db.prepare("UPDATE marketing_recipients SET status=?,provider_id=?,detail=?,updated=? WHERE id=?").run(result.status,result.providerId || null,result.detail,now(),item.recipient.id);
      }
      db.prepare("UPDATE marketing_campaigns SET status='completed',updated=? WHERE status='queued' AND NOT EXISTS(SELECT 1 FROM marketing_recipients r WHERE r.campaign_id=marketing_campaigns.id AND r.status IN ('pending','sending'))").run(now());
    } catch { console.error("Marketing queue paused on a processing error; no automatic resend of in-flight messages."); }
    finally { busy = false; }
  };
  const timer = autoStart ? setInterval(tick, config.test ? 40 : 1000) : null;
  timer?.unref();
  return { stop: () => { stopped = true; clearInterval(timer); }, tick };
}
