// Planet positions (geocentric, ecliptic longitude of date) with low-precision orbital elements
// (P. Schlyter's method, with Jupiter/Saturn perturbations) + Moon (Meeus) + mean lunar node.
// Typical accuracy: Sun/Moon ~0.01 deg, planets ~0.1 deg. Indicative only.
import { moonTropicalLongitude, norm360, lahiriAyanamsa } from './astro'

const rad = Math.PI / 180
const sin = (d) => Math.sin(d * rad)
const cos = (d) => Math.cos(d * rad)
const atan2d = (y, x) => Math.atan2(y, x) / rad

// solve Kepler's equation (degrees)
function kepler(M, e) {
  let E = M + (e / rad) * sin(M) * (1 + e * cos(M))
  for (let i = 0; i < 12; i++) {
    const dE = (E - (e / rad) * sin(E) - M) / (1 - e * cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-7) break
  }
  return E
}

function sunPos(d) {
  const w = 282.9404 + 4.70935e-5 * d
  const e = 0.016709 - 1.151e-9 * d
  const M = norm360(356.0470 + 0.9856002585 * d)
  const E = kepler(M, e)
  const xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E)
  const v = atan2d(yv, xv), r = Math.sqrt(xv * xv + yv * yv)
  const lon = norm360(v + w)
  return { lon, r, x: r * cos(lon), y: r * sin(lon) }
}

// orbital elements: N, i, w, a, e, M  as [base, perDay]
const EL = {
  Mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.00e-8], w: [29.1241, 1.01444e-5], a: 0.387098, e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  Venus:   { N: [76.6799, 2.46590e-5], i: [3.3946, 2.75e-8], w: [54.8910, 1.38374e-5], a: 0.723330, e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
  Mars:    { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: 1.523688, e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
  Jupiter: { N: [100.4542, 2.76854e-5], i: [1.3030, -1.557e-7], w: [273.8777, 1.64505e-5], a: 5.20256, e: [0.048498, 4.469e-9], M: [19.8950, 0.0830853001] },
  Saturn:  { N: [113.6634, 2.38980e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: 9.55475, e: [0.055546, -9.499e-9], M: [316.9670, 0.0334442282] },
}
const val = (p, d) => p[0] + p[1] * d

function planetGeo(name, d, sun) {
  const el = EL[name]
  const N = val(el.N, d), i = val(el.i, d), w = val(el.w, d), e = val(el.e, d)
  const M = norm360(val(el.M, d))
  const E = kepler(M, e)
  const xv = el.a * (cos(E) - e), yv = el.a * Math.sqrt(1 - e * e) * sin(E)
  const v = atan2d(yv, xv), r = Math.sqrt(xv * xv + yv * yv)
  const vw = v + w
  let xh = r * (cos(N) * cos(vw) - sin(N) * sin(vw) * cos(i))
  let yh = r * (sin(N) * cos(vw) + cos(N) * sin(vw) * cos(i))
  let zh = r * (sin(vw) * sin(i))

  if (name === 'Jupiter' || name === 'Saturn') {
    const Mj = norm360(val(EL.Jupiter.M, d)), Ms = norm360(val(EL.Saturn.M, d))
    let lon = atan2d(yh, xh), lat = atan2d(zh, Math.sqrt(xh * xh + yh * yh))
    if (name === 'Jupiter') {
      lon += -0.332 * sin(2 * Mj - 5 * Ms - 67.6) - 0.056 * sin(2 * Mj - 2 * Ms + 21) + 0.042 * sin(3 * Mj - 5 * Ms + 21)
        - 0.036 * sin(Mj - 2 * Ms) + 0.022 * cos(Mj - Ms) + 0.023 * sin(2 * Mj - 3 * Ms + 52) - 0.016 * sin(Mj - 5 * Ms - 69)
    } else {
      lon += 0.812 * sin(2 * Mj - 5 * Ms - 67.6) - 0.229 * cos(2 * Mj - 4 * Ms - 2) + 0.119 * sin(Mj - 2 * Ms - 3)
        + 0.046 * sin(2 * Mj - 6 * Ms - 69) + 0.014 * sin(Mj - 3 * Ms + 32)
      lat += -0.020 * cos(2 * Mj - 4 * Ms - 2) + 0.018 * sin(2 * Mj - 6 * Ms - 49)
    }
    xh = r * cos(lon) * cos(lat); yh = r * sin(lon) * cos(lat); zh = r * sin(lat)
  }
  return norm360(atan2d(yh + sun.y, xh + sun.x))
}

const signedDiff = (a, b) => ((b - a + 540) % 360) - 180

// tropical geocentric longitudes (deg) for a Julian Ephemeris Day
export function tropicalPositions(jde) {
  const d = jde - 2451543.5
  const sun = sunPos(d)
  const T = (jde - 2451545.0) / 36525
  const node = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T ** 3) / 467441 - (T ** 4) / 60616000)
  const out = {
    Sun: sun.lon,
    Moon: moonTropicalLongitude(jde),
    Mercury: planetGeo('Mercury', d, sun),
    Venus: planetGeo('Venus', d, sun),
    Mars: planetGeo('Mars', d, sun),
    Jupiter: planetGeo('Jupiter', d, sun),
    Saturn: planetGeo('Saturn', d, sun),
    Rahu: node,
    Ketu: norm360(node + 180),
  }
  return out
}

// all planets, sidereal (Lahiri), with retrograde flags
export function siderealPlanets(jde) {
  const ay = lahiriAyanamsa(jde)
  const now = tropicalPositions(jde)
  const later = tropicalPositions(jde + 1)
  const res = {}
  for (const k of Object.keys(now)) {
    const retro = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(k) ? signedDiff(now[k], later[k]) < 0 : (k === 'Rahu' || k === 'Ketu')
    res[k] = { lon: norm360(now[k] - ay), retro }
  }
  return { planets: res, ayanamsa: ay }
}

// Ascendant (tropical) for UT Julian day, latitude (deg N) and longitude (deg E)
export function ascendantTropical(jdUT, lat, lonEast) {
  const T = (jdUT - 2451545.0) / 36525
  const gmst = norm360(280.46061837 + 360.98564736629 * (jdUT - 2451545.0) + 0.000387933 * T * T - (T ** 3) / 38710000)
  const lst = norm360(gmst + lonEast)
  const eps = 23.4392911 - 0.0130042 * T
  return norm360(atan2d(cos(lst), -(sin(lst) * cos(eps) + Math.tan(lat * rad) * sin(eps))))
}
