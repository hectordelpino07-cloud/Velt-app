// Tipos y datos de ejemplo del centro (inventados). Son solo el punto de
// partida: dirección puede cambiar plantas, aulas, horarios y material desde
// «Configurar centro» y «Material», y se guarda en `lib/centro.tsx`.

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

export const TIPOS_ESPACIO: { id: TipoEspacio; nombre: string }[] = [
  { id: 'aula', nombre: 'Aula de grupo' },
  { id: 'especial', nombre: 'Aula específica' },
  { id: 'oficina', nombre: 'Despacho o sala' },
  { id: 'exterior', nombre: 'Exterior' },
];

export type Espacio = { id: string; nombre: string; tipo: TipoEspacio; planta: string; cerrado?: string };
export type Planta = { id: string; nombre: string };

// Lo que hace cada persona en cada franja (índice = franja):
// clase { espacio, grupo, materia } · 'guardia' · 'libre' · { lugar } fijo
export type Clase = { espacio: string; grupo: string; materia: string };
export type Lugar = { lugar: string; motivo: string };
export type Hueco = Clase | 'guardia' | 'libre' | Lugar;

export type TipoMaterial = 'proyector' | 'pizarra' | 'portatil' | 'audio' | 'laboratorio' | 'otro';

export const TIPOS_MATERIAL: { id: TipoMaterial; nombre: string; plural: string }[] = [
  { id: 'proyector', nombre: 'Proyector', plural: 'Proyectores' },
  { id: 'pizarra', nombre: 'Pizarra digital', plural: 'Pizarras digitales' },
  { id: 'portatil', nombre: 'Portátiles', plural: 'Portátiles' },
  { id: 'audio', nombre: 'Audio', plural: 'Audio' },
  { id: 'laboratorio', nombre: 'Laboratorio', plural: 'Laboratorio' },
  { id: 'otro', nombre: 'Otro', plural: 'Otros' },
];

export type EstadoMaterial = 'ok' | 'averiado' | 'prestado';

export type Material = {
  id: string;
  nombre: string;
  tipo: TipoMaterial;
  cantidad: number;
  espacio: string | null; // null = almacén
  estado: EstadoMaterial;
  prestadoA?: string; // id de persona
  nota?: string;
};

export const PLANTAS_INICIALES: Planta[] = [
  { id: 'p1', nombre: 'Planta 1' },
  { id: 'pb', nombre: 'Planta baja' },
  { id: 'ex', nombre: 'Patio' },
];

export const ESPACIOS_INICIALES: Espacio[] = [
  { id: '1A', nombre: '1.º ESO A', tipo: 'aula', planta: 'p1' },
  { id: '1B', nombre: '1.º ESO B', tipo: 'aula', planta: 'p1' },
  { id: '2A', nombre: '2.º ESO A', tipo: 'aula', planta: 'p1' },
  { id: '2B', nombre: '2.º ESO B', tipo: 'aula', planta: 'p1' },
  { id: '3A', nombre: '3.º ESO A', tipo: 'aula', planta: 'p1' },
  { id: '4A', nombre: '4.º ESO A', tipo: 'aula', planta: 'p1' },
  { id: 'LAB', nombre: 'Lab. Ciencias', tipo: 'especial', planta: 'p1' },
  { id: 'INF', nombre: 'Informática', tipo: 'especial', planta: 'p1' },
  { id: 'MUS', nombre: 'Aula de Música', tipo: 'especial', planta: 'p1' },
  { id: 'DIR', nombre: 'Dirección', tipo: 'oficina', planta: 'pb' },
  { id: 'SEC', nombre: 'Secretaría', tipo: 'oficina', planta: 'pb' },
  { id: 'CON', nombre: 'Conserjería', tipo: 'oficina', planta: 'pb' },
  { id: 'SALA', nombre: 'Sala de profesores', tipo: 'oficina', planta: 'pb' },
  { id: 'BIB', nombre: 'Biblioteca', tipo: 'especial', planta: 'pb' },
  { id: 'GIM', nombre: 'Gimnasio', tipo: 'especial', planta: 'pb' },
  { id: 'PATIO', nombre: 'Patio', tipo: 'exterior', planta: 'ex' },
  { id: 'PISTA', nombre: 'Pista deportiva', tipo: 'exterior', planta: 'ex' },
];

export const MATERIA: Record<string, string> = {
  raul: 'Ciencias',
  marta: 'Matemáticas',
  andres: 'Ed. Física',
  lucia: 'Lengua e Inglés',
  ines: 'Historia · Jefatura',
};

// Personas con horario de clases (las demás tienen un sitio fijo)
export const PROFESORADO = ['ines', 'raul', 'marta', 'andres', 'lucia'];

