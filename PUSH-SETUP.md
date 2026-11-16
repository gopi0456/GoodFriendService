# Alerts, voice and phone notifications - what works and the one-time setup

## Works right away (no setup, after running `app-update2a.sql`, `app-update2b.sql` and `app-update2c.sql`)
- **Update banner**: a scrolling bar at the top of the dashboard. Publish it in *Dashboard > Admin > Updates*.
- **Alerts inside the app**: when someone contacts a listing owner (Call / WhatsApp / asked the admin), sends a chat message, approves a chat, replies to an enquiry, or shows interest in a matrimonial profile, the person gets an alert.
  The dashboard shows an **Alerts** button with the count, and a bar drops from the top.
- **Voice**: while the app is open the phone speaks, for example:
  *"Good evening! Someone is interested to contact you. Thank you for using Good Friend Service. Good luck!"*
  (Good morning until 12:00, Good afternoon until 17:00, Good evening after that.) It can be switched off on the Alerts page.
  It also speaks once when you open the app and have unread alerts.

## Optional: phone notifications with the NUMBER ON THE APP ICON (works even when the app is closed)
This needs a free Firebase project, so it takes about 20 minutes once. The app works fine without it.

1. **Firebase**: https://console.firebase.google.com > *Add project* (turn Google Analytics off) > *Add app > Android*.
   Package name = the app id of GoodFriendService (the one in `capacitor.config`, for example `com.goodfriend.app`).
   Download **google-services.json** and copy it to  `~/projects/GoodFriendService/android/app/google-services.json`.
2. **Plugins** (Termux):
   ```
   cd ~/projects/GoodFriendService
   dev "npm i @capacitor/push-notifications@6"
   dev "npm i @capacitor-community/text-to-speech@5"     # optional: clearer voice. If npm complains, skip it; the built-in voice is used.
   dev "npx cap sync android"
   ```
3. **Firebase key for the server**: Firebase > Project settings > *Service accounts* > *Generate new private key*. Open the downloaded `.json` file and copy ALL of its text.
4. **Supabase > Edge Functions > Deploy a new function** named `send-push`: paste the content of `supabase/functions/send-push/index.ts`.
   In the function's settings turn **Verify JWT OFF**. Then *Secrets*:
   - `FCM_SERVICE_ACCOUNT` = the whole JSON text from step 3
   - `PUSH_WEBHOOK_SECRET`  = any long random text (write it down)
5. **Supabase > Database > Webhooks > Create a new hook**: table `app_notifications`, event **Insert**, type *Supabase Edge Functions*, function `send-push`.
   Add an HTTP header  `x-webhook-secret`  with the same text as `PUSH_WEBHOOK_SECRET`.
6. Build and install the app (`dev cap-build`). Open it once and tap **Allow** when Android asks for notifications.
7. Test: from another login tap **Call** on a listing that you own. Your phone should show the notification, and the app icon shows the count
   (the number appears on phones whose launcher supports icon badges, for example MIUI; check *Settings > Notifications > App icon badges*).

Notes
- With the app closed, Android plays its normal notification sound; the spoken voice message plays when the app is open, and once more when you open it with unread alerts.
- Phone notifications are not available in the browser preview (`npm run dev`); only on the installed app.
