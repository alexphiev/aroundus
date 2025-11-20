import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required')
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required')
}

export const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
