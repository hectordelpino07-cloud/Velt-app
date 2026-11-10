// Estado del centro: jornada (franjas), personal, plantas, espacios, el horario
// semanal, el plan del curso, material, reservas y las ausencias del día. Se guarda en el navegador como las tareas, así nada se
// pierde al cambiar de pantalla. Cuando haya servidor, solo cambia este archivo.
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  DIAS,
  diaDeHoy,
  Espacio,
  ESPACIOS_INICIALES,
  Franja,
  FRANJAS_INICIALES,
  esClase,
  esLugar,
  Hueco,
  JORNADAS,
  Lugar,
  Material,
  MateriaPlan,
  MATERIALES_INICIALES,
  Plan,
  PLAN_INICIAL,
  Planta,
  PLANTAS_INICIALES,
  RESERVAS_INICIALES,
  Semana,
  sumarMinutos,
  TipoEspacio,
  TurnoFranja,
} from '../data/centro';
import { daClase, EQUIPO_INICIAL, Persona, sincronizarEquipo } from '../data/equipo';
import { generar } from './horarios';

type Datos = {
  franjas: Franja[];
  personal: Persona[];
  plantas: Planta[];
  espacios: Espacio[];
  semana: Record<string, Semana>; // persona → [día][franja]
  plan: Plan;
  publicado: number | null; // cuándo se publicó el último horario creado por VELT
  materiales: Material[];
  reservas: Record<string, string>; // 'franja:espacio' → motivo
  ausentes: string[];
  cubiertas: Record<string, string>; // 'franja:espacio' → quien cubre
};

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

const semanaPorDefecto = (p: Persona, franjas: Franja[]): Semana => DIAS.map(() => franjas.map((f) => huecoPorDefecto(p, f)));

// Datos de ejemplo: el horario del profesorado lo crea el propio generador
function inicial(): Datos {
  const base = { franjas: FRANJAS_INICIALES, personal: EQUIPO_INICIAL, espacios: ESPACIOS_INICIALES, plan: PLAN_INICIAL };
  const semana: Record<string, Semana> = Object.fromEntries(EQUIPO_INICIAL.map((p) => [p.id, semanaPorDefecto(p, FRANJAS_INICIALES)]));
  Object.assign(semana, generar({ ...base, semilla: 3, combinaciones: 4 }).semana);
  // Conserjería abre la puerta del patio en el recreo; dirección recibe familias los miércoles
  const recreo = FRANJAS_INICIALES.find((f) => f.recreo)?.id;
  if (recreo !== undefined) semana.carmen = semana.carmen.map((dia) => dia.map((h, f) => (f === recreo ? { lugar: 'PATIO', motivo: 'Puerta del patio' } : h)));
  semana.pablo[2][2] = { lugar: 'BIB', motivo: 'Reunión con familias' };
  return {
    ...base,
    plantas: PLANTAS_INICIALES,
    semana,
    publicado: null,
    materiales: MATERIALES_INICIALES,
    reservas: RESERVAS_INICIALES,
    ausentes: [],
    cubiertas: {},
  };
}

const CLAVE = 'velt.centro.v3';
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;

function cargar(): Datos {
  try {
    const raw = almacen?.getItem(CLAVE);
    if (raw) return { ...inicial(), ...JSON.parse(raw) };
  } catch {
    // datos ilegibles: se empieza de cero
  }
  return inicial();
}

// Al cambiar las franjas, cada persona conserva lo que tenía en las horas que
// siguen existiendo (misma hora de inicio y turno) y el resto se rellena solo
function reajustarHorario(x: Datos, nuevas: Franja[]): Record<string, Semana> {
  return Object.fromEntries(
    x.personal.map((p) => [
      p.id,
      DIAS.map((_, d) => {
        const antes = x.semana[p.id]?.[d] ?? [];
        return nuevas.map((f) => {
          const i = x.franjas.findIndex((o) => o.inicio === f.inicio && o.turno === f.turno);
          return i >= 0 && antes[i] !== undefined && enTurno(p, f) ? antes[i] : huecoPorDefecto(p, f);
        });
      }),
    ]),
  );
}

const numerar = (fs: Franja[]) => fs.map((f, id) => ({ ...f, id }));

