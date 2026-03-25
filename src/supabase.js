import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uamsixgrpdbvlrbwthec.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbXNpeGdycGRidmxyYnd0aGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjE5MjUsImV4cCI6MjA4OTIzNzkyNX0.ezToplN5w9TY_JxO6qQvVN9uDZUnbImqKkFo6VSe5tQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
