// Sesión: con cuenta (datos reales del centro en Supabase) o en modo demo
// (datos de ejemplo guardados solo en este navegador). Sin claves de Supabase
// la app solo puede funcionar en demo.
import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hayServidor, supabase } from './supabase';

export type Modo = 'demo' | 'real' | null; // null: todavía no ha elegido
export type Miembro = { centroId: string; personaId: string; gestion: boolean };

type Ctx = {
  modo: Modo;
  cargando: boolean;
  correo: string | null;
  miembro: Miembro | null;
  verDemo: () => void;
  salirDeDemo: () => void;
  entrar: (correo: string, clave: string) => Promise<string | null>;
  registrar: (correo: string, clave: string) => Promise<string | null>;
  salir: () => Promise<void>;
  crearCentro: (nombre: string, persona: string, estado: unknown) => Promise<string | null>;
  unirse: (codigo: string) => Promise<string | null>;
};

const SesionContext = createContext<Ctx | null>(null);
const CLAVE_MODO = 'velt.modo.v1';
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;

const leerModo = (): Modo => {
  if (!hayServidor) return 'demo';
  try {
    return almacen?.getItem(CLAVE_MODO) === 'demo' ? 'demo' : null;
  } catch {
    return null;
  }
};

// Los errores de Supabase llegan en inglés: se traducen los habituales
function traducir(m: string) {
  if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no son correctos.';
  if (/already registered|already been registered/i.test(m)) return 'Ya hay una cuenta con ese correo. Entra con tu contraseña.';
  if (/password should be at least/i.test(m)) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(m)) return 'Tienes que confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (/invalid.*email|unable to validate email/i.test(m)) return 'Ese correo no parece válido.';
  if (/código no válido/i.test(m)) return 'Ese código no es válido. Revisa que esté bien escrito o pide uno nuevo a dirección.';
  if (/ya tiene cuenta/i.test(m)) return 'Esa persona ya tiene una cuenta. Si eres tú, entra con tu correo.';
  if (/ya pertenece/i.test(m)) return 'Esta cuenta ya pertenece a un centro.';
  if (/logins are disabled|signups not allowed|signup is disabled/i.test(m)) return 'El acceso con correo está desactivado. Dirección tiene que activarlo en Supabase (Authentication → Sign In / Providers → Email).';
  if (/failed to fetch|network/i.test(m)) return 'No hay conexión. Comprueba internet y vuelve a probar.';
  return m;
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [modoElegido, setModo] = useState<Modo>(leerModo);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [cargando, setCargando] = useState(hayServidor);

  const cargarMiembro = useCallback(async (s: Session | null) => {
    if (!supabase || !s) {
      setMiembro(null);
      return;
    }
    const { data } = await supabase.from('miembros').select('centro_id, persona_id, gestion').eq('usuario_id', s.user.id).maybeSingle();
    setMiembro(data ? { centroId: data.centro_id, personaId: data.persona_id, gestion: data.gestion } : null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSesion(data.session);
      await cargarMiembro(data.session);
      if (vivo) setCargando(false);
    });
    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s);
      // Fuera del propio aviso: Supabase no deja hacer consultas dentro de él
      setTimeout(() => cargarMiembro(s), 0);
    });
    return () => {
      vivo = false;
      escucha.subscription.unsubscribe();
    };
  }, [cargarMiembro]);

  // Con una sesión abierta, siempre datos reales
  const modo: Modo = sesion ? 'real' : modoElegido;

  const valor = useMemo<Ctx>(
    () => ({
      modo,
      cargando,
      correo: sesion?.user.email ?? null,
      miembro: sesion ? miembro : null,
      verDemo: () => {
        try {
          almacen?.setItem(CLAVE_MODO, 'demo');
        } catch {}
        setModo('demo');
      },
      salirDeDemo: () => {
        try {
          almacen?.removeItem(CLAVE_MODO);
        } catch {}
        setModo(hayServidor ? null : 'demo');
      },
      entrar: async (correo, clave) => {
        if (!supabase) return 'VELT no está conectado al servidor.';
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        return error ? traducir(error.message) : null;
      },
      registrar: async (correo, clave) => {
        if (!supabase) return 'VELT no está conectado al servidor.';
        const { data, error } = await supabase.auth.signUp({ email: correo.trim(), password: clave });
        if (error) return traducir(error.message);
        if (!data.session) return 'Te hemos enviado un correo para confirmar la cuenta. Ábrelo y después entra aquí.';
        return null;
      },
      salir: async () => {
        await supabase?.auth.signOut();
        setMiembro(null);
        setModo(null);
      },
      crearCentro: async (nombre, persona, estado) => {
        if (!supabase) return 'VELT no está conectado al servidor.';
        const { error } = await supabase.rpc('crear_centro', { p_nombre: nombre, p_persona: persona, p_estado: estado });
        if (error) return traducir(error.message);
        await cargarMiembro(sesion);
        return null;
      },
      unirse: async (codigo) => {
        if (!supabase) return 'VELT no está conectado al servidor.';
        const { error } = await supabase.rpc('unirse', { p_codigo: codigo });
        if (error) return traducir(error.message);
        await cargarMiembro(sesion);
        return null;
      },
    }),
    [modo, cargando, sesion, miembro, cargarMiembro],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const c = useContext(SesionContext);
  if (!c) throw new Error('useSesion fuera de SesionProvider');
  return c;
}
