// The version of THIS build of the app.
// Every time you build a new APK for your users: change this number, build, and in the app go to
//   Dashboard > Admin > Updates  and publish the same number with the download link.
// People who still have an older number then see the scrolling "update available" banner.
export const APP_VERSION = '1.0.0'

// true when version a is newer than version b ("1.10.0" > "1.9.2")
export const isNewer = (a, b) => {
  const x = String(a || '0').split('.').map(n => parseInt(n, 10) || 0)
  const y = String(b || '0').split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0)
    if (d !== 0) return d > 0
  }
  return false
}
