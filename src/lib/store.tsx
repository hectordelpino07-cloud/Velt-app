// Estado compartido de la app: quién está usando VELT, las tareas, los avisos
// que recibe cada persona y los mensajes entre compañeros.
// De momento vive en el dispositivo (en la web se guarda en el navegador).
// Cuando haya servidor, este archivo es el único que hay que cambiar: los
// avisos pasarán a llegar además como notificación al móvil.
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { DIRECTOR, esGestion, Persona, persona } from '../data/equipo';
import { aFecha } from './fechas';

export type Estado = 'pendiente' | 'confirmada' | 'hecha';

export type Tarea = {
  id: string;
  titulo: string;
  responsableId: string;
  de?: string; // quién la envía (dirección, si no se indica)
  dia: string | null; // como se dijo: 'Hoy', 'Mañana', 'Jue'…
  fecha?: string | null; // fecha real (AAAA-MM-DD), calculada al enviar
  hora: string | null;
  porque: string;
  nota?: string;
  estado: Estado;
  duda?: string;
  respuesta?: string;
  creada: number;
  recordada?: number; // último recordatorio enviado
};

export type TipoAviso = 'tarea' | 'confirmada' | 'hecha' | 'duda' | 'respuesta' | 'recordatorio' | 'horario' | 'mensaje';

export type Aviso = {
  id: string;
  para: string;
  de: string;
  tipo: TipoAviso;
  texto: string;
  detalle?: string;
  ruta: string; // a dónde lleva al tocarlo
  tareaId?: string;
  creada: number;
  leido: boolean;
};

export type Mensaje = { id: string; de: string; para: string; texto: string; creada: number };

const HORA = 3_600_000;

const TAREAS_EJEMPLO: Tarea[] = [
  {
    id: 'ej-1',
    titulo: 'Revisar el cuadrante de guardias de noviembre',
    responsableId: 'ines',
    dia: 'Vie',
    fecha: aFecha('Vie'),
    hora: '14:00',
    porque: 'El lunes empieza la segunda evaluación y cambian las guardias.',
    estado: 'confirmada',
    creada: Date.now() - 24 * HORA,
  },
  {
    id: 'ej-2',
    titulo: 'Montar las sillas del salón de actos',
    responsableId: 'carmen',
    dia: 'Jue',
    fecha: aFecha('Jue'),
    hora: '16:30',
    porque: 'El jueves hay claustro a las 17:00.',
    estado: 'pendiente',
    creada: Date.now() - 5 * HORA,
  },
  {
    id: 'ej-3',
    titulo: 'Pasar las notas de la primera evaluación de 2.º ESO A',
    responsableId: 'marta',
    dia: 'Mié',
    fecha: aFecha('Mié'),
    hora: '12:00',
    porque: 'La junta de evaluación es el jueves a primera hora.',
    estado: 'pendiente',
    creada: Date.now() - 2 * HORA,
  },
];

const AVISOS_EJEMPLO: Aviso[] = [
  { id: 'av-1', para: 'pablo', de: 'ines', tipo: 'confirmada', texto: 'Inés ha confirmado su tarea', detalle: 'Revisar el cuadrante de guardias de noviembre', ruta: '/seguimiento', tareaId: 'ej-1', creada: Date.now() - 20 * HORA, leido: false },
  { id: 'av-2', para: 'carmen', de: 'pablo', tipo: 'tarea', texto: 'Pablo te ha enviado una tarea', detalle: 'Montar las sillas del salón de actos', ruta: '/mis-tareas', tareaId: 'ej-2', creada: Date.now() - 5 * HORA, leido: false },
  { id: 'av-3', para: 'marta', de: 'pablo', tipo: 'tarea', texto: 'Pablo te ha enviado una tarea', detalle: 'Pasar las notas de la primera evaluación de 2.º ESO A', ruta: '/mis-tareas', tareaId: 'ej-3', creada: Date.now() - 2 * HORA, leido: false },
  { id: 'av-4', para: 'marta', de: 'raul', tipo: 'mensaje', texto: 'Raúl te ha escrito', detalle: '¿Me cambias la guardia del jueves? Tengo tutoría con una familia.', ruta: '/persona/raul', creada: Date.now() - HORA, leido: false },
];

