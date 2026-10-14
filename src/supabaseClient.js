import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvcgwqwdbdirnzhaxivy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Y2d3cXdkYmRpcm56aGF4aXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjMxMTcsImV4cCI6MjEwNjM5OTExN30.qo2ECz-Aw_qM8SDZb6tgrirHNfBSxEIJdK-wTF8zWCY'

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey.substring(0, 50) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
export const adminEmail = 'scgopi.gopi@gmail.com'
