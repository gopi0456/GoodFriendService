import { METHOD, RECEIVED, ago, when } from './engageApi'

// mode: 'made' (what I contacted) | 'received' (who contacted me) | 'both' (admin: who -> whom)
export default function HistoryList({ rows, mode, empty }) {
  if (!rows.length) return <div className="eg-empty"><div className="eg-empty-ico">🕘</div><div>{empty || 'Nothing yet.'}</div></div>
  return (
    <div className="eg-hlist">
      {rows.map(r => (
        <div className="eg-hrow" key={r.id}>
          <span className="eg-hico">{METHOD[r.method][0]}</span>
          <div className="eg-hbody">
            <b>{mode === 'received' ? r.actor_name : mode === 'made' ? r.target_name : `${r.actor_name} → ${r.target_name}`}</b>
            <small>
              {mode === 'received' ? RECEIVED[r.method] : METHOD[r.method][1]} · {r.kind === 'worker' ? '🛠️ Worker' : '🎉 Event'}
            </small>
          </div>
          <span className="eg-htime" title={when(r.created_at)}>{ago(r.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
