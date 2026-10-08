const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { manilaToday, daysUntil, STAGES, toLocal, buildMessage } = require('./lib');

admin.initializeApp();
const SEMAPHORE_API_KEY = defineSecret('SEMAPHORE_API_KEY');

async function sendSms(number, message) {
  const body = new URLSearchParams({ apikey: SEMAPHORE_API_KEY.value(), number, message });
  // Optional: only set this once Semaphore has approved your sender name.
  if (process.env.SMS_SENDER_NAME) body.set('sendername', process.env.SMS_SENDER_NAME);
  const r = await fetch('https://api.semaphore.co/api/v4/messages', { method: 'POST', body });
  if (!r.ok) throw new Error(`Semaphore ${r.status}: ${await r.text()}`);
}

// Runs every day at 9:00 AM Philippine time.
exports.sendRentReminders = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Manila', region: 'asia-southeast1', secrets: [SEMAPHORE_API_KEY] },
  async () => {
    const db = admin.firestore();
    const today = manilaToday();
    const dry = process.env.SMS_DRY_RUN === 'true';
    const units = await db.collection('units').get();
    let sent = 0;

    for (const snap of units.docs) {
      const u = snap.data();
      if (!u.tenantUid || u.paid || u.sms === false || !u.due) continue;

      const d = daysUntil(u.due, today);
      if (!STAGES.includes(d)) continue;

      // Number: the one saved on the unit, else the one the tenant gave at registration.
      let phone = u.phone;
      if (!phone) {
        const t = await db.doc(`users/${u.tenantUid}`).get();
        phone = t.exists ? t.data().phone : '';
      }
      const number = toLocal(phone);
      if (!number) { logger.warn(`Unit ${u.unit}: no valid mobile number, skipped`); continue; }

      // Skip if the tenant already reported a payment that is waiting for the owner.
      const rep = await db.doc(`paymentReports/${snap.id}_${u.due.slice(0, 7)}`).get();
      if (rep.exists && rep.data().status === 'pending') continue;

      const message = buildMessage(u, d);
      if (dry) { logger.info(`[DRY RUN] ${u.unit} -> ${number}: ${message}`); continue; }

      // create() fails if it already exists, so each reminder is sent only once.
      const log = db.doc(`smsLog/${snap.id}_${u.due}_${d}`);
      try {
        await log.create({ unit: u.unit, due: u.due, stage: d, sentAt: admin.firestore.FieldValue.serverTimestamp() });
      } catch (e) { continue; }

      try {
        await sendSms(number, message);
        sent++;
      } catch (e) {
        logger.error(`Unit ${u.unit}: SMS failed`, e);
        await log.delete().catch(() => {});
      }
    }
    logger.info(`Rent reminders done: ${sent} sent for ${today}`);
  }
);
