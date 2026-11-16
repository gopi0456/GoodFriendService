import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ProfileView, { ProfileCard } from './ProfileView'
import ScoreBadges from './ScoreBadges'

export default function Shortlist({ userId, me, rel }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const key = [...rel.shortlist].sort().join(',')

  useEffect(() => {
    const ids = [...rel.shortlist]
    if (!ids.length) { setProfiles([]); setLoading(false); return }
    supabase.from('matrimony_directory').select('*').in('user_id', ids).then(({ data }) => {
      setProfiles(data || []); setLoading(false)
    })
  }, [key])

  return (
    <div>
      {loading && <div className="mm-empty">Loading...</div>}
      {!loading && profiles.length === 0 && <div className="mm-empty">No saved profiles. Tap ☆ Save on a profile to keep it here.</div>}
      {profiles.map(p => <ProfileCard key={p.user_id} profile={p} onOpen={() => setOpen(p)} footer={<ScoreBadges me={me} p={p} />} />)}
      {open && <ProfileView profile={open} userId={userId} me={me} rel={rel} onClose={() => setOpen(null)} />}
    </div>
  )
}
