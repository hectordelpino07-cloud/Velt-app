// Qué personas del centro ya han creado su cuenta (para Configurar → Personal)
import { useEffect, useState } from 'react';
import { useSesion } from './sesion';
import { supabase } from './supabase';

export function useCuentas() {
  const { miembro } = useSesion();
  const [cuentas, setCuentas] = useState<string[]>([]);
  const centroId = miembro?.centroId;
  useEffect(() => {
    if (!centroId || !supabase) return;
    let vivo = true;
    supabase
      .from('miembros')
      .select('persona_id')
      .eq('centro_id', centroId)
      .then(({ data }) => vivo && setCuentas((data ?? []).map((f) => f.persona_id as string)));
    return () => {
      vivo = false;
    };
  }, [centroId]);
  return { cuentas };
}
