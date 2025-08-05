import { createClient } from '@supabase/supabase-js';

// Hier deine Supabase-URL und den public API-Key eintragen
const supabaseUrl = 'https://yraylzhvzwevylqdscqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyYXlsemh2endldnlscWRzY3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODg3NTQsImV4cCI6MjA2MTI2NDc1NH0.w_MXfpalFpG7bCPldI7Qnzrk91pOoib__BPrwsVuxlg';

export const supabase = createClient(supabaseUrl, supabaseKey);