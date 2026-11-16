import { computeCompat } from './compat'
import { ashtakoot, horoOf } from './astro'
import { nameMatch } from './names'

// the three match scores between me and another profile (null = not available)
export function scoresFor(me, p) {
  const c = computeCompat(me, p)
  const profile = c && c.percent != null ? c.percent : null
  const a = horoOf(me), b = horoOf(p)
  const guna = a && b && me.gender !== p.gender
    ? ashtakoot(me.gender === 'male' ? a : b, me.gender === 'male' ? b : a).total
    : null
  const nm = nameMatch(me.full_name, p.full_name)
  return {
    profile, guna, name: nm ? nm.percent : null,
    why: {
      profile: c?.unsupported || '',
      guna: !a ? 'add your birth time' : !b ? 'no birth time yet' : '',
      name: nm ? '' : 'English letters needed',
    },
  }
}
