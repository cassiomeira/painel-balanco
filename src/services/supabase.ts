import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://kqbozeksfnxvwzsxffyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxYm96ZWtzZm54dnd6c3hmZnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDE4MDIsImV4cCI6MjA4MzM3NzgwMn0.H4W-w21Lf1JKzZXATNydDyDRloK945JYWcKyqxCYy90';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
