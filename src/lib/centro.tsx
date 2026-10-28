// Estado del centro: jornada (franjas), personal, plantas, espacios, horarios,
// material, reservas y las ausencias del día. Se guarda en el navegador como las tareas, así nada se
// pierde al cambiar de pantalla. Cuando haya servidor, solo cambia este archivo.
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  Espacio,
  ESPACIOS_INICIALES,
  Franja,
  FRANJAS_INICIALES,
  esClase,
  esLugar,
  Hueco,
  HORARIO_INICIAL,
  JORNADAS,
  Lugar,
  Material,
  MATERIALES_INICIALES,
  Planta,
  PLANTAS_INICIALES,
  RESERVAS_INICIALES,
  sumarMinutos,
  TipoEspacio,
  TurnoFranja,
} from '../data/centro';
import { daClase, EQUIPO_INICIAL, Persona, sincronizarEquipo } from '../data/equipo';

type Datos = {
  franjas: Franja[];
  personal: Persona[];
  plantas: Planta[];
  espacios: Espacio[];
  horario: Record<string, Hueco[]>;
  materiales: Material[];
  reservas: Record<string, string>; // 'franja:espacio' → motivo
  ausentes: string[];
  cubiertas: Record<string, string>; // 'franja:espacio' → quien cubre
};

const INICIAL: Datos = {
  franjas: FRANJAS_INICIALES,
  personal: EQUIPO_INICIAL,
  plantas: PLANTAS_INICIALES,
  espacios: ESPACIOS_INICIALES,
  horario: HORARIO_INICIAL,
  materiales: MATERIALES_INICIALES,
  reservas: RESERVAS_INICIALES,
  ausentes: [],
  cubiertas: {},
};

const CLAVE = 'velt.centro.v2';
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;

function cargar(): Datos {
  try {
    const raw = almacen?.getItem(CLAVE);
    return raw ? { ...INICIAL, ...JSON.parse(raw) } : INICIAL;
  } catch {
    return INICIAL;
  }
}

// Qué hace por defecto una persona en una franja: fuera si no es su turno,
// en su puesto si no da clase, y libre si es profesorado
const LUGAR_POR_ROL: Record<string, Lugar> = {
  Conserjería: { lugar: 'CON', motivo: 'Conserjería' },
  Secretaría: { lugar: 'SEC', motivo: 'Secretaría' },
  Dirección: { lugar: 'DIR', motivo: 'Dirección' },
};
const enTurno = (p: Persona, f: Franja) => p.turno === 'ambos' || p.turno === f.turno;
function huecoPorDefecto(p: Persona, f: Franja): Hueco {
  if (!enTurno(p, f)) return 'fuera';
  if (!daClase(p)) return LUGAR_POR_ROL[p.rol] ?? 'libre';
  return 'libre';
}

// Al cambiar las franjas, cada persona conserva lo que tenía en las horas que
// siguen existiendo (misma hora de inicio y turno) y el resto se rellena solo
function reajustarHorario(x: Datos, nuevas: Franja[]): Record<string, Hueco[]> {
  return Object.fromEntries(
    x.personal.map((p) => {
      const antes = x.horario[p.id] ?? [];
      return [
        p.id,
        nuevas.map((f) => {
          const i = x.franjas.findIndex((o) => o.inicio === f.inicio && o.turno === f.turno);
          return i >= 0 && antes[i] !== undefined && enTurno(p, f) ? antes[i] : huecoPorDefecto(p, f);
        }),
      ];
    }),
  );
}

const numerar = (fs: Franja[]) => fs.map((f, id) => ({ ...f, id }));

const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type Ctx = Datos & {
  espacio: (id: string) => Espacio | undefined;
  // Jornada
  ponerJornada: (id: string) => void;
  addFranja: (turno: TurnoFranja) => void;
  editarFranja: (i: number, cambios: Partial<Franja>) => void;
  quitarFranja: (i: number) => void;
  // Personal
  addPersona: () => void;
  editarPersona: (id: string, cambios: Partial<Persona>) => void;
  darDeBaja: (id: string, baja: boolean) => void;
  nombreEspacio: (id: string | null) => string;
  // Plantas y espacios
  addPlanta: () => void;
  renombrarPlanta: (id: string, nombre: string) => void;
  quitarPlanta: (id: string) => void;
  numeroAulas: (plantaId: string, n: number) => void;
  addEspacio: (plantaId: string, tipo: TipoEspacio) => void;
  editarEspacio: (id: string, cambios: Partial<Espacio>) => void;
  quitarEspacio: (id: string) => void;
  // Horarios
  ponerHueco: (personaId: string, franja: number, hueco: Hueco) => void;
  // Material
  addMaterial: (m: Omit<Material, 'id'>, unidades: number) => void;
  editarMaterial: (id: string, cambios: Partial<Material>) => void;
  quitarMaterial: (id: string) => void;
  // Día a día
  reservar: (franja: number, espacioId: string, motivo: string) => void;
  quitarReserva: (franja: number, espacioId: string) => void;
  ausente: (personaId: string, si: boolean) => void;
  cubrir: (franja: number, espacioId: string, quien: string) => void;
  reiniciarCentro: () => void;
};