const c = (espacio: string, grupo: string, materia: string): Clase => ({ espacio, grupo, materia });
const jefatura = { lugar: 'DIR', motivo: 'Jefatura de estudios' };

export const HORARIO_INICIAL: Record<string, Hueco[]> = {
  raul: [c('3A', '3.º ESO A', 'Física y Química'), c('LAB', '1.º ESO B', 'Biología'), 'libre', 'libre', c('4A', '4.º ESO A', 'Física y Química'), 'guardia', c('2B', '2.º ESO B', 'Biología')],
  marta: [c('1A', '1.º ESO A', 'Matemáticas'), c('2A', '2.º ESO A', 'Matemáticas'), 'guardia', 'libre', c('1B', '1.º ESO B', 'Matemáticas'), 'libre', c('3A', '3.º ESO A', 'Matemáticas')],
  andres: [c('GIM', '2.º ESO A', 'Ed. Física'), 'guardia', c('PISTA', '1.º ESO A', 'Ed. Física'), { lugar: 'PATIO', motivo: 'Guardia de recreo' }, 'guardia', c('GIM', '1.º ESO B', 'Ed. Física'), 'libre'],
  lucia: [c('2B', '2.º ESO B', 'Inglés'), c('3A', '3.º ESO A', 'Lengua'), c('2A', '2.º ESO A', 'Inglés'), 'libre', c('1A', '1.º ESO A', 'Lengua'), c('4A', '4.º ESO A', 'Inglés'), 'guardia'],
  ines: ['guardia', jefatura, c('3A', '3.º ESO A', 'Historia'), 'libre', c('2B', '2.º ESO B', 'Historia'), c('2A', '2.º ESO A', 'Historia'), jefatura],
  carmen: [0, 1, 2, 3, 4, 5, 6].map((f) => (f === 3 ? { lugar: 'PATIO', motivo: 'Puerta del patio' } : { lugar: 'CON', motivo: 'Conserjería' })),
  luis: [0, 1, 2, 3, 4, 5, 6].map(() => ({ lugar: 'SEC', motivo: 'Secretaría' })),
  pablo: [0, 1, 2, 3, 4, 5, 6].map((f) => (f === 2 ? { lugar: 'BIB', motivo: 'Reunión con familias' } : { lugar: 'DIR', motivo: 'Dirección' })),
};

// Reservas que ya existen ('franja:espacio' → motivo)
export const RESERVAS_INICIALES: Record<string, string> = {
  '4:BIB': 'Tutoría de 4.º ESO',
  '1:MUS': 'Ensayo del coro',
};

const m = (id: string, nombre: string, tipo: TipoMaterial, espacio: string | null, extra: Partial<Material> = {}): Material => ({
  id,
  nombre,
  tipo,
  espacio,
  cantidad: 1,
  estado: 'ok',
  ...extra,
});

export const MATERIALES_INICIALES: Material[] = [
  m('pr1', 'Proyector 1', 'proyector', '1A'),
  m('pr2', 'Proyector 2', 'proyector', '1B'),
  m('pr3', 'Proyector 3', 'proyector', '2A'),
  m('pr4', 'Proyector 4', 'proyector', '2B'),
  m('pr5', 'Proyector 5', 'proyector', 'LAB'),
  m('pr6', 'Proyector 6', 'proyector', 'INF', { estado: 'averiado', nota: 'No enciende la lámpara desde ayer' }),
  m('pr7', 'Proyector portátil', 'proyector', null),
  m('pd1', 'Pizarra digital 3.º A', 'pizarra', '3A'),
  m('pd2', 'Pizarra digital 4.º A', 'pizarra', '4A'),
  m('pc1', 'Carro de portátiles', 'portatil', 'INF', { cantidad: 24 }),
  m('pc2', 'Portátiles de préstamo', 'portatil', null, { cantidad: 6 }),
  m('au1', 'Altavoz bluetooth', 'audio', null, { cantidad: 2 }),
  m('au2', 'Equipo de sonido', 'audio', 'BIB'),
  m('lb1', 'Microscopios', 'laboratorio', 'LAB', { cantidad: 12 }),
];

export const esClase = (h: Hueco | undefined): h is Clase => typeof h === 'object' && h !== null && 'grupo' in h;
export const esLugar = (h: Hueco | undefined): h is Lugar => typeof h === 'object' && h !== null && 'lugar' in h;

// Franja según la hora del reloj; fuera del horario escolar, la 2.ª hora
export function franjaActual(d = new Date()): { franja: number; real: boolean } {
  const min = d.getHours() * 60 + d.getMinutes();
  const aMin = (h: string) => parseInt(h.slice(0, 2), 10) * 60 + parseInt(h.slice(3), 10);
  const f = FRANJAS.find((x) => min >= aMin(x.inicio) && min < aMin(x.fin));
  return f ? { franja: f.id, real: true } : { franja: 1, real: false };
}
