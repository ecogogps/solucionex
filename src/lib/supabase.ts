
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Limpiar URL: El SDK de Supabase espera la URL raíz (sin /rest/v1)
// Si la URL contiene /rest/v1 la cortamos para evitar errores de conexión
const cleanUrl = supabaseUrl.split('/rest/v1')[0].replace(/\/$/, '');

export const supabase = createClient(cleanUrl, supabaseAnonKey);
