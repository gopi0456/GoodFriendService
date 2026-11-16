import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { APP_VERSION, isNewer } from '../appVersion'
import './notices.css'

// The scrolling banner at the top of the dashboard.
//  * "update"  notices show only to people whose app is OLDER than the published version, with a Download button
//  * "notice"  (news) notices show to everybody
export default function UpdateTicker() {
  const [rows, setRows] = useState([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data, error } = await supabase.from('app_notices').select('*').eq('active', true).order('created_at', { ascending: false }).range(0, 9)
      if (alive && !error) setRows(data || [])
    }
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const update = rows.find(r => r.kind === 'update' && isNewer(r.version, APP_VERSION))
  const news = rows.filter(r => r.kind === 'notice').slice(0, 2)
  const list = [update, ...news].filter(Boolean)
  if (!list.length || hidden) return null

  const text = list.map(r => (r.kind === 'update' ? `NEW UPDATE v${r.version}: ${r.message}` : r.message)).join('     •     ')
  return (
    <div className="tk" role="status">
      <span className="tk-badge">{update ? 'New' : 'News'}</span>
      <div className="tk-track">
        <div className="tk-run" style={{ animationDuration: `${Math.max(14, Math.round(text.length * 0.26))}s` }}>
          <span>{text}</span><span aria-hidden="true">{text}</span>
        </div>
      </div>
      {update && <a className="tk-btn" href={update.download_url} target="_blank" rel="noreferrer">Download</a>}
      <button className="tk-x" aria-label="Hide this banner" onClick={() => setHidden(true)}>✕</button>
    </div>
  )
}
