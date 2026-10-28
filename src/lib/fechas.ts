// Fechas de las tareas. La idea se escribe con palabras relativas («mañana»,
// «el jueves»), pero se guarda la fecha real: si no, una tarea de «Hoy»
// seguiría diciendo «Hoy» al día siguiente.

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const desdeIso = (f: string) => new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
const hoyIso = () => iso(new Date());

// «Jue» → la próxima fecha que sea jueves (hoy si hoy es jueves)
export function aFecha(dia: string | null, desde = new Date()): string | null {
  if (!dia) return null;
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  if (dia === 'Hoy') return iso(d);
  if (dia === 'Mañana') {
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  const objetivo = DIAS.indexOf(dia);
  if (objetivo < 0) return null;
  d.setDate(d.getDate() + ((objetivo - d.getDay() + 7) % 7));
  return iso(d);
}

// Días que faltan (negativo si ya pasó)
export function diasHasta(fecha: string) {
  return Math.round((desdeIso(fecha).getTime() - desdeIso(hoyIso()).getTime()) / 86_400_000);
}

// Texto corto para la etiqueta: Hoy, Mañana, Ayer, Jue 30 o 30 oct
export function etiquetaDia(fecha: string) {
  const n = diasHasta(fecha);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  const d = desdeIso(fecha);
  if (n > 1 && n < 7) return `${DIAS[d.getDay()]} ${d.getDate()}`;
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

type ConFecha = { fecha?: string | null; dia: string | null; hora: string | null };

// Etiqueta de una tarea: usa la fecha real si la tiene (tareas antiguas solo tienen «dia»)
export const diaDeTarea = (t: ConFecha) => (t.fecha ? etiquetaDia(t.fecha) : t.dia);

// Una tarea va con retraso si su fecha (y hora, si la tiene) ya pasó
export function atrasada(t: ConFecha) {
  if (!t.fecha) return false;
  const n = diasHasta(t.fecha);
  if (n < 0) return true;
  if (n > 0 || !t.hora) return false;
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}` > t.hora;
}

// Clave para ordenar por cercanía: fecha + hora (sin fecha, al final)
export function claveOrden(t: ConFecha) {
  const f = t.fecha ?? aFecha(t.dia) ?? '9999-12-31';
  return `${f} ${t.hora ?? '99:99'}`;
}
