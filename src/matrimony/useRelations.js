import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Loads my sent/received interests, shortlist, phone requests and kundli requests in one place
export default function useRelations(userId) {
  const [sentList, setSentList] = useState([])
  const [receivedList, setReceivedList] = useState([])
  const [shortlist, setShortlist] = useState(new Set())
  const [requestList, setRequestList] = useState([])   // phone-number requests
  const [kundliList, setKundliList] = useState([])     // kundli requests

  const reload = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from('matrimony_interests').select('*').eq('from_user', userId).order('created_at', { ascending: false }),
      supabase.from('matrimony_interests').select('*').eq('to_user', userId).order('created_at', { ascending: false }),
      supabase.from('matrimony_shortlist').select('profile_id').eq('user_id', userId),
      supabase.from('matrimony_contact_requests').select('*').eq('from_user', userId).order('created_at', { ascending: false }),
    ])
    setSentList(a.data || [])
    setReceivedList(b.data || [])
    setShortlist(new Set((c.data || []).map(r => r.profile_id)))
    const all = d.data || []
    setRequestList(all.filter(r => (r.kind || 'contact') === 'contact'))
    setKundliList(all.filter(r => r.kind === 'kundli'))
  }, [userId])

  useEffect(() => { reload() }, [reload])

  const sent = {}
  sentList.forEach(i => { sent[i.to_user] = i.status })
  const received = {}
  receivedList.forEach(i => { received[i.from_user] = i.status })
  const requests = {}
  requestList.forEach(r => { requests[r.about_user] = r })
  const kundliRequests = {}
  kundliList.forEach(r => { kundliRequests[r.about_user] = r })

  return { sentList, receivedList, requestList, kundliList, sent, received, requests, kundliRequests, shortlist, reload }
}
