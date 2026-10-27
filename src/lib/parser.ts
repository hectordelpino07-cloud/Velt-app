// Convierte una idea escrita por dirección en tareas con responsable y fecha.
//
// Versión 1: reglas en el propio dispositivo (sin IA ni servidor). Así no sale
// ningún dato del centro y funciona sin coste. Entiende frases del tipo
// «Necesito que Raúl cubra la guardia, que Carmen abra el salón y que alguien
// avise a las familias». Lo que no sabe deducir lo convierte en una pregunta.
// Más adelante este archivo se puede sustituir por una llamada a un modelo de
// lenguaje en el servidor, manteniendo los mismos tipos de salida.
import { EQUIPO, DIRECTOR, Persona } from '../data/equipo';

export type TareaPropuesta = {
  id: string;
  titulo: string;
  responsableId: string | null;
  dia: string | null; // 'Lun', 'Mar'… u 'Hoy' / 'Mañana'
  hora: string | null; // '17:00'
  nota?: string;
};

export type Opcion = { valor: string; etiqueta: string; detalle?: string };

export type Pregunta = {
  id: string;
  tipo: 'responsable' | 'dia' | 'hora';
  tareaId?: string;
  texto: string;
  opciones: Opcion[];
};

export type Analisis = {
  tareas: TareaPropuesta[];
  preguntas: Pregunta[];
  excluidos: string[]; // ids de personas que la idea pide no cargar
  porque: string; // frases de contexto, se envían como «Por qué»
};

// Quita tildes y pasa a minúsculas sin cambiar la longitud del texto,
// para poder usar las mismas posiciones en el original y en el normalizado.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const DIAS: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom', hoy: 'Hoy',
};

function buscarDia(t: string): string | null {
  const n = norm(t);
  const m = n.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|hoy)\b/);
  if (m) return DIAS[m[1]];
  // «mañana» como día, no «por la mañana» ni «pasado mañana»
  if (/(^|[^a-z])(?<!la |pasado |esta )manana\b/.test(n)) return 'Mañana';
  return null;
}

