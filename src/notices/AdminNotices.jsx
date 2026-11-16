import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import PageFrame from '../engage/PageFrame'
import { ago } from '../engage/engageApi'
import { APP_VERSION } from '../appVersion'
import './notices.css'

const BUCKET = 'app-releases'
const MAX_MB = 50
const mb = (bytes) => (bytes / 1048576).toFixed(1)
const storedPath = (url) => (url && url.includes(`/${BUCKET}/`) ? decodeURIComponent(url.split(`/${BUCKET}/`)[1].split('?')[0]) : null)

// admin: upload the new APK to Supabase, publish it, and every user gets the banner + an alert
export default function AdminNotices({ onBack }) {
  const [rows, setRows] = useState(null)
  const [kind, setKind] = useState('update')
  const [version, setVersion] = useState('')
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('app_notices').select('*').order('created_at', { ascending: false }).range(0, 99)
    if (error) alert('Error: ' + error.message + '\n\nHave you run app-update2a.sql in Supabase?')
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!/\.apk$/i.test(f.name)) return alert('Please choose the .apk file of the new app.')
    if (f.size > MAX_MB * 1048576) return alert(`This file is ${mb(f.size)} MB, but Supabase accepts up to ${MAX_MB} MB on the free plan. Paste a download link instead.`)
    setFile(f)
  }

  const publish = async (e) => {
    e.preventDefault()
    setDone('')
    const msg = message.trim()
    if (msg.length < 3) return alert('Write the message people will see')
    let link = url.trim()
    const ver = version.trim()
    if (kind === 'update') {
      if (!/^[0-9]+(\.[0-9]+){0,3}$/.test(ver)) return alert('Version must look like 1.1.0')
      if (!file && !/^https:\/\//i.test(link)) return alert('Choose the APK file, or paste a download link that starts with https://')
    }
    setBusy(true)
    try {
      if (kind === 'update' && file) {
        setStatus(`Uploading ${mb(file.size)} MB to Supabase... keep the app open`)
        const path = `${ver}/goodfriend-${ver}.apk`
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/vnd.android.package-archive', upsert: true })
        if (up.error) throw new Error('Upload failed: ' + up.error.message + '\n\nHave you run app-update3.sql in Supabase?')
        link = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      }
      setStatus('Publishing...')
      const { data, error } = await supabase.rpc('publish_app_notice', { p_kind: kind, p_version: kind === 'update' ? ver : null, p_message: msg, p_url: kind === 'update' ? link : null, p_notify: notify })
      if (error) throw new Error('Could not publish: ' + error.message + '\n\nHave you run app-update3.sql in Supabase?')
      setDone(`Published. ${notify ? `${data || 0} users were sent an alert, and ` : ''}the banner is live.`)
      setMessage(''); setVersion(''); setUrl(''); setFile(null)
      load()
    } catch (err) {
      alert(err.message || String(err))
    } finally {
      setBusy(false); setStatus('')
    }
  }

  const toggle = async (r) => { const { error } = await supabase.from('app_notices').update({ active: !r.active }).eq('id', r.id); if (error) return alert(error.message); load() }
  const remove = async (r) => {
    if (!window.confirm('Delete this banner message?')) return
    const path = storedPath(r.download_url)
    const { error } = await supabase.from('app_notices').delete().eq('id', r.id)
    if (error) return alert(error.message)
    if (path && window.confirm('Also delete the APK file from Supabase storage?')) await supabase.storage.from(BUCKET).remove([path])
    load()
  }

  return (
    <PageFrame title="Updates" icon="📣" onBack={onBack}>
      <div className="eg-pad">
        <div className="eg-banner info">
          This build of the app is <b>v{APP_VERSION}</b>. For a new release: 1) change the number in <code>src/appVersion.js</code> and build the APK, 2) choose that APK here and publish.
          Phones on an older number get the banner and an alert; after they install it, it disappears by itself.
        </div>
        <form className="nt-form" onSubmit={publish}>
          <div className="eg-tabs nt-kind">
            <button type="button" className={kind === 'update' ? 'on' : ''} onClick={() => setKind('update')}>New update</button>
            <button type="button" className={kind === 'notice' ? 'on' : ''} onClick={() => setKind('notice')}>News for everyone</button>
          </div>
          {kind === 'update' && (
            <>
              <label>New version number</label>
              <input className="eg-input" inputMode="decimal" placeholder="e.g. 1.1.0" value={version} onChange={e => setVersion(e.target.value)} />
              <label>The new app (APK file)</label>
              <label className={`nt-file ${file ? 'has' : ''}`}>
                <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={pick} hidden />
                {file ? <><b>{file.name}</b><small>{mb(file.size)} MB · tap to change</small></> : <><b>Choose the APK file</b><small>It is stored in your Supabase and users download it from there</small></>}
              </label>
              <label>…or paste a download link instead</label>
              <input className="eg-input" inputMode="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} disabled={!!file} />
            </>
          )}
          <label>Message that scrolls at the top</label>
          <textarea className="eg-input" maxLength={220} rows={3} placeholder={kind === 'update' ? 'e.g. Chat, history and new colours are here. Please update.' : 'e.g. Wedding season: list your event service today!'} value={message} onChange={e => setMessage(e.target.value)} />
          <label className="nt-check"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /><span>Also send an alert to every user</span></label>
          <button className="eg-primary" disabled={busy}>{busy ? 'Please wait...' : kind === 'update' ? '📣 Upload and publish update' : '📢 Publish news'}</button>
          {status && <div className="nt-status">{status}</div>}
          {done && <div className="eg-banner nt-done">✅ {done}</div>}
        </form>

        <div className="eg-sub">Published</div>
        {rows === null && <div className="eg-empty">Loading...</div>}
        {rows && rows.length === 0 && <div className="eg-empty">Nothing published yet.</div>}
        {rows && rows.map(r => (
          <div className={`eg-card nt-row ${r.active ? '' : 'off'}`} key={r.id}>
            <div className="eg-card-top"><span className="nt-kind-pill">{r.kind === 'update' ? `Update v${r.version}` : 'News'}</span><span className="eg-sub2" style={{ margin: 0 }}>{ago(r.created_at)}{r.active ? '' : ' · hidden'}</span></div>
            <div className="nt-msg">{r.message}</div>
            {r.download_url && <div className="eg-sub2" style={{ overflowWrap: 'anywhere' }}>{storedPath(r.download_url) ? '📦 Stored in Supabase: ' : ''}{r.download_url}</div>}
            <div className="eg-actions">
              <button className="eg-small" onClick={() => toggle(r)}>{r.active ? 'Hide' : 'Show again'}</button>
              <button className="eg-small bad" onClick={() => remove(r)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  )
}
