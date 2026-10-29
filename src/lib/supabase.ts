// Conexión con Supabase (base de datos). Mientras no haya claves en `.env`,
// la app sigue funcionando como hasta ahora, con los datos en el dispositivo.
// Las claves se ponen en `.env` (ver `.env.example`). Solo la URL y la clave
// «anon/publishable», que están hechas para ir dentro de la app; la seguridad
// la ponen las reglas por filas de `supabase/esquema.sql`.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hayServidor = Boolean(url && clave);

export const supabase: SupabaseClient | null = hayServidor
  ? createClient(url!, clave!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