const MENSAJES_EJEMPLO: Mensaje[] = [
  { id: 'ms-1', de: 'raul', para: 'marta', texto: '¿Me cambias la guardia del jueves? Tengo tutoría con una familia.', creada: Date.now() - HORA },
];

let contador = 0;
const nuevoId = (p = 't') => `${p}-${Date.now().toString(36)}-${(contador++).toString(36)}`;
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const raw = almacen?.getItem(clave);
    return raw ? JSON.parse(raw) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    almacen?.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento (modo privado): la app sigue funcionando en memoria
  }
}

type Datos = { tareas: Tarea[]; avisos: Aviso[]; mensajes: Mensaje[] };
const EJEMPLO: Datos = { tareas: TAREAS_EJEMPLO, avisos: AVISOS_EJEMPLO, mensajes: MENSAJES_EJEMPLO };
const CLAVE = 'velt.datos.v2';
const CLAVE_SESION = 'velt.sesion.v1';

type NuevoAviso = Omit<Aviso, 'id' | 'creada' | 'leido' | 'de'> & { de?: string };

type Ctx = Datos & {
  // Sesión: mientras no haya inicio de sesión, se elige quién eres
  yoId: string;
  entrarComo: (id: string) => void;
  // Tareas
  enviar: (nuevas: (Omit<Tarea, 'estado' | 'creada' | 'id'> & { id?: string })[]) => void;
  cambiarEstado: (id: string, estado: Estado) => void;
  preguntarDuda: (id: string, duda: string) => void;
  responder: (id: string, respuesta: string) => void;
  recordar: (id: string) => void;
  carga: Record<string, number>;
  // Avisos y mensajes
  avisar: (lista: NuevoAviso[]) => void;
  leerAviso: (id: string) => void;
  leerTodos: () => void;
  escribir: (para: string, texto: string) => void;
  reiniciar: () => void;
};

const VeltContext = createContext<Ctx | null>(null);

const ORDEN: Estado[] = ['pendiente', 'confirmada', 'hecha'];

