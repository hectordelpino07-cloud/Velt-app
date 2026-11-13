// Generador de horarios. A partir de los grupos, las materias con sus horas
// y el profesorado, reparte quién da qué y coloca cada clase en la semana sin
// choques: nadie en dos sitios, ningún grupo con dos clases y ninguna aula
// específica con dos grupos a la vez. Después reparte las guardias.
//
// No usa IA ni servidor: prueba muchas combinaciones en el propio navegador,
// arregla los atascos moviendo clases y se queda con la mejor.
import { Clase, DIAS, esClase, esLugar, Espacio, Franja, Hueco, MateriaPlan, Plan, Semana, TurnoFranja } from '../data/centro';
import { daClase, Persona } from '../data/equipo';

// ¿Trabaja esta persona en esta hora? Respeta su hora de entrada y de salida
// y las horas sueltas que haya marcado como no disponibles.
export function trabaja(p: Persona, d: number, f: Franja) {
  if (p.entra && f.inicio < p.entra) return false;
  if (p.sale && f.fin > p.sale) return false;
  return !p.noPuede?.includes(`${d}:${f.id}`);
}

export type AvisoHorario = { tipo: 'plan' | 'falta' | 'sincolocar' | 'guardia'; texto: string };

export type DatosProfe = { lectivas: number; maximo: number; guardias: number; huecos: number };

export type Resultado = {
  semana: Record<string, Semana>; // solo docentes
  total: number; // clases que pide el plan
  colocadas: number;
  huecos: number; // horas sueltas entre clases, en total
  avisos: AvisoHorario[];
  porProfe: Record<string, DatosProfe>;
  combinaciones: number;
  ms: number;
};

export type Entrada = {
  franjas: Franja[];
  personal: Persona[];
  espacios: Espacio[];
  plan: Plan;
  semilla?: number;
  // Para encajar a alguien nuevo sin mover al resto: se respeta `actual` y
  // solo se crean los horarios de `soloPara`
  actual?: Record<string, Semana>;
  soloPara?: string[];
  combinaciones?: number; // tope de combinaciones a probar (24 si no se indica)
};

const N_DIAS = DIAS.length;

