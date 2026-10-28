// Horario y espacios de ejemplo del centro. Datos inventados.
// Con esto se calcula, para cada franja, qué aula está ocupada y dónde
// está cada persona. Cuando haya servidor, saldrá del horario real del centro.

export type Franja = { id: number; inicio: string; fin: string; nombre: string; recreo?: boolean };

export const FRANJAS: Franja[] = [
  { id: 0, inicio: '08:15', fin: '09:15', nombre: '1.ª hora' },
  { id: 1, inicio: '09:15', fin: '10:15', nombre: '2.ª hora' },
  { id: 2, inicio: '10:15', fin: '11:15', nombre: '3.ª hora' },
  { id: 3, inicio: '11:15', fin: '11:45', nombre: 'Recreo', recreo: true },
  { id: 4, inicio: '11:45', fin: '12:45', nombre: '4.ª hora' },
  { id: 5, inicio: '12:45', fin: '13:45', nombre: '5.ª hora' },
  { id: 6, inicio: '13:45', fin: '14:45', nombre: '6.ª hora' },
];

export type TipoEspacio = 'aula' | 'especial' | 'oficina' | 'exterior';

export type Espacio = { id: string; nombre: string; tipo: TipoEspacio; incidencia?: string };

export const ESPACIOS: Record<string, Espacio> = {
  '1A': { id: '1A', nombre: '1.º ESO A', tipo: 'aula' },
  '1B': { id: '1B', nombre: '1.º ESO B', tipo: 'aula' },
  '2A': { id: '2A', nombre: '2.º ESO A', tipo: 'aula' },
  '2B': { id: '2B', nombre: '2.º ESO B', tipo: 'aula' },
  '3A': { id: '3A', nombre: '3.º ESO A', tipo: 'aula' },
  '4A': { id: '4A', nombre: '4.º ESO A', tipo: 'aula' },
  LAB: { id: 'LAB', nombre: 'Lab. Ciencias', tipo: 'especial' },
  INF: { id: 'INF', nombre: 'Informática', tipo: 'especial', incidencia: 'Proyector averiado desde ayer' },
  MUS: { id: 'MUS', nombre: 'Aula de Música', tipo: 'especial' },
  DIR: { id: 'DIR', nombre: 'Dirección', tipo: 'oficina' },
  SEC: { id: 'SEC', nombre: 'Secretaría', tipo: 'oficina' },
  CON: { id: 'CON', nombre: 'Conserjería', tipo: 'oficina' },
  SALA: { id: 'SALA', nombre: 'Sala de profesores', tipo: 'oficina' },
  BIB: { id: 'BIB', nombre: 'Biblioteca', tipo: 'especial' },
  GIM: { id: 'GIM', nombre: 'Gimnasio', tipo: 'especial' },
  PATIO: { id: 'PATIO', nombre: 'Patio', tipo: 'exterior' },
  PISTA: { id: 'PISTA', nombre: 'Pista deportiva', tipo: 'exterior' },
};

// Cada planta en filas; entre fila y fila se dibuja un pasillo
export const PLANTAS = [
  { id: 'p1', nombre: 'Planta 1', filas: [['1A', '1B', '2A', '2B'], ['3A', '4A'], ['LAB', 'INF', 'MUS']] },
  { id: 'pb', nombre: 'Planta baja', filas: [['DIR', 'SEC', 'CON'], ['SALA', 'BIB'], ['GIM']] },
  { id: 'ex', nombre: 'Patio', filas: [['PATIO', 'PISTA']] },
];

export const PASILLO = 'Pasillo planta 1';

// Lo que hace cada persona en cada franja (índice = franja):
// clase { espacio, grupo, materia } · 'guardia' · 'libre' · { lugar } fijo
export type Clase = { espacio: string; grupo: string; materia: string };
export type Hueco = Clase | 'guardia' | 'libre' | { lugar: string; motivo: string };

export const MATERIA: Record<string, string> = {
  raul: 'Ciencias',
  marta: 'Matemáticas',
  andres: 'Ed. Física',
  lucia: 'Lengua e Inglés',
  ines: 'Historia · Jefatura',
};

const c = (espacio: string, grupo: string, materia: string): Clase => ({ espacio, grupo, materia });
const jefatura = { lugar: 'DIR', motivo: 'Jefatura de estudios' };

export const HORARIO: Record<string, Hueco[]> = {
  raul: [c('3A', '3.º ESO A', 'Física y Química'), c('LAB', '1.º ESO B', 'Biología'), 'libre', 'libre', c('4A', '4.º ESO A', 'Física y Química'), 'guardia', c('2B', '2.º ESO B', 'Biología')],
  marta: [c('1A', '1.º ESO A', 'Matemáticas'), c('2A', '2.º ESO A', 'Matemáticas'), 'guardia', 'libre', c('1B', '1.º ESO B', 'Matemáticas'), 'libre', c('3A', '3.º ESO A', 'Matemáticas')],
  andres: [c('GIM', '2.º ESO A', 'Ed. Física'), 'guardia', c('PISTA', '1.º ESO A', 'Ed. Física'), { lugar: 'PATIO', motivo: 'Guardia de recreo' }, 'guardia', c('GIM', '1.º ESO B', 'Ed. Física'), 'libre'],
  lucia: [c('2B', '2.º ESO B', 'Inglés'), c('3A', '3.º ESO A', 'Lengua'), c('2A', '2.º ESO A', 'Inglés'), 'libre', c('1A', '1.º ESO A', 'Lengua'), c('4A', '4.º ESO A', 'Inglés'), 'guardia'],
  ines: ['guardia', jefatura, c('3A', '3.º ESO A', 'Historia'), 'libre', c('2B', '2.º ESO B', 'Historia'), c('2A', '2.º ESO A', 'Historia'), jefatura],
  carmen: [0, 1, 2, 3, 4, 5, 6].map((f) => (f === 3 ? { lugar: 'PATIO', motivo: 'Puerta del patio' } : { lugar: 'CON', motivo: 'Conserjería' })),
  luis: [0, 1, 2, 3, 4, 5, 6].map(() => ({ lugar: 'SEC', motivo: 'Secretaría' })),
  pablo: [0, 1, 2, 3, 4, 5, 6].map((f) => (f === 2 ? { lugar: 'BIB', motivo: 'Reunión con familias' } : { lugar: 'DIR', motivo: 'Dirección' })),
};

// Reservas que ya existen (franja → espacio → motivo)
export const RESERVAS_INICIALES: Record<string, string> = {
  '4:BIB': 'Tutoría de 4.º ESO',
  '1:MUS': 'Ensayo del coro',
};

export const esClase = (h: Hueco): h is Clase => typeof h === 'object' && 'grupo' in h;
export const esLugar = (h: Hueco): h is { lugar: string; motivo: string } => typeof h === 'object' && 'lugar' in h;

// Franja según la hora del reloj; fuera del horario escolar, la 2.ª hora
export function franjaActual(d = new Date()): { franja: number; real: boolean } {
  const m = d.getHours() * 60 + d.getMinutes();
  const aMin = (h: string) => parseInt(h.slice(0, 2), 10) * 60 + parseInt(h.slice(3), 10);
  const f = FRANJAS.find((x) => m >= aMin(x.inicio) && m < aMin(x.fin));
  return f ? { franja: f.id, real: true } : { franja: 1, real: false };
}
