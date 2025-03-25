import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export const supabase = createClient<Database>(
  'https://zryhjyziylkjgwaxnelx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeWhqeXppeWxramd3YXhuZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NzMzMDEsImV4cCI6MjA1ODQ0OTMwMX0.Op5aEs-NXftLIaDYC5qGAXGVJBYwhbams_pLPYMws2g'
);