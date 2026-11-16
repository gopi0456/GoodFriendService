import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import PageFrame from './PageFrame'
import HistoryList from './HistoryList'

// my history: who I contacted, and who contacted me
export default function HistoryPage({ session, onBack }) {
  const uid = session.user.id
  const [tab, setTab] = useState('made')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    setRows(null)
    supabase.from('contact_log').select('*').eq(tab === 'made' ? 'actor_id' : 'target_owner', uid)
      .order('created_at', { ascending: false }).range(0, 199)
      .then(({ data, error }) => {
        if (error) alert('Error: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
        setRows(data || [])
      })
  }, [tab, uid])

  return (
    <PageFrame title="My history" icon="🕘" onBack={onBack}>
      <div className="eg-tabs">
        <button className={tab === 'made' ? 'on' : ''} onClick={() => setTab('made')}>I contacted</button>
        <button className={tab === 'received' ? 'on' : ''} onClick={() => setTab('received')}>Contacted me</button>
      </div>
      <div className="eg-pad">
        {rows === null ? <div className="eg-empty">Loading...</div>
          : <HistoryList rows={rows} mode={tab}
              empty={tab === 'made' ? 'When you call, message or ask the admin about a worker or event service, it appears here.' : 'When someone contacts your worker or event listing, it appears here.'} />}
      </div>
    </PageFrame>
  )
}
