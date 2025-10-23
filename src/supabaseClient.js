   // src/supabaseClient.js (or utils/supabaseClient.js)
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

   // Public client (for regular auth/queries, uses anon key)
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)

   // Admin client (for privileged ops like createUser, uses service role key)
   // WARNING: Only use this in admin-only contexts; insecure for production!
   export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
   