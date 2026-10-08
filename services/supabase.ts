import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// read keys from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// init + export connected supabase instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;