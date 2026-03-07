import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lxwvbtcqpqilpxfsryns.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4d3ZidGNxcHFpbHB4ZnNyeW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTE2ODYsImV4cCI6MjA4ODQ4NzY4Nn0.RbHAh0KDQRCaqb7UMhUAoNhWlyjiKaDeeGP75vs4L5w'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)