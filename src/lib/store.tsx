// Estado compartido de la app: quién está usando VELT, las tareas, los avisos
// que recibe cada persona y los mensajes entre compañeros.
// De momento vive en el dispositivo (en la web se guarda en el navegador).
// Cuando haya servidor, este archivo es el único que hay que cambiar: los
// avisos pasarán a llegar además como notificación al móvil.
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DIRECTOR, esGestion, Persona, persona } from '../data/equipo';
import { aFecha } from './fechas';
import { useSesion } from './sesion';
import { supabase } from './supabase';

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

const VACIO: Datos = { tareas: [], avisos: [], mensajes: [] };

// ——— Centro real: cada tarea, aviso y mensaje es una fila en Supabase ———
type Tabla = 'tareas' | 'avisos' | 'mensajes';
const columnas = {
  tareas: (t: Tarea) => ({ id: t.id, responsable: t.responsableId, de: t.de ?? DIRECTOR.id, datos: t, actualizado: new Date().toISOString() }),
  avisos: (a: Aviso) => ({ id: a.id, para: a.para, datos: a }),
  mensajes: (m: Mensaje) => ({ id: m.id, de: m.de, para: m.para, datos: m }),
};
const ordenar = (x: Datos): Datos => ({
  tareas: [...x.tareas].sort((a, b) => b.creada - a.creada),
  avisos: [...x.avisos].sort((a, b) => b.creada - a.creada),
  mensajes: [...x.mensajes].sort((a, b) => a.creada - b.creada),
});

// Lo que ha cambiado entre lo que tiene el servidor y lo que hay ahora
function diferencias<T extends { id: string }>(antes: T[], ahora: T[]) {
  const previo = new Map(antes.map((x) => [x.id, JSON.stringify(x)]));
  const nuevos = ahora.filter((x) => previo.get(x.id) !== JSON.stringify(x));
  const quedan = new Set(ahora.map((x) => x.id));
  const borrados = antes.filter((x) => !quedan.has(x.id)).map((x) => x.id);
  return { nuevos, borrados };
}

type NuevoAviso = Omit<Aviso, 'id' | 'creada' | 'leido' | 'de'> & { de?: string };

type Ctx = Datos & {
  // Sesión: mientras no haya inicio de sesión, se elige quién eres
  yoId: string;
  real: boolean; // datos del centro de verdad, compartidos
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
  const { modo, miembro } = useSesion();
  const centroId = modo === 'real' && miembro && supabase ? miembro.centroId : null;
  const [d, setD] = useState<Datos>(() => ({ ...EJEMPLO, ...leer<Partial<Datos>>(CLAVE, {}) }));
  const [yoDemo, setYo] = useState<string>(() => leer(CLAVE_SESION, DIRECTOR.id));
  // Con cuenta, eres siempre tu propia persona; en la demo se elige
  const yoId = centroId ? miembro!.personaId : yoDemo;
  const servidor = useRef<Datos>(VACIO);
  const [listo, setListo] = useState<string | null>(null);

  useEffect(() => {
    if (!centroId) guardar(CLAVE, d);
  }, [d, centroId]);
  useEffect(() => guardar(CLAVE_SESION, yoDemo), [yoDemo]);

  // Al entrar o salir de una cuenta se cambia de datos (derivado durante el render)
  const [anterior, setAnterior] = useState(centroId);
  if (anterior !== centroId) {
    setAnterior(centroId);
    setD(centroId ? VACIO : { ...EJEMPLO, ...leer<Partial<Datos>>(CLAVE, {}) });
  }

  // Carga inicial y cambios en directo de los demás
  useEffect(() => {
    if (!centroId || !supabase) return;
    const sb = supabase;
    let vivo = true;
    servidor.current = VACIO;
    const filtro = `centro_id=eq.${centroId}`;
    Promise.all([
      sb.from('tareas').select('datos').eq('centro_id', centroId),
      sb.from('avisos').select('datos').eq('centro_id', centroId),
      sb.from('mensajes').select('datos').eq('centro_id', centroId),
    ]).then(([t, a, m]) => {
      if (!vivo) return;
      const datos = ordenar({
        tareas: (t.data ?? []).map((f) => f.datos as Tarea),
        avisos: (a.data ?? []).map((f) => f.datos as Aviso),
        mensajes: (m.data ?? []).map((f) => f.datos as Mensaje),
      });
      servidor.current = datos;
      setD(datos);
      setListo(centroId);
    });
    // Lo que llega del servidor se apunta como ya sincronizado, para no reenviarlo
    const llega = (tabla: Tabla, fila: { id?: string; datos?: never } | null, borrado: boolean) => {
      if (!fila?.id) return;
      const quitar = <T extends { id: string }>(xs: T[]) => xs.filter((x) => x.id !== fila.id);
      const poner = <T extends { id: string }>(xs: T[]) => [...quitar(xs), fila.datos as unknown as T];
      const cambiar = (x: Datos): Datos => ordenar({ ...x, [tabla]: borrado ? quitar(x[tabla] as never[]) : poner(x[tabla] as never[]) } as Datos);
      servidor.current = cambiar(servidor.current);
      setD(cambiar);
    };
    const canal = sb.channel(`datos-${centroId}`);
    for (const tabla of ['tareas', 'avisos', 'mensajes'] as Tabla[])
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla, filter: filtro }, (c) =>
        llega(tabla, (c.eventType === 'DELETE' ? c.old : c.new) as never, c.eventType === 'DELETE'),
      );
    canal.subscribe();
    return () => {
      vivo = false;
      sb.removeChannel(canal);
    };
  }, [centroId]);

  // Lo que cambia aquí se envía al servidor
  useEffect(() => {
    if (!centroId || listo !== centroId || !supabase) return;
    const sb = supabase;
    for (const tabla of ['tareas', 'avisos', 'mensajes'] as Tabla[]) {
      const { nuevos, borrados } = diferencias<{ id: string }>(servidor.current[tabla], d[tabla]);
      // Insertar y actualizar por separado: las reglas de quién puede crear y quién
      // puede cambiar una fila son distintas (el responsable cambia, no crea)
      const habia = new Set(servidor.current[tabla].map((x) => x.id));
      const altas = nuevos.filter((x) => !habia.has(x.id));
      if (altas.length) sb.from(tabla).insert(altas.map((x) => columnas[tabla](x as never))).then(() => undefined);
      for (const x of nuevos.filter((y) => habia.has(y.id))) {
        const { id, ...resto } = columnas[tabla](x as never) as { id: string };
        sb.from(tabla).update(resto).eq('id', id).then(() => undefined);
      }
      if (borrados.length) sb.from(tabla).delete().in('id', borrados).then(() => undefined);
    }
    servidor.current = d;
  }, [d, centroId, listo]);

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
      real: !!centroId,
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
  }, [d, yoId, centroId]);

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
