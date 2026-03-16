import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://itdwxycecvdamarubpww.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZHd4eWNlY3ZkYW1hcnVicHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njg2MjYsImV4cCI6MjA4NzU0NDYyNn0.rSODus3mHa8EVgzjG3mXXNWaLkJ3vM6OSC-kke-bWzg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
