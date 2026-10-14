import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Messages({ onBack }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [myId, setMyId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setMyId(user.id)
      supabase.from('profiles').select('id, full_name').then(({ data }) => setUsers(data.filter(u => u.id !== user.id) || []))
    })
  }, [])

  const openChat = (user) => {
    setSelectedUser(user)
    const rideId = 'direct_' + user.id
    supabase.from('messages').select('*').eq('ride_id', rideId).order('created_at', { ascending: true }).then(({ data }) => setMessages(data || []))
  }

  const sendMsg = async () => {
    if (!newMsg.trim() || !selectedUser) return
    const rideId = 'direct_' + selectedUser.id
    await supabase.from('messages').insert({ id: 'msg_' + Date.now(), ride_id: rideId, sender_id: myId, receiver_id: selectedUser.id, message: newMsg })
    setNewMsg('')
    openChat(selectedUser)
  }

  if (selectedUser) {
    return (
      <div>
        <div className="header" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
          <button className="back-btn" onClick={() => setSelectedUser(null)}>⬅️ Back</button>
          <div className="header-title">Chat with {selectedUser.full_name}</div>
          <div style={{ width: 70 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#f3f4f6' }}>
            {messages.map(m => (
              <div key={m.id} style={{ padding: '10px 14px', borderRadius: 16, maxWidth: '75%', fontSize: 14, alignSelf: m.sender_id === myId ? 'flex-end' : 'flex-start', background: m.sender_id === myId ? '#8b5cf6' : 'white', color: m.sender_id === myId ? 'white' : 'black', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{m.message}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 12, background: 'white', borderTop: '1px solid #e5e7eb' }}>
            <input className="input" style={{ margin: 0, flex: 1 }} placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
            <button className="btn btn-primary" style={{ width: 50, margin: 0 }} onClick={sendMsg}>📤</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="header" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
        <button className="back-btn" onClick={onBack}>⬅️ Back</button>
        <div className="header-title">Messages</div>
        <div style={{ width: 70 }}></div>
      </div>
      <div className="content">
        {users.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No other users found.</p>
        ) : users.map(u => (
          <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => openChat(u)}>
            <div style={{ width: 50, height: 50, borderRadius: 25, background: 'linear-gradient(135deg, #EC4899, #DB2777)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, marginRight: 14 }}>{u.full_name?.[0]?.toUpperCase()}</div>
            <div><div className="text-bold">{u.full_name}</div><div className="text-sm">Tap to chat</div></div>
          </div>
        ))}
      </div>
    </div>
  )
}