const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type Ctx = Datos & {
  dia: number; // día de hoy (0 = lunes)
  horario: Record<string, Hueco[]>; // lo que hace hoy cada persona, por franja
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
  ponerHueco: (personaId: string, franja: number, hueco: Hueco, dia?: number) => void;
  // Plan del curso y horario creado por VELT
  editarPlan: (cambios: Partial<Plan>) => void;
  editarMateria: (id: string, cambios: Partial<MateriaPlan>) => void;
  addMateria: () => void;
  quitarMateria: (id: string) => void;
  publicarHorario: (semana: Record<string, Semana>) => void;
  traspasarHorario: (de: string, a: string) => void;
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
  const dia = diaDeHoy();

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        almacen?.setItem(CLAVE, JSON.stringify(d));
      } catch {
        // sin almacenamiento: sigue funcionando en memoria
      }
    }, 250);
    return () => clearTimeout(t);
  }, [d]);

  // El resto de la app consulta el personal en data/equipo.ts
  sincronizarEquipo(d.personal);

  const valor = useMemo<Ctx>(() => {
    const porId = Object.fromEntries(d.espacios.map((e) => [e.id, e]));
    const cambiar = (f: (x: Datos) => Partial<Datos>) => setD((x) => ({ ...x, ...f(x) }));

    // Si se borra un espacio, las clases que había allí pasan a «libre»
    const limpiarHorario = (semana: Record<string, Semana>, id: string) =>
      Object.fromEntries(
        Object.entries(semana).map(([p, dias]) => [
          p,
          dias.map((hs) => hs.map((h) => ((esClase(h) && h.espacio === id) || (esLugar(h) && h.lugar === id) ? 'libre' : h))),
        ]),
      ) as Record<string, Semana>;
    const horario = Object.fromEntries(Object.entries(d.semana).map(([p, dias]) => [p, dias[dia] ?? []]));

    return {
      ...d,
      dia,
      horario,
      espacio: (id) => porId[id],
      nombreEspacio: (id) => (id ? porId[id]?.nombre ?? 'Espacio borrado' : 'Almacén'),

      ponerJornada: (id) =>
        cambiar((x) => {
          const j = JORNADAS.find((q) => q.id === id);
          if (!j) return {};
          return { franjas: j.franjas, semana: reajustarHorario(x, j.franjas), reservas: {}, cubiertas: {} };
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
          return { franjas: nuevas, semana: reajustarHorario(x, nuevas), reservas: {}, cubiertas: {} };
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
          semana: Object.fromEntries(Object.entries(x.semana).map(([p, dias]) => [p, dias.map((hs) => hs.filter((_, k) => k !== i))])),
          reservas: {},
          cubiertas: {},
        })),

      addPersona: () =>
        cambiar((x) => {
          const nueva: Persona = { id: nuevoId('p'), nombre: 'Nuevo', apellido: 'profesor', rol: 'Profesorado', turno: 'manana', materia: '' };
          return { personal: [...x.personal, nueva], semana: { ...x.semana, [nueva.id]: semanaPorDefecto(nueva, x.franjas) } };
        }),
      editarPersona: (id, cambios) =>
        cambiar((x) => {
          const personal = x.personal.map((p) => (p.id === id ? { ...p, ...cambios } : p));
          if (!cambios.turno && !cambios.rol) return { personal };
          // Si cambia el turno o el puesto, se ajustan las horas que ya no le tocan
          const p = personal.find((q) => q.id === id)!;
          const semana = {
            ...x.semana,
            [id]: DIAS.map((_, dd) =>
              x.franjas.map((f, k) => {
                const h = x.semana[id]?.[dd]?.[k];
                if (!enTurno(p, f)) return 'fuera' as Hueco;
                if (h === undefined || h === 'fuera' || (cambios.rol && !daClase(p))) return huecoPorDefecto(p, f);
                return h;
              }),
            ),
          };
          return { personal, semana };
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
            semana: fuera.reduce(limpiarHorario, x.semana),
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
            semana: sobran.reduce(limpiarHorario, x.semana),
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
          semana: limpiarHorario(x.semana, id),
          materiales: x.materiales.map((mt) => (mt.espacio === id ? { ...mt, espacio: null } : mt)),
        })),

      ponerHueco: (personaId, franja, hueco, enDia = dia) =>
        cambiar((x) => {
          const p = x.personal.find((q) => q.id === personaId);
          const dias = (x.semana[personaId] ?? DIAS.map(() => x.franjas.map((f) => (p ? huecoPorDefecto(p, f) : ('libre' as Hueco))))).map((hs) => [...hs]);
          dias[enDia][franja] = hueco;
          return { semana: { ...x.semana, [personaId]: dias } };
        }),

      editarPlan: (cambios) => cambiar((x) => ({ plan: { ...x.plan, ...cambios } })),
      editarMateria: (id, cambios) => cambiar((x) => ({ plan: { ...x.plan, materias: x.plan.materias.map((m) => (m.id === id ? { ...m, ...cambios } : m)) } })),
      addMateria: () => cambiar((x) => ({ plan: { ...x.plan, materias: [...x.plan.materias, { id: nuevoId('mat'), nombre: 'Nueva materia', horas: 1, profes: [] }] } })),
      quitarMateria: (id) => cambiar((x) => ({ plan: { ...x.plan, materias: x.plan.materias.filter((m) => m.id !== id) } })),
      // El horario nuevo sustituye al del profesorado; el resto del personal no cambia
      publicarHorario: (semana) => cambiar((x) => ({ semana: { ...x.semana, ...semana }, publicado: Date.now(), cubiertas: {} })),
      // Sustituciones: quien llega recibe tal cual el horario de quien se va
      traspasarHorario: (de, a) =>
        cambiar((x) => {
          const origen = x.personal.find((q) => q.id === de);
          if (!origen || !x.semana[de]) return {};
          return { semana: { ...x.semana, [a]: x.semana[de], [de]: semanaPorDefecto(origen, x.franjas) } };
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
          const suyas = (x.semana[personaId]?.[dia] ?? []).map((h, f) => (esClase(h) ? `${f}:${h.espacio}` : '')).filter(Boolean);
          return {
            ausentes: x.ausentes.filter((a) => a !== personaId),
            cubiertas: Object.fromEntries(Object.entries(x.cubiertas).filter(([k]) => !suyas.includes(k))),
          };
        }),
      cubrir: (franja, espacioId, quien) => cambiar((x) => ({ cubiertas: { ...x.cubiertas, [`${franja}:${espacioId}`]: quien } })),
      reiniciarCentro: () => setD(inicial()),
    };
  }, [d, dia]);

  return <CentroContext.Provider value={valor}>{children}</CentroContext.Provider>;
}

export function useCentro() {
  const c = useContext(CentroContext);
  if (!c) throw new Error('useCentro fuera de CentroProvider');
  return c;
}
