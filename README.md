# Apartment rent app: setup and hardening

## 1. Deploy
1. Create a Firebase project; enable **Authentication** (Email/Password) and **Firestore**.
2. Paste your Firebase config and owner email(s) into `appartment.html` (`OWNER EMAIL(S)` section).
3. Use your existing `firestore.rules` and add the `maintenance` block from the chat reply just before the `reads` rule (it is the only collection the new features need). Test in the emulator, then run `firebase deploy --only firestore:rules`.
4. Host the file (Firebase Hosting) over HTTPS.

## 2. Security checklist
- **Owner access:** `isOwner()` in the rules checks a verified email. Keep that list in sync with `OWNER EMAIL(S)` in `appartment.html`. For more owners, add emails to both.
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

## 4. Selfie check (new)
Add the `selfies` rule from the chat reply **before** using the new version, or registration will fail. The tenant takes a live selfie, the owner compares it with the ID, and the selfie is deleted when the owner approves or declines.
