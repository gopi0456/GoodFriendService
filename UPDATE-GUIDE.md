# Releasing an update to your users (from your phone)

One-time: run **app-update2a.sql**, **2b**, **2c** and then **app-update3.sql** (one file at a time) in the Supabase SQL Editor. It creates the storage place `app-releases` (public download, only you can upload; 50 MB limit on the free plan).

## Every release
1. **Version**: in the project folder run
   ```
   node bump-version.cjs 1.1.0
   ```
   It sets the version for the update banner AND raises Android's `versionCode` by 1 (Android will not update an app unless that number goes up).
2. **Build**: `dev cap-build`, then copy the APK to your phone.
3. **Publish**: open the app > Dashboard > Admin row > **Updates** > *New update*: type the same version (1.1.0), **choose the APK file**, write the message, leave "Also send an alert to every user" ticked, tap **Upload and publish update**.
   - The APK is stored in your Supabase.
   - Everybody gets the alert (and a phone notification if you did the push setup), and the scrolling banner appears for phones with an older version.
4. **What your users do**: tap **Download** on the banner (or tap the alert). The phone downloads the APK; they open it and tap Install. Android asks once to allow installing from the browser - they tap Allow.
5. **After they install**, the banner and the alert disappear by themselves and the app is normal again.

## Important so the update can install over the old app
- Every APK must be **signed with the same key**. If you build in different places (for example android-build and android-build1) the debug key can differ and Android says "App not installed".
  Keep one key: copy `~/.android/debug.keystore` from the environment that built your first release into the same place of the others (back it up in your phone's Download folder).
- `versionCode` must go up every time (the `bump-version.cjs` script does it).

## The new "CL" app icon
Unzipping puts the new icons into `android/app/src/main/res/`. Build and install as usual. If your launcher still shows the old icon, uninstall once and reinstall (launchers cache icons).
The 1024 px original is in `app-icon/icon-1024.png`.