// Números al azar repetibles: la misma semilla da el mismo horario
function azar(semilla: number) {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gruposDe = (espacios: Espacio[]) => espacios.filter((e) => e.tipo === 'aula' && !e.cerrado);
export const docentesDe = (personal: Persona[]) => personal.filter((p) => !p.baja && daClase(p));
export const horasDe = (p: Persona, plan: Plan) => p.horas ?? (p.rol === 'Jefatura' ? Math.min(9, plan.horasLectivas) : plan.horasLectivas);
const enTurno = (p: Persona, turno: TurnoFranja) => p.turno === 'ambos' || p.turno === turno;

// Turno de un grupo: el que se haya elegido o, si el centro solo tiene uno, ese
export function turnoDeGrupo(grupoId: string, plan: Plan, franjas: Franja[]): TurnoFranja {
  const hay = (t: TurnoFranja) => franjas.some((f) => f.turno === t && !f.recreo);
  const elegido = plan.turnos[grupoId];
  if (elegido && hay(elegido)) return elegido;
  return hay('manana') ? 'manana' : 'tarde';
}

// Horas de clase a la semana que caben en un turno
export const horasSemana = (franjas: Franja[], turno: TurnoFranja) => franjas.filter((f) => f.turno === turno && !f.recreo).length * N_DIAS;

type Bloque = { g: number; m: MateriaPlan; horas: number; profe: string | null; sala: string | null; porDia: number[] };
type Puesta = { b: number; d: number; f: number };

const FIJO = -2; // clase que ya existía y no se mueve

function intento(e: Entrada, semilla: number) {
  const rnd = azar(semilla);
  const { franjas, plan } = e;
  const F = franjas.length;
  const grupos = gruposDe(e.espacios);
  const docentes = docentesDe(e.personal);
  const porId = Object.fromEntries(docentes.map((p) => [p.id, p]));
  const existe = new Set(e.espacios.map((x) => x.id));
  const libres = e.soloPara ? new Set(e.soloPara) : null; // a quién se le crea horario
  const seCrea = (id: string) => !libres || libres.has(id);

  // Cada docente puede tener horas en las que no trabaja (entra más tarde, se va antes, un día libre…)
  const puede = (id: string, d: number, f: number) => !porId[id] || trabaja(porId[id], d, franjas[f]);

  const tabla = () => Array.from({ length: N_DIAS }, () => new Array<number>(F).fill(-1));
  const ocG = grupos.map(tabla);
  const ocP: Record<string, number[][]> = Object.fromEntries(docentes.map((p) => [p.id, tabla()]));
  const ocE: Record<string, number[][]> = {};
  const sala = (id: string) => (ocE[id] ??= tabla());

  const turnos = grupos.map((g) => turnoDeGrupo(g.id, plan, franjas));
  const huecosG = grupos.map((_, gi) => franjas.filter((f) => f.turno === turnos[gi] && !f.recreo).map((f) => f.id));
  // Posición de cada franja dentro de las horas de clase de su turno (para medir huecos)
  const pos = franjas.map((f) => franjas.filter((x) => x.turno === f.turno && !x.recreo && x.id < f.id).length);

  // Lo que ya existe y no se toca: ocupa su sitio y cuenta como horas ya dadas
  const yaDadas: Record<string, number> = {};
  const cargaFija: Record<string, number> = {};
  if (e.actual && libres) {
    for (const p of docentes) {
      if (libres.has(p.id)) continue;
      (e.actual[p.id] ?? []).forEach((dia, d) =>
        dia.forEach((h, f) => {
          if (!esClase(h) || f >= F) return;
          ocP[p.id][d][f] = FIJO;
          const gi = grupos.findIndex((g) => g.nombre === h.grupo);
          if (gi >= 0) ocG[gi][d][f] = FIJO;
          if (h.espacio && (gi < 0 || h.espacio !== grupos[gi].id)) sala(h.espacio)[d][f] = FIJO;
          const k = `${h.grupo}|${h.materia}`;
          yaDadas[k] = (yaDadas[k] ?? 0) + 1;
          cargaFija[p.id] = (cargaFija[p.id] ?? 0) + 1;
        }),
      );
    }
  }

  // 1 · Qué hay que dar: un bloque por grupo y materia
  const bloques: Bloque[] = [];
  grupos.forEach((g, gi) => {
    for (const m of plan.materias) {
      const horas = m.horas - (yaDadas[`${g.nombre}|${m.nombre}`] ?? 0);
      if (horas > 0) bloques.push({ g: gi, m, horas, profe: null, sala: m.espacio && existe.has(m.espacio) ? m.espacio : null, porDia: new Array(N_DIAS).fill(0) });
    }
  });

  // 2 · Quién da cada bloque: primero lo que menos gente puede dar. Entre
  // quienes pueden, antes quien solo da esa materia (así completa su jornada)
  // y, a igualdad, quien tiene más parte de su jornada libre
  // Nadie puede dar más clases que horas tiene disponibles en la semana
  const libresDe = (p: Persona) => franjas.filter((f) => !f.recreo && enTurno(p, f.turno)).reduce((n, f) => n + Array.from({ length: N_DIAS }, (_, d) => d).filter((d) => puede(p.id, d, f.id)).length, 0);
  const resto: Record<string, number> = Object.fromEntries(docentes.map((p) => [p.id, Math.min(horasDe(p, plan), libresDe(p)) - (cargaFija[p.id] ?? 0)]));
  const tope: Record<string, number> = Object.fromEntries(docentes.map((p) => [p.id, Math.max(1, horasDe(p, plan))]));
  const sabe: Record<string, number> = Object.fromEntries(docentes.map((p) => [p.id, plan.materias.filter((m) => m.horas > 0 && m.profes.includes(p.id)).length]));
  const candidatos = (b: Bloque) => b.m.profes.filter((id) => porId[id] && seCrea(id) && enTurno(porId[id], turnos[b.g]));
  const orden = bloques.map((b, i) => ({ i, n: candidatos(b).length, r: rnd() })).sort((x, y) => x.n - y.n || bloques[y.i].horas - bloques[x.i].horas || x.r - y.r);
  for (const { i } of orden) {
    const b = bloques[i];
    const quien = candidatos(b)
      .filter((id) => resto[id] >= b.horas)
      .sort((x, y) => sabe[x] - sabe[y] || resto[y] / tope[y] - resto[x] / tope[x] || rnd() - 0.5)[0];
    if (quien) {
      b.profe = quien;
      resto[quien] -= b.horas;
    }
  }

  // 3 · Colocar cada clase en la semana
  const puestas: Puesta[] = [];
  const poner = (bi: number, d: number, f: number) => {
    const b = bloques[bi];
    ocG[b.g][d][f] = bi;
    ocP[b.profe!][d][f] = bi;
    if (b.sala) sala(b.sala)[d][f] = bi;
    b.porDia[d]++;
    puestas.push({ b: bi, d, f });
  };
  const quitar = (bi: number, d: number, f: number) => {
    const b = bloques[bi];
    ocG[b.g][d][f] = -1;
    ocP[b.profe!][d][f] = -1;
    if (b.sala) sala(b.sala)[d][f] = -1;
    b.porDia[d]--;
    const k = puestas.findIndex((x) => x.b === bi && x.d === d && x.f === f);
    if (k >= 0) puestas.splice(k, 1);
  };
  const maxDia = (b: Bloque) => Math.ceil(b.m.horas / N_DIAS);
  const cabe = (bi: number, d: number, f: number) => {
    const b = bloques[bi];
    return puede(b.profe!, d, f) && ocG[b.g][d][f] === -1 && ocP[b.profe!][d][f] === -1 && (!b.sala || sala(b.sala)[d][f] === -1) && b.porDia[d] < maxDia(b);
  };
  const clasesDia = (p: string, d: number) => ocP[p][d].reduce((n, x) => n + (x !== -1 ? 1 : 0), 0);
  const coste = (bi: number, d: number, f: number) => {
    const b = bloques[bi];
    const dia = ocP[b.profe!][d];
    const n = clasesDia(b.profe!, d);
    let c = huecosG[b.g].indexOf(f) * 1.2 + n * 2 + (n >= 5 ? 20 : 0) + rnd() * 1.5;
    if (n) {
      let cerca = 99;
      dia.forEach((x, k) => {
        if (x !== -1 && franjas[k].turno === franjas[f].turno) cerca = Math.min(cerca, Math.abs(pos[k] - pos[f]));
      });
      c += (cerca - 1) * 3;
    } else c += 1.5;
    return c;
  };
  const mejorSitio = (bi: number) => {
    const b = bloques[bi];
    let mejor: { d: number; f: number; c: number } | null = null;
    for (let d = 0; d < N_DIAS; d++)
      for (const f of huecosG[b.g])
        if (cabe(bi, d, f)) {
          const c = coste(bi, d, f);
          if (!mejor || c < mejor.c) mejor = { d, f, c };
        }
    return mejor;
  };
  // Si una clase no cabe en ningún sitio, se prueba a quitar la que estorba y recolocarla
  const desatascar = (bi: number) => {
    const b = bloques[bi];
    const sitios = huecosG[b.g].flatMap((f) => Array.from({ length: N_DIAS }, (_, d) => ({ d, f, r: rnd() }))).sort((x, y) => x.r - y.r);
    for (const { d, f } of sitios) {
      if (b.porDia[d] >= maxDia(b) || !puede(b.profe!, d, f)) continue;
      const estorban = [...new Set([ocG[b.g][d][f], ocP[b.profe!][d][f], b.sala ? sala(b.sala)[d][f] : -1].filter((x) => x !== -1))];
      if (!estorban.length || estorban.length > 2 || estorban.includes(FIJO) || estorban.includes(bi)) continue;
      estorban.forEach((x) => quitar(x, d, f));
      poner(bi, d, f);
      const movidas: Puesta[] = [];
      let bien = true;
      for (const x of estorban) {
        const s = mejorSitio(x);
        if (!s) {
          bien = false;
          break;
        }
        poner(x, s.d, s.f);
        movidas.push({ b: x, d: s.d, f: s.f });
      }
      if (bien) return true;
      movidas.forEach((m) => quitar(m.b, m.d, m.f));
      quitar(bi, d, f);
      estorban.forEach((x) => poner(x, d, f));
    }
    return false;
  };

  const carga: Record<string, number> = {};
  bloques.forEach((b) => b.profe && (carga[b.profe] = (carga[b.profe] ?? 0) + b.horas));
  const cola = bloques
    .map((b, i) => ({ i, peso: (b.profe ? carga[b.profe] : 0) + (b.sala ? 6 : 0) + b.horas + rnd() * 3 }))
    .filter((x) => bloques[x.i].profe)
    .sort((x, y) => y.peso - x.peso);
  const sinSitio: number[] = [];
  for (const { i } of cola)
    for (let k = 0; k < bloques[i].horas; k++) {
      const s = mejorSitio(i);
      if (s) poner(i, s.d, s.f);
      else if (!desatascar(i)) sinSitio.push(i);
    }

  // 4 · Pulir: cambiar de sitio dos clases del mismo grupo si así el
  // profesorado tiene menos horas sueltas entre clase y clase
  const huecosDia = (p: string, d: number) => {
    let n = 0;
    for (const turno of ['manana', 'tarde'] as TurnoFranja[]) {
      const ps = ocP[p][d].map((x, k) => (x !== -1 && franjas[k].turno === turno ? pos[k] : -1)).filter((x) => x >= 0);
      if (ps.length > 1) n += Math.max(...ps) - Math.min(...ps) + 1 - ps.length;
    }
    return n;
  };
  for (let vuelta = 0; vuelta < puestas.length * 40; vuelta++) {
    const a = puestas[Math.floor(rnd() * puestas.length)];
    if (!a) break;
    const ba = bloques[a.b];
    const d2 = Math.floor(rnd() * N_DIAS);
    const f2 = huecosG[ba.g][Math.floor(rnd() * huecosG[ba.g].length)];
    const otra = ocG[ba.g][d2][f2];
    if (otra === FIJO || otra === a.b || (d2 === a.d && f2 === a.f)) continue;
    const pa = ba.profe!;
    const pb = otra >= 0 ? bloques[otra].profe! : null;
    const dias = [...new Set([a.d, d2])];
    const antes = dias.reduce((n, d) => n + huecosDia(pa, d) + (pb && pb !== pa ? huecosDia(pb, d) : 0), 0);
    const { d: d1, f: f1 } = a;
    quitar(a.b, d1, f1);
    if (otra >= 0) quitar(otra, d2, f2);
    const vale = cabe(a.b, d2, f2) && (otra < 0 || cabe(otra, d1, f1));
    if (vale) {
      poner(a.b, d2, f2);
      if (otra >= 0) poner(otra, d1, f1);
      const despues = dias.reduce((n, d) => n + huecosDia(pa, d) + (pb && pb !== pa ? huecosDia(pb, d) : 0), 0);
      if (despues < antes || (despues === antes && rnd() < 0.15)) continue;
      quitar(a.b, d2, f2);
      if (otra >= 0) quitar(otra, d1, f1);
    }
    poner(a.b, d1, f1);
    if (otra >= 0) poner(otra, d2, f2);
  }

  const huecos = docentes.filter((p) => seCrea(p.id)).reduce((n, p) => n + Array.from({ length: N_DIAS }, (_, d) => huecosDia(p.id, d)).reduce((x, y) => x + y, 0), 0);
  const total = bloques.reduce((n, b) => n + b.horas, 0);
  return { grupos, docentes, bloques, ocP, puestas, sinSitio, total, huecos, nota: (total - puestas.length) * 1000 + huecos, seCrea, rnd };
}

type Intento = ReturnType<typeof intento>;

// Convierte la mejor combinación en el horario de cada docente y reparte guardias
function montar(e: Entrada, x: Intento): Pick<Resultado, 'semana' | 'avisos' | 'porProfe'> {
  const { franjas, plan } = e;
  const { grupos, docentes, bloques, ocP, rnd } = x;
  const existe = (id: string) => e.espacios.some((s) => s.id === id);
  const patio = existe('PATIO') ? 'PATIO' : e.espacios.find((s) => s.tipo === 'exterior')?.id;
  const despacho = existe('DIR') ? 'DIR' : null;
  const semana: Record<string, Semana> = {};
  const creados = docentes.filter((p) => x.seCrea(p.id));

  for (const p of creados)
    semana[p.id] = Array.from({ length: N_DIAS }, (_, d) =>
      franjas.map((f): Hueco => {
        if (!enTurno(p, f.turno) || !trabaja(p, d, f)) return 'fuera';
        const bi = ocP[p.id][d][f.id];
        if (bi < 0) return 'libre';
        const b = bloques[bi];
        return { espacio: b.sala ?? grupos[b.g].id, grupo: grupos[b.g].nombre, materia: b.m.nombre };
      }),
    );

  const hayClase = (id: string, d: number, f: number) => f >= 0 && f < franjas.length && esClase(semana[id][d][f]);
  const tramo = (id: string, d: number) => {
    const fs = semana[id][d].map((h, k) => (esClase(h) ? k : -1)).filter((k) => k >= 0);
    return fs.length ? [fs[0], fs[fs.length - 1]] : null;
  };
  const cupo: Record<string, number> = Object.fromEntries(creados.map((p) => [p.id, p.rol === 'Profesorado' ? plan.guardias : 0]));
  const guardiasDia = (id: string, d: number) => semana[id][d].filter((h) => h === 'guardia').length;
  // Guardias que ya hacen quienes no se tocan
  const yaDeGuardia = (d: number, f: number) => (e.actual && e.soloPara ? Object.entries(e.actual).filter(([id, s]) => !x.seCrea(id) && s[d]?.[f] === 'guardia').length : 0);

  // Guardias: en cada hora, quien ya está en el centro y lleva menos
  const sinGuardia: { d: number; f: number }[] = [];
  for (let d = 0; d < N_DIAS; d++)
    for (const f of franjas.filter((q) => !q.recreo)) {
      let hay = yaDeGuardia(d, f.id);
      while (hay < plan.guardiasPorFranja) {
        const quien = creados
          .filter((p) => cupo[p.id] > 0 && semana[p.id][d][f.id] === 'libre' && guardiasDia(p.id, d) < 2)
          .map((p) => {
            const t = tramo(p.id, d);
            const dentro = t && f.id > t[0] && f.id < t[1];
            const pegada = hayClase(p.id, d, f.id - 1) || hayClase(p.id, d, f.id + 1);
            // Lejos de sus clases, la guardia le obliga a esperar en el centro: cuanto más lejos, peor
            const lejos = t ? Math.max(0, t[0] - f.id, f.id - t[1]) : 0;
            return { id: p.id, c: (dentro ? -6 : pegada ? -3 : t ? lejos * 4 : 14) - cupo[p.id] * 2 + rnd() };
          })
          .sort((a, b) => a.c - b.c)[0];
        if (!quien) {
          sinGuardia.push({ d, f: f.id });
          break;
        }
        semana[quien.id][d][f.id] = 'guardia';
        cupo[quien.id]--;
        hay++;
      }
    }
  // Las guardias que quedan por repartir tapan horas sueltas entre clases
  for (const p of creados)
    for (let d = 0; d < N_DIAS && cupo[p.id] > 0; d++) {
      const t = tramo(p.id, d);
      if (!t) continue;
      for (let f = t[0] + 1; f < t[1] && cupo[p.id] > 0; f++)
        if (semana[p.id][d][f] === 'libre' && !franjas[f].recreo && guardiasDia(p.id, d) < 2) {
          semana[p.id][d][f] = 'guardia';
          cupo[p.id]--;
        }
    }
  // Recreo: una persona en el patio, por turnos
  const recreos: Record<string, number> = {};
  for (let d = 0; d < N_DIAS; d++)
    for (const f of franjas.filter((q) => q.recreo)) {
      const quien = creados
        .filter((p) => p.rol === 'Profesorado' && semana[p.id][d][f.id] === 'libre' && (hayClase(p.id, d, f.id - 1) || hayClase(p.id, d, f.id + 1)))
        .sort((a, b) => (recreos[a.id] ?? 0) - (recreos[b.id] ?? 0) || rnd() - 0.5)[0];
      if (!quien) continue;
      semana[quien.id][d][f.id] = patio ? { lugar: patio, motivo: 'Guardia de recreo' } : 'guardia';
      recreos[quien.id] = (recreos[quien.id] ?? 0) + 1;
    }

  const porProfe: Record<string, DatosProfe> = {};
  for (const p of creados) {
    let lectivas = 0;
    let guardias = 0;
    let huecos = 0;
    semana[p.id] = semana[p.id].map((dia) => {
      // Jefatura está en su despacho cuando no da clase
      if (p.rol === 'Jefatura') dia = dia.map((h) => (h === 'libre' && despacho ? { lugar: despacho, motivo: 'Jefatura de estudios' } : h));
      const con = dia.map((h, k) => (esClase(h) || h === 'guardia' || esLugar(h) ? k : -1)).filter((k) => k >= 0);
      const [a, z] = con.length ? [con[0], con[con.length - 1]] : [1, 0];
      return dia.map((h, k) => {
        if (esClase(h)) lectivas++;
        if (h === 'guardia') guardias++;
        // Antes de su primera hora y después de la última no está en el centro
        if (h === 'libre' && (k < a || k > z)) return 'fuera';
        if (h === 'libre' && !franjas[k].recreo) huecos++;
        return h;
      });
    });
    porProfe[p.id] = { lectivas, maximo: horasDe(p, plan), guardias, huecos };
  }

  // Avisos: lo que jefatura tiene que saber antes de publicar
  const avisos: AvisoHorario[] = [];
  const turnosUsados = [...new Set(grupos.map((g) => turnoDeGrupo(g.id, plan, franjas)))];
  const suma = plan.materias.reduce((n, m) => n + m.horas, 0);
  for (const t of turnosUsados) {
    const caben = horasSemana(franjas, t);
    if (suma > caben) avisos.push({ tipo: 'plan', texto: `Las materias suman ${suma} horas a la semana y en el turno de ${t === 'manana' ? 'mañana' : 'tarde'} solo caben ${caben}. Quita ${suma - caben} ${suma - caben === 1 ? 'hora' : 'horas'} o añade horas a la jornada.` });
  }
  const faltan: Record<string, { horas: number; grupos: number }> = {};
  bloques.filter((b) => !b.profe).forEach((b) => {
    const r = (faltan[b.m.nombre] ??= { horas: 0, grupos: 0 });
    r.horas += b.horas;
    r.grupos++;
  });
  Object.entries(faltan).forEach(([materia, r]) =>
    avisos.push({ tipo: 'falta', texto: `${materia}: ${r.horas} horas sin docente (${r.grupos} ${r.grupos === 1 ? 'grupo' : 'grupos'}). Hace falta otra persona que pueda darla o subir las horas de quien ya la da.` }),
  );
  if (x.sinSitio.length) {
    const ej = [...new Set(x.sinSitio.map((bi) => `${bloques[bi].m.nombre} de ${grupos[bloques[bi].g].nombre}`))].slice(0, 3).join(', ');
    avisos.push({ tipo: 'sincolocar', texto: `${x.sinSitio.length} ${x.sinSitio.length === 1 ? 'clase no ha encontrado' : 'clases no han encontrado'} hueco (${ej}). Prueba otra combinación o revisa las aulas específicas.` });
  }
  if (sinGuardia.length) {
    const s = sinGuardia[0];
    avisos.push({ tipo: 'guardia', texto: `${sinGuardia.length} ${sinGuardia.length === 1 ? 'hora queda' : 'horas quedan'} sin nadie de guardia (por ejemplo, ${DIAS[s.d].toLowerCase()} a ${franjas[s.f].nombre}). Sube las guardias por docente.` });
  }
  return { semana, avisos, porProfe };
}

// Crea el horario: prueba varias combinaciones y devuelve la mejor
export function generar(e: Entrada): Resultado {
  const inicio = Date.now();
  const base = e.semilla ?? 1;
  let mejor: Intento | null = null;
  let combinaciones = 0;
  // Hasta 24 combinaciones o medio segundo, lo que llegue antes
  const tope = e.combinaciones ?? 24;
  while (combinaciones < tope && (combinaciones < 3 || Date.now() - inicio < 500)) {
    const x = intento(e, base * 7919 + combinaciones * 104729);
    combinaciones++;
    if (!mejor || x.nota < mejor.nota) mejor = x;
    if (mejor.nota === 0) break;
  }
  const x = mejor!;
  const hecho = montar(e, x);
  // Horas sueltas que quedan de verdad, una vez repartidas las guardias
  const huecos = Object.values(hecho.porProfe).reduce((n, p) => n + p.huecos, 0);
  return { ...hecho, total: x.total, colocadas: x.puestas.length, huecos, combinaciones, ms: Date.now() - inicio };
}

// ——— Consultas sobre un horario ya hecho ———

// Clase que tiene un grupo en un día y hora: quién la da y cuál es
export function claseDeGrupo(semana: Record<string, Semana>, grupo: string, d: number, f: number): { profe: string; clase: Clase } | null {
  for (const [profe, s] of Object.entries(semana)) {
    const h = s[d]?.[f];
    if (esClase(h) && h.grupo === grupo) return { profe, clase: h };
  }
  return null;
}

export function resumenSemana(s: Semana | undefined) {
  let lectivas = 0;
  let guardias = 0;
  (s ?? []).forEach((dia) =>
    dia.forEach((h) => {
      if (esClase(h)) lectivas++;
      else if (h === 'guardia' || (esLugar(h) && h.motivo === 'Guardia de recreo')) guardias++;
    }),
  );
  return { lectivas, guardias };
}