export function VeltProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Datos>(() => ({ ...EJEMPLO, ...leer<Partial<Datos>>(CLAVE, {}) }));
  const [yoId, setYo] = useState<string>(() => leer(CLAVE_SESION, DIRECTOR.id));

  useEffect(() => guardar(CLAVE, d), [d]);
  useEffect(() => guardar(CLAVE_SESION, yoId), [yoId]);

  const valor = useMemo<Ctx>(() => {
    const carga: Record<string, number> = {};
    d.tareas.filter((t) => t.estado !== 'hecha').forEach((t) => (carga[t.responsableId] = (carga[t.responsableId] ?? 0) + 1));
    const nombre = (id: string) => persona(id)?.nombre ?? 'Alguien';
    const aviso = (a: NuevoAviso): Aviso => ({ ...a, de: a.de ?? yoId, id: nuevoId('av'), creada: Date.now(), leido: false });
    const tarea = (ts: Tarea[], id: string, f: (t: Tarea) => Tarea) => ts.map((t) => (t.id === id ? f(t) : t));

    return {
      ...d,
      carga,
      yoId,
      entrarComo: setYo,

      enviar: (nuevas) =>
        setD((x) => {
          const tareas = nuevas.map((t) => ({ ...t, id: t.id ?? nuevoId(), de: t.de ?? yoId, fecha: t.fecha ?? aFecha(t.dia), estado: 'pendiente' as const, creada: Date.now() }));
          const avisos = tareas
            .filter((t) => t.responsableId !== t.de)
            .map((t) => aviso({ para: t.responsableId, de: t.de, tipo: 'tarea', texto: `${nombre(t.de)} te ha enviado una tarea`, detalle: t.titulo, ruta: '/mis-tareas', tareaId: t.id }));
          return { ...x, tareas: [...tareas, ...x.tareas], avisos: [...avisos, ...x.avisos] };
        }),

      cambiarEstado: (id, estado) =>
        setD((x) => {
          const t = x.tareas.find((q) => q.id === id);
          if (!t) return x;
          const tareas = tarea(x.tareas, id, (q) => ({ ...q, estado }));
          // Deshacer: se retira el aviso que se había enviado al avanzar
          if (ORDEN.indexOf(estado) < ORDEN.indexOf(t.estado))
            return { ...x, tareas, avisos: x.avisos.filter((a) => !(a.tareaId === id && a.tipo === t.estado)) };
          const para = t.de ?? DIRECTOR.id;
          if (estado === 'pendiente' || para === t.responsableId) return { ...x, tareas };
          const texto = estado === 'confirmada' ? `${nombre(t.responsableId)} ha confirmado su tarea` : `${nombre(t.responsableId)} ha terminado su tarea`;
          return { ...x, tareas, avisos: [aviso({ para, de: t.responsableId, tipo: estado, texto, detalle: t.titulo, ruta: '/seguimiento', tareaId: id }), ...x.avisos] };
        }),

      preguntarDuda: (id, duda) =>
        setD((x) => {
          const t = x.tareas.find((q) => q.id === id);
          if (!t) return x;
          const a = aviso({ para: t.de ?? DIRECTOR.id, de: t.responsableId, tipo: 'duda', texto: `${nombre(t.responsableId)} tiene una duda`, detalle: duda, ruta: '/seguimiento', tareaId: id });
          return { ...x, tareas: tarea(x.tareas, id, (q) => ({ ...q, duda, respuesta: undefined })), avisos: [a, ...x.avisos] };
        }),

      responder: (id, respuesta) =>
        setD((x) => {
          const t = x.tareas.find((q) => q.id === id);
          if (!t) return x;
          const a = aviso({ para: t.responsableId, tipo: 'respuesta', texto: `${nombre(yoId)} ha respondido a tu duda`, detalle: respuesta, ruta: '/mis-tareas', tareaId: id });
          return { ...x, tareas: tarea(x.tareas, id, (q) => ({ ...q, respuesta })), avisos: [a, ...x.avisos] };
        }),

      recordar: (id) =>
        setD((x) => {
          const t = x.tareas.find((q) => q.id === id);
          if (!t) return x;
          const a = aviso({ para: t.responsableId, tipo: 'recordatorio', texto: `${nombre(yoId)} te recuerda una tarea sin confirmar`, detalle: t.titulo, ruta: '/mis-tareas', tareaId: id });
          return { ...x, tareas: tarea(x.tareas, id, (q) => ({ ...q, recordada: Date.now() })), avisos: [a, ...x.avisos] };
        }),

      avisar: (lista) => setD((x) => ({ ...x, avisos: [...lista.map(aviso), ...x.avisos] })),
      leerAviso: (id) => setD((x) => ({ ...x, avisos: x.avisos.map((a) => (a.id === id ? { ...a, leido: true } : a)) })),
      leerTodos: () => setD((x) => ({ ...x, avisos: x.avisos.map((a) => (a.para === yoId ? { ...a, leido: true } : a)) })),

      escribir: (para, texto) =>
        setD((x) => ({
          ...x,
          mensajes: [...x.mensajes, { id: nuevoId('ms'), de: yoId, para, texto, creada: Date.now() }],
          avisos: [aviso({ para, tipo: 'mensaje', texto: `${nombre(yoId)} te ha escrito`, detalle: texto, ruta: `/persona/${yoId}` }), ...x.avisos],
        })),

      reiniciar: () => setD(EJEMPLO),
    };
  }, [d, yoId]);

  return <VeltContext.Provider value={valor}>{children}</VeltContext.Provider>;
}

export function useVelt() {
  const c = useContext(VeltContext);
  if (!c) throw new Error('useVelt fuera de VeltProvider');
  return c;
}

// Quién está usando la app y si organiza el centro (dirección o jefatura)
export function useYo(): { yo: Persona; gestion: boolean } {
  const { yoId } = useVelt();
  const p = persona(yoId);
  const yo = p && !p.baja ? p : DIRECTOR;
  return { yo, gestion: esGestion(yo) };
}

// «hace 5 min», «hace 3 h», «ayer», «hace 4 días»
export function hace(t: number) {
  const min = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}
