// Run in the project folder before building a new release:   node bump-version.cjs 1.1.0
// Sets the app version in src/appVersion.js (what the update banner compares)
// and in android/app/build.gradle (versionName, and versionCode + 1 - Android refuses to update an app unless versionCode goes UP).
const fs = require('fs')
const v = process.argv[2]
if (!/^[0-9]+(\.[0-9]+){0,3}$/.test(v || '')) { console.log('Usage: node bump-version.cjs 1.1.0'); process.exit(1) }

const f1 = 'src/appVersion.js'
if (fs.existsSync(f1)) {
  const s = fs.readFileSync(f1, 'utf8')
  if (!/export const APP_VERSION = '[^']*'/.test(s)) { console.log('Could not find APP_VERSION in ' + f1); process.exit(1) }
  fs.writeFileSync(f1, s.replace(/export const APP_VERSION = '[^']*'/, `export const APP_VERSION = '${v}'`))
  console.log(`${f1}: APP_VERSION = ${v}`)
} else console.log(f1 + ' not found - run this inside the project folder')

const f2 = 'android/app/build.gradle'
if (fs.existsSync(f2)) {
  let g = fs.readFileSync(f2, 'utf8')
  const code = g.match(/versionCode\s+(\d+)/)
  const name = g.match(/versionName\s+["'][^"']*["']/)
  if (!code || !name) { console.log('Could not find versionCode / versionName in ' + f2 + '. Change them by hand.'); process.exit(1) }
  const next = parseInt(code[1], 10) + 1
  g = g.replace(/versionCode\s+\d+/, `versionCode ${next}`).replace(/versionName\s+["'][^"']*["']/, `versionName "${v}"`)
  fs.writeFileSync(f2, g)
  console.log(`${f2}: versionName "${v}", versionCode ${code[1]} -> ${next}`)
} else console.log(f2 + ' not found - run this inside the project folder')