const CentroContext = createContext<Ctx | null>(null);

export function CentroProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Datos>(cargar);

  useEffect(() => {
    try {
      almacen?.setItem(CLAVE, JSON.stringify(d));
    } catch {
      // sin almacenamiento: sigue funcionando en memoria
    }
  }, [d]);

  // El resto de la app consulta el personal en data/equipo.ts
  sincronizarEquipo(d.personal);

  const valor = useMemo<Ctx>(() => {
    const porId = Object.fromEntries(d.espacios.map((e) => [e.id, e]));
    const cambiar = (f: (x: Datos) => Partial<Datos>) => setD((x) => ({ ...x, ...f(x) }));

    // Si se borra un espacio, las clases que había allí pasan a «libre»
    const limpiarHorario = (horario: Record<string, Hueco[]>, id: string) =>
      Object.fromEntries(
        Object.entries(horario).map(([p, hs]) => [p, hs.map((h) => ((esClase(h) && h.espacio === id) || (esLugar(h) && h.lugar === id) ? 'libre' : h))]),
      ) as Record<string, Hueco[]>;

    return {
      ...d,
      espacio: (id) => porId[id],
      nombreEspacio: (id) => (id ? porId[id]?.nombre ?? 'Espacio borrado' : 'Almacén'),

      ponerJornada: (id) =>
        cambiar((x) => {
          const j = JORNADAS.find((q) => q.id === id);
          if (!j) return {};
          return { franjas: j.franjas, horario: reajustarHorario(x, j.franjas), reservas: {}, cubiertas: {} };
        }),
      addFranja: (turno) =>
        cambiar((x) => {
          const delTurno = x.franjas.filter((f) => f.turno === turno);
          const ultima = delTurno[delTurno.length - 1];
          const inicio = ultima ? ultima.fin : turno === 'manana' ? '08:00' : '15:30';
          const nueva: Franja = {
            id: 0,
            inicio,
            fin: sumarMinutos(inicio, 60),
            nombre: `${delTurno.filter((f) => !f.recreo).length + 1}.ª ${turno === 'manana' ? 'hora' : 'tarde'}`,
            turno,
          };
          const pos = ultima ? x.franjas.indexOf(ultima) + 1 : turno === 'manana' ? 0 : x.franjas.length;
          const nuevas = numerar([...x.franjas.slice(0, pos), nueva, ...x.franjas.slice(pos)]);
          return { franjas: nuevas, horario: reajustarHorario(x, nuevas), reservas: {}, cubiertas: {} };
        }),
      editarFranja: (i, cambios) =>
        cambiar((x) => {
          const nuevas = x.franjas.map((f) => (f.id === i ? { ...f, ...cambios } : f));
          // Cambiar la hora no mueve las clases: el horario se queda igual
          return { franjas: nuevas };
        }),
      quitarFranja: (i) =>
        cambiar((x) => ({
          franjas: numerar(x.franjas.filter((f) => f.id !== i)),
          horario: Object.fromEntries(Object.entries(x.horario).map(([p, hs]) => [p, hs.filter((_, k) => k !== i)])),
          reservas: {},
          cubiertas: {},
        })),

      addPersona: () =>
        cambiar((x) => {
          const nueva: Persona = { id: nuevoId('p'), nombre: 'Nuevo', apellido: 'profesor', rol: 'Profesorado', turno: 'manana', materia: '' };
          return { personal: [...x.personal, nueva], horario: { ...x.horario, [nueva.id]: x.franjas.map((f) => huecoPorDefecto(nueva, f)) } };
        }),
      editarPersona: (id, cambios) =>
        cambiar((x) => {
          const personal = x.personal.map((p) => (p.id === id ? { ...p, ...cambios } : p));
          if (!cambios.turno && !cambios.rol) return { personal };
          // Si cambia el turno o el puesto, se ajustan las horas que ya no le tocan
          const p = personal.find((q) => q.id === id)!;
          const antes = x.horario[id] ?? [];
          const horario = {
            ...x.horario,
            [id]: x.franjas.map((f, k) => {
              const h = antes[k];
              if (!enTurno(p, f)) return 'fuera' as Hueco;
              if (h === undefined || h === 'fuera' || (cambios.rol && !daClase(p))) return huecoPorDefecto(p, f);
              return h;
            }),
          };
          return { personal, horario };
        }),
      darDeBaja: (id, baja) =>
        cambiar((x) => ({
          personal: x.personal.map((p) => (p.id === id ? { ...p, baja } : p)),
          ausentes: x.ausentes.filter((a) => a !== id),
        })),

      addPlanta: () => cambiar((x) => ({ plantas: [...x.plantas, { id: nuevoId('pl'), nombre: `Planta ${x.plantas.length}` }] })),
      renombrarPlanta: (id, nombre) => cambiar((x) => ({ plantas: x.plantas.map((p) => (p.id === id ? { ...p, nombre } : p)) })),
      quitarPlanta: (id) =>
        cambiar((x) => {
          const fuera = x.espacios.filter((e) => e.planta === id).map((e) => e.id);
          return {
            plantas: x.plantas.filter((p) => p.id !== id),
            espacios: x.espacios.filter((e) => e.planta !== id),
            horario: fuera.reduce(limpiarHorario, x.horario),
            materiales: x.materiales.map((mt) => (mt.espacio && fuera.includes(mt.espacio) ? { ...mt, espacio: null } : mt)),
          };
        }),
      // «¿Cuántas aulas tiene esta planta?»: añade o quita aulas de grupo
      numeroAulas: (plantaId, n) =>
        cambiar((x) => {
          const aulas = x.espacios.filter((e) => e.planta === plantaId && e.tipo === 'aula');
          if (n > aulas.length) {
            const nuevas = Array.from({ length: n - aulas.length }, (_, i) => ({
              id: nuevoId('e'),
              nombre: `Aula ${aulas.length + i + 1}`,
              tipo: 'aula' as const,
              planta: plantaId,
            }));
            return { espacios: [...x.espacios, ...nuevas] };
          }
          const sobran = aulas.slice(n).map((e) => e.id);
          return {
            espacios: x.espacios.filter((e) => !sobran.includes(e.id)),
            horario: sobran.reduce(limpiarHorario, x.horario),
            materiales: x.materiales.map((mt) => (mt.espacio && sobran.includes(mt.espacio) ? { ...mt, espacio: null } : mt)),
          };
        }),
      addEspacio: (plantaId, tipo) =>
        cambiar((x) => ({
          espacios: [
            ...x.espacios,
            { id: nuevoId('e'), nombre: tipo === 'aula' ? `Aula ${x.espacios.filter((e) => e.planta === plantaId && e.tipo === 'aula').length + 1}` : 'Nuevo espacio', tipo, planta: plantaId },
          ],
        })),
      editarEspacio: (id, cambios) => cambiar((x) => ({ espacios: x.espacios.map((e) => (e.id === id ? { ...e, ...cambios } : e)) })),
      quitarEspacio: (id) =>
        cambiar((x) => ({
          espacios: x.espacios.filter((e) => e.id !== id),
          horario: limpiarHorario(x.horario, id),
          materiales: x.materiales.map((mt) => (mt.espacio === id ? { ...mt, espacio: null } : mt)),
        })),

      ponerHueco: (personaId, franja, hueco) =>
        cambiar((x) => {
          const p = x.personal.find((q) => q.id === personaId);
          const hs = [...(x.horario[personaId] ?? x.franjas.map((f) => (p ? huecoPorDefecto(p, f) : 'libre')))];
          hs[franja] = hueco;
          return { horario: { ...x.horario, [personaId]: hs } };
        }),

      addMaterial: (mt, unidades) =>
        cambiar((x) => ({
          materiales: [
            ...x.materiales,
            ...Array.from({ length: Math.max(1, unidades) }, (_, i) => ({
              ...mt,
              id: nuevoId('m'),
              nombre: unidades > 1 ? `${mt.nombre} ${i + 1}` : mt.nombre,
            })),
          ],
        })),
      editarMaterial: (id, cambios) => cambiar((x) => ({ materiales: x.materiales.map((mt) => (mt.id === id ? { ...mt, ...cambios } : mt)) })),
      quitarMaterial: (id) => cambiar((x) => ({ materiales: x.materiales.filter((mt) => mt.id !== id) })),

      reservar: (franja, espacioId, motivo) => cambiar((x) => ({ reservas: { ...x.reservas, [`${franja}:${espacioId}`]: motivo } })),
      quitarReserva: (franja, espacioId) =>
        cambiar((x) => ({ reservas: Object.fromEntries(Object.entries(x.reservas).filter(([k]) => k !== `${franja}:${espacioId}`)) })),
      ausente: (personaId, si) =>
        cambiar((x) => {
          if (si) return { ausentes: [...new Set([...x.ausentes, personaId])] };
          // Al volver, se quitan las guardias que cubrían sus clases
          const suyas = (x.horario[personaId] ?? []).map((h, f) => (esClase(h) ? `${f}:${h.espacio}` : '')).filter(Boolean);
          return {
            ausentes: x.ausentes.filter((a) => a !== personaId),
            cubiertas: Object.fromEntries(Object.entries(x.cubiertas).filter(([k]) => !suyas.includes(k))),
          };
        }),
      cubrir: (franja, espacioId, quien) => cambiar((x) => ({ cubiertas: { ...x.cubiertas, [`${franja}:${espacioId}`]: quien } })),
      reiniciarCentro: () => setD(INICIAL),
    };
  }, [d]);

  return <CentroContext.Provider value={valor}>{children}</CentroContext.Provider>;
}

export function useCentro() {
  const c = useContext(CentroContext);
  if (!c) throw new Error('useCentro fuera de CentroProvider');
  return c;
}
