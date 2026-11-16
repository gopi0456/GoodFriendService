// Optional, run ONCE inside the project folder:   node set-webview-background.cjs
// Gives the Android WebView itself a dark background colour (capacitor.config -> backgroundColor),
// so even a phone that reports a slightly smaller page than its screen never shows a white strip.
const fs = require('fs')
const color = process.argv[2] || '#190c25'
const file = ['capacitor.config.json', 'capacitor.config.ts', 'capacitor.config.js'].find(f => fs.existsSync(f))
if (!file) { console.log('No capacitor.config.* found here. Run this inside the project folder (~/projects/GoodFriendService).'); process.exit(1) }
const src = fs.readFileSync(file, 'utf8')
fs.writeFileSync(file + '.bak', src)
if (file.endsWith('.json')) {
  const j = JSON.parse(src)
  if (j.backgroundColor) { console.log(file + ' already has backgroundColor ' + j.backgroundColor + ' - nothing changed.'); process.exit(0) }
  j.backgroundColor = color
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n')
} else {
  if (/^ {0,2}backgroundColor\s*:/m.test(src)) { console.log(file + ' already has a top-level backgroundColor - nothing changed.'); process.exit(0) }
  const m = src.match(/(?:=|export default|module\.exports\s*=)\s*(?:\w+\s*as\s*\w+\s*)?\{/)
  if (!m) { console.log('Could not find the config object in ' + file + '. Add   backgroundColor: \'' + color + '\'   to it by hand.'); process.exit(1) }
  fs.writeFileSync(file, src.replace(m[0], m[0] + "\n  backgroundColor: '" + color + "',"))
}
console.log('Added backgroundColor ' + color + ' to ' + file + ' (backup: ' + file + '.bak). Now run: dev cap-build')
