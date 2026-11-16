// Saves a PDF: in the Android app it writes the file and opens the share sheet (Save / Drive / WhatsApp...),
// in a browser it downloads the file.
// Needs (Capacitor 6):  npm i @capacitor/filesystem@6 @capacitor/share@6 && npx cap sync
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const toBase64 = (bytes) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192))
  return btoa(bin)
}
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what + ' is taking too long')), ms))])

export async function savePdf(bytes, filename) {
  if (Capacitor.isNativePlatform()) {
    await withTimeout(Filesystem.writeFile({ path: filename, data: toBase64(bytes), directory: Directory.Cache }), 20000, 'Saving the file')
    const { uri } = await withTimeout(Filesystem.getUri({ path: filename, directory: Directory.Cache }), 10000, 'Finding the file')
    // do NOT wait for the share sheet to close - just open it, so the screen is never stuck on "Preparing"
    Share.share({ title: filename, url: uri, dialogTitle: 'Save or share the kundli' }).catch(() => {})
    return true
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
