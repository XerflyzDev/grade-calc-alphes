import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pkscccexrpkvmvpwstud.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrc2NjY2V4cnBrdm12cHdzdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMwMjAsImV4cCI6MjA4OTk5OTAyMH0.hVnystKdo6SiAkn2aa59xtnEtLJLyzxJF9ENF6CGyeI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
