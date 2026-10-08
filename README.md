# Apartment rent app: setup and hardening

## 1. Deploy
1. Create a Firebase project; enable **Authentication** (Email/Password) and **Firestore**.
2. Paste your Firebase config and owner email(s) into `appartment.html` (`OWNER EMAIL(S)` section).
3. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`). **Test in the emulator first and compare with your current rules**; it is a starting point built from the collections the app uses (`users, ids, units, payments, paymentReports, messages, reads, maintenance`).
4. Host the file (Firebase Hosting) over HTTPS.

## 2. Security checklist
- **Owner access:** prefer a custom claim over the hardcoded email: with the Admin SDK run `setCustomUserClaims(uid,{owner:true})`; the rules already accept it.
- **App Check:** Firebase console > App Check > register the web app with reCAPTCHA Enterprise, then enforce it for Firestore.
- **Backups:** schedule daily exports, e.g. `gcloud firestore export gs://YOUR_BUCKET/backups/$(date +%F)` from Cloud Scheduler, and set a bucket lifecycle rule.
- **Indexes:** if the console asks for one when you first open a page, use the link in the error.
- **Privacy (RA 10173):** the app now asks for consent before an ID is uploaded and stores `consentAt`. Delete a tenant's ID photo (`ids/{uid}`) after their tenancy ends.

## 3. Not built yet (needs accounts, servers or a larger rewrite)
| Item | What it needs |
|---|---|
| Online payments (GCash, Maya, card) | PayMongo or Xendit account + Cloud Functions webhook to mark rent paid |
| Push/SMS/email reminders | Cloud Functions on a schedule + FCM or an SMS provider |
| Photos in Firebase Storage | Storage bucket + rules; replace the `data:` image fields |
| Multiple properties, leases, utilities, reports | New data model (`properties`, `leases`) |
| Audit log | Cloud Function triggers writing to an `audit` collection |
| Modules and tests | Split into files; unit-test late fee, next due date and paid lock |
| Filipino language | Move UI text into a translation table |
