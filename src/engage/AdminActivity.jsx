import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import PageFrame from './PageFrame'
import HistoryList from './HistoryList'

// admin: everything that happened (all calls / WhatsApp taps / enquiries), searchable
export default function AdminActivity({ onBack }) {
  const [rows, setRows] = useState(null)
  const [kind, setKind] = useState('all')
  const [method, setMethod] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('contact_log').select('*').order('created_at', { ascending: false }).range(0, 499)
      .then(({ data, error }) => {
        if (error) alert('Error: ' + error.message + '\n\nHave you run app-update1.sql in Supabase?')
        setRows(data || [])
      })
  }, [])

  const term = q.trim().toLowerCase()
  const shown = (rows || []).filter(r => (kind === 'all' || r.kind === kind) && (method === 'all' || r.method === method) &&
    (!term || `${r.actor_name} ${r.target_name}`.toLowerCase().includes(term)))

  return (
    <PageFrame title="Activity" icon="🕘" onBack={onBack}>
      <div className="eg-pad">
        <input className="eg-input" placeholder="Search a person or profile" value={q} onChange={e => setQ(e.target.value)} />
        <div className="eg-chips eg-filter">
          {[['all', 'All'], ['worker', '🛠️ Workers'], ['event', '🎉 Events']].map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
        </div>
        <div className="eg-chips eg-filter">
          {[['all', 'Any'], ['call', '📞 Calls'], ['whatsapp', '💬 WhatsApp'], ['enquiry', '✉️ Asked admin']].map(([k, l]) => <button key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>{l}</button>)}
        </div>
        {rows === null ? <div className="eg-empty">Loading...</div> : <HistoryList rows={shown} mode="both" empty="No activity found." />}
      </div>
    </PageFrame>
  )
}
