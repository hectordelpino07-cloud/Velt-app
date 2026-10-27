// Estado compartido de la app: tareas enviadas y quién está usando la app.
// De momento vive en el dispositivo (en la web se guarda en el navegador).
// Cuando haya servidor, este archivo es el único que hay que cambiar.
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { DIRECTOR } from '../data/equipo';

export type Estado = 'pendiente' | 'confirmada' | 'hecha';

export type Tarea = {
  id: string;
  titulo: string;
  responsableId: string;
  dia: string | null;
  hora: string | null;
  porque: string;
  nota?: string;
  estado: Estado;
  duda?: string;
  respuesta?: string;
  creada: number;
};

const EJEMPLO: Tarea[] = [
  {
    id: 'ej-1',
    titulo: 'Revisar el cuadrante de guardias de noviembre',
    responsableId: 'ines',
    dia: 'Vie',
    hora: '14:00',
    porque: 'El lunes entra el nuevo horario de 2.º de Bachillerato.',
    estado: 'confirmada',
    creada: Date.now() - 86_400_000,
  },
  {
    id: 'ej-2',
    titulo: 'Montar las sillas del salón de actos',
    responsableId: 'carmen',
    dia: 'Jue',
    hora: '16:30',
    porque: 'El jueves hay claustro a las 17:00.',
    estado: 'pendiente',
    creada: Date.now() - 3_600_000,
  },
];

const CLAVE = 'velt.tareas.v1';
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;

function cargar(): Tarea[] {
  try {
    const raw = almacen?.getItem(CLAVE);
    return raw ? JSON.parse(raw) : EJEMPLO;
  } catch {
    return EJEMPLO;
  }
}

type Ctx = {
  tareas: Tarea[];
  usuarioId: string;
  setUsuarioId: (id: string) => void;
  enviar: (nuevas: Omit<Tarea, 'estado' | 'creada'>[]) => void;
  cambiarEstado: (id: string, estado: Estado) => void;
  preguntarDuda: (id: string, duda: string) => void;
  responder: (id: string, respuesta: string) => void;
  carga: Record<string, number>;
  reiniciar: () => void;
};

const VeltContext = createContext<Ctx | null>(null);

export function VeltProvider({ children }: { children: ReactNode }) {
  const [tareas, setTareas] = useState<Tarea[]>(cargar);
  const [usuarioId, setUsuarioId] = useState(DIRECTOR.id);

  useEffect(() => {
    try {
      almacen?.setItem(CLAVE, JSON.stringify(tareas));
    } catch {
      // sin almacenamiento (modo privado): la app sigue funcionando en memoria
    }
  }, [tareas]);

  const valor = useMemo<Ctx>(() => {
    const carga: Record<string, number> = {};
    tareas.filter((t) => t.estado !== 'hecha').forEach((t) => (carga[t.responsableId] = (carga[t.responsableId] ?? 0) + 1));
    return {
      tareas,
      usuarioId,
      setUsuarioId,
      carga,
      enviar: (nuevas) => setTareas((ts) => [...nuevas.map((t) => ({ ...t, estado: 'pendiente' as const, creada: Date.now() })), ...ts]),
      cambiarEstado: (id, estado) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, estado } : t))),
      preguntarDuda: (id, duda) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, duda, respuesta: undefined } : t))),
      responder: (id, respuesta) => setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, respuesta } : t))),
      reiniciar: () => setTareas(EJEMPLO),
    };
  }, [tareas, usuarioId]);

  return <VeltContext.Provider value={valor}>{children}</VeltContext.Provider>;
}

export function useVelt() {
  const c = useContext(VeltContext);
  if (!c) throw new Error('useVelt fuera de VeltProvider');
  return c;
}