function buscarHora(t: string): string | null {
  const n = norm(t);
  let m = n.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (!m) m = n.match(/\ba las? (\d{1,2})\b(?![.:]?\s*[ºª])(?:\s*(?:h|horas)\b)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ?? '00';
  if (h > 23 || parseInt(min, 10) > 59) return null;
  // En un centro, «a las 5» es por la tarde
  if (h >= 1 && h <= 7 && !m[2]) h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

// Subjuntivo (cómo se dice tras «que») → infinitivo (cómo se escribe una tarea)
const VERBOS: Record<string, string> = {
  abra: 'abrir', anote: 'anotar', avise: 'avisar', baje: 'bajar', busque: 'buscar', cierre: 'cerrar', compruebe: 'comprobar',
  confirme: 'confirmar', coordine: 'coordinar', cubra: 'cubrir', cuelgue: 'colgar', de: 'dar', 'dé': 'dar', diga: 'decir',
  empiece: 'empezar', encienda: 'encender', envie: 'enviar', escriba: 'escribir', este: 'estar', haga: 'hacer', hable: 'hablar',
  imprima: 'imprimir', lea: 'leer', lleve: 'llevar', llame: 'llamar', mande: 'mandar', monte: 'montar', mueva: 'mover',
  organice: 'organizar', pague: 'pagar', pase: 'pasar', pida: 'pedir', ponga: 'poner', prepare: 'preparar', recoja: 'recoger',
  redacte: 'redactar', repase: 'repasar', reserve: 'reservar', revise: 'revisar', saque: 'sacar', sepa: 'saber', suba: 'subir',
  sustituya: 'sustituir', traiga: 'traer', vaya: 'ir', vea: 'ver', venga: 'venir', actualice: 'actualizar', limpie: 'limpiar',
  apunte: 'apuntar', ayude: 'ayudar', atienda: 'atender', acompane: 'acompañar', recuerde: 'recordar', publique: 'publicar',
  convoque: 'convocar', elabore: 'elaborar', entregue: 'entregar', firme: 'firmar', guarde: 'guardar', quite: 'quitar',
};

function aInfinitivo(palabra: string): string {
  const n = norm(palabra);
  if (VERBOS[n]) return VERBOS[n];
  if (/(ar|er|ir)$/.test(n)) return palabra; // ya está en infinitivo («hay que revisar…»)
  if (n.endsWith('que')) return palabra.slice(0, -3) + 'car';
  if (n.endsWith('gue')) return palabra.slice(0, -3) + 'gar';
  if (n.endsWith('ce')) return palabra.slice(0, -2) + 'zar';
  if (n.endsWith('e') && n.length > 3) return palabra.slice(0, -1) + 'ar';
  return palabra;
}

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Busca a una persona del equipo al principio del fragmento (el sujeto).
function sujeto(frag: string): { persona: Persona | null; resto: string; anonimo: boolean } {
  const n = norm(frag);
  const anon = n.match(/^(?:alguien|quien pueda|cualquiera|alguno|alguna)\b\s*/);
  if (anon) return { persona: null, resto: frag.slice(anon[0].length), anonimo: true };
  for (const p of EQUIPO) {
    const claves = [p.nombre, ...(p.alias ?? [])].map(norm).sort((a, b) => b.length - a.length);
    for (const c of claves) {
      const m = n.match(new RegExp(`^(?:(?:el|la) )?${c}\\b(?: ${norm(p.apellido)}\\b)?[,:]?\\s*`));
      if (m) return { persona: p, resto: frag.slice(m[0].length), anonimo: false };
    }
  }
  return { persona: null, resto: frag, anonimo: false };
}

// Quita del título las referencias de fecha y hora (ya van en la etiqueta)
function limpiarTitulo(t: string): string {
  return t
    .replace(/\b(?:para |antes de(?:l)? |el |este )?(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi, '')
    .replace(/\b(?:para |antes de )?(?:hoy|ma[nñ]ana)\b(?! (?:por|de) la)/gi, '')
    .replace(/\b(?:a|para|antes de) las? \d{1,2}(?:[:.]\d{2})?(?:\s*h(?:oras)?)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,;:.]+$/g, '')
    .trim();
}

function tituloDe(resto: string): { titulo: string; nota?: string } {
  let r = resto.trim();
  let nota: string | undefined;
  // «se encargue de abrir…» → «abrir…»
  r = r.replace(/^(?:se )?(?:encargue|ocupe|encarguen|ocupen)\s+de\s+/i, '');
  // «me pase el horario» → «pasar el horario», con nota para quién es
  const cl = r.match(/^(me|nos)\s+/i);
  if (cl) {
    r = r.slice(cl[0].length);
    nota = `Para ${DIRECTOR.nombre} (dirección)`;
  }
  const [primera, ...resto2] = r.split(/\s+/);
  const titulo = limpiarTitulo([aInfinitivo(primera ?? ''), ...resto2].join(' '));
  return { titulo: mayus(titulo), nota };
}

// Personas que la idea pide no cargar: «Raúl ya va justo», «menos Marta»…
function buscarExcluidos(texto: string): string[] {
  const n = norm(texto);
  return EQUIPO.filter((p) => {
    const c = norm(p.nombre);
    return (
      new RegExp(`\\b${c}\\b (?:ya )?(?:va (?:muy )?justo|va (?:muy )?justa|no puede|esta de baja|no esta|no viene|falta|esta (?:muy )?liad[oa]|tiene mucho)`).test(n) ||
      new RegExp(`\\b(?:falta|no viene|no esta) ${c}\\b`).test(n) ||
      new RegExp(`\\b(?:menos|excepto|salvo|sin contar con|que no sea) (?:a )?${c}\\b`).test(n)
    );
  }).map((p) => p.id);
}

const MARCADORES =
  /(?:\b(?:necesito|quiero|me gustaria|hace falta|haria falta|pido|os pido|te pido|habria que|seria bueno)\s+que\s+|,\s*(?:y\s+)?que\s+|\s+y\s+que\s+|^\s*que\s+|\bhay que\s+|\btendriamos que\s+|\btenemos que\s+)/g;

let contador = 0;
const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

export function analizarIdea(texto: string, cargaActual: Record<string, number> = {}): Analisis {
  const limpio = texto.normalize('NFC').trim();
  const frases = limpio.split(/(?<=[.!?;])\s+|\n+/).map((f) => f.trim()).filter(Boolean);
  const excluidos = buscarExcluidos(limpio);
  const contexto: string[] = [];
  const tareas: TareaPropuesta[] = [];

  for (const frase of frases) {
    const sinVineta = frase.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '');
    const esVineta = sinVineta !== frase;
    const n = norm(sinVineta);
    const marcas = [...n.matchAll(MARCADORES)];

    const fragmentos: string[] = [];
    if (marcas.length) {
      const antes = sinVineta.slice(0, marcas[0].index).trim();
      if (antes) contexto.push(antes);
      marcas.forEach((m, i) => {
        const ini = m.index! + m[0].length;
        const fin = i + 1 < marcas.length ? marcas[i + 1].index! : sinVineta.length;
        fragmentos.push(sinVineta.slice(ini, fin));
      });
    } else {
      // «Raúl: revisar el horario» o una lista con viñetas también son tareas
      const s = sujeto(sinVineta);
      const conDosPuntos = /^[^\s,:]+(?:\s[^\s,:]+)?\s*[,:]/.test(sinVineta);
      if (esVineta || (s.persona && conDosPuntos && s.persona.id !== DIRECTOR.id)) fragmentos.push(sinVineta);
      else contexto.push(frase);
    }

    for (const bruto of fragmentos) {
      const frag = bruto.replace(/[\s,;.!]+$/g, '').trim();
      if (frag.split(/\s+/).length < 2) continue;
      const s = sujeto(frag);
      const { titulo, nota } = tituloDe(s.resto);
      if (titulo.length < 3) continue;
      tareas.push({
        id: nuevoId('t'),
        titulo,
        responsableId: s.persona && s.persona.id !== DIRECTOR.id ? s.persona.id : null,
        dia: buscarDia(frag),
        hora: buscarHora(frag),
        nota,
      });
    }
  }

  // Lo que no se dice en la tarea se hereda de la idea completa
  const diaGlobal = buscarDia(limpio);
  const horaGlobal = buscarHora(limpio);
  for (const t of tareas) {
    t.dia ??= diaGlobal;
    t.hora ??= t.dia && t.dia === diaGlobal ? horaGlobal : null;
  }

  const preguntas: Pregunta[] = [];
  const carga: Record<string, number> = { ...cargaActual };
  tareas.forEach((t) => t.responsableId && (carga[t.responsableId] = (carga[t.responsableId] ?? 0) + 1));

  for (const t of tareas.filter((x) => !x.responsableId)) {
    preguntas.push({
      id: nuevoId('p'),
      tipo: 'responsable',
      tareaId: t.id,
      texto: `¿Quién se encarga de «${t.titulo.charAt(0).toLowerCase() + t.titulo.slice(1)}»?`,
      opciones: candidatos(t.titulo, excluidos, carga),
    });
  }
  if (tareas.some((t) => !t.dia)) {
    preguntas.push({
      id: nuevoId('p'),
      tipo: 'dia',
      texto: '¿Para cuándo tiene que estar hecho?',
      opciones: ['Hoy', 'Mañana', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((d) => ({ valor: d, etiqueta: d })),
    });
  } else if (tareas.some((t) => !t.hora)) {
    preguntas.push({
      id: nuevoId('p'),
      tipo: 'hora',
      texto: '¿A qué hora tiene que estar listo?',
      opciones: ['08:00', '11:30', '14:00', '17:00'].map((h) => ({ valor: h, etiqueta: h })),
    });
  }

  // El «por qué» lo lee el equipo: nunca debe incluir comentarios sobre
  // compañeros («Raúl ya va justo»), que son solo para dirección.
  const porque = contexto.filter((f) => buscarExcluidos(f).length === 0).join(' ');
  return { tareas, preguntas, excluidos, porque };
}

// Propone a quién asignar: primero quien encaja por su puesto, luego quien
// tiene menos tareas. Nunca al director ni a quien la idea pide no cargar.
function candidatos(titulo: string, excluidos: string[], carga: Record<string, number>): Opcion[] {
  const t = norm(titulo);
  const pista = /abrir|cerrar|llave|conserj|salon|montar|sillas|mover/.test(t)
    ? 'carmen'
    : /fotocop|imprim|secretar|matricul|certificad|correo|familias/.test(t)
      ? 'luis'
      : /horario|cuadrante/.test(t)
        ? 'ines'
        : null;
  return EQUIPO.filter((p) => p.id !== DIRECTOR.id && !excluidos.includes(p.id))
    .map((p) => ({ p, c: carga[p.id] ?? 0 }))
    .sort((a, b) => (a.p.id === pista ? -1 : b.p.id === pista ? 1 : a.c - b.c))
    .slice(0, 4)
    .map(({ p, c }) => ({
      valor: p.id,
      etiqueta: p.nombre,
      detalle: p.id === pista ? 'Por su puesto' : c === 0 ? 'Sin tareas' : `${c} ${c === 1 ? 'tarea' : 'tareas'}`,
    }));
}
