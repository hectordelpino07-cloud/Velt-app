// Personal del centro. Los datos de ejemplo son inventados: nunca poner aquí
// personas reales. Dirección puede añadir, editar y dar de baja personas en
// «Configurar centro»; esa lista vive en lib/centro.tsx y se copia aquí para
// que cualquier parte de la app (también el análisis de ideas) la consulte.
export type Rol = 'Dirección' | 'Jefatura' | 'Profesorado' | 'Conserjería' | 'Secretaría';
export type Turno = 'manana' | 'tarde' | 'ambos';

export type Persona = {
  id: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  turno: Turno;
  materia?: string;
  horas?: number; // horas de clase a la semana, si no son las del centro
  noPuede?: string[]; // horas en las que no trabaja, como 'día:franja' (0 = lunes)
  baja?: boolean; // dada de baja: se conserva para no romper tareas antiguas
  // Palabras con las que el director puede referirse a esta persona sin decir su nombre
  alias?: string[];
};

export const ROLES: Rol[] = ['Profesorado', 'Jefatura', 'Conserjería', 'Secretaría'];

export const TURNOS: { id: Turno; nombre: string }[] = [
  { id: 'manana', nombre: 'Mañana' },
  { id: 'tarde', nombre: 'Tarde' },
  { id: 'ambos', nombre: 'Mañana y tarde' },
];

export const CENTRO = 'IES San Marcos';

export const DIRECTOR: Persona = { id: 'pablo', nombre: 'Pablo', apellido: 'Ríos', rol: 'Dirección', turno: 'ambos' };

export const EQUIPO_INICIAL: Persona[] = [
  DIRECTOR,
  { id: 'ines', nombre: 'Inés', apellido: 'Soto', rol: 'Jefatura', turno: 'manana', materia: 'Geografía e Historia', horas: 9, alias: ['jefatura', 'jefa de estudios'] },
  { id: 'raul', nombre: 'Raúl', apellido: 'Vega', rol: 'Profesorado', turno: 'manana', materia: 'Biología' },
  { id: 'marta', nombre: 'Marta', apellido: 'Gil', rol: 'Profesorado', turno: 'manana', materia: 'Matemáticas' },
  { id: 'andres', nombre: 'Andrés', apellido: 'Peña', rol: 'Profesorado', turno: 'manana', materia: 'Ed. Física' },
  { id: 'lucia', nombre: 'Lucía', apellido: 'Navas', rol: 'Profesorado', turno: 'manana', materia: 'Lengua' },
  { id: 'sara', nombre: 'Sara', apellido: 'Molina', rol: 'Profesorado', turno: 'manana', materia: 'Inglés' },
  { id: 'diego', nombre: 'Diego', apellido: 'Ramos', rol: 'Profesorado', turno: 'manana', materia: 'Tecnología y Matemáticas' },
  { id: 'elena', nombre: 'Elena', apellido: 'Prieto', rol: 'Profesorado', turno: 'manana', materia: 'Lengua' },
  { id: 'hugo', nombre: 'Hugo', apellido: 'Campos', rol: 'Profesorado', turno: 'manana', materia: 'Música e Inglés' },
  { id: 'nuria', nombre: 'Nuria', apellido: 'Vidal', rol: 'Profesorado', turno: 'manana', materia: 'Geografía e Historia' },
  { id: 'alba', nombre: 'Alba', apellido: 'Cano', rol: 'Profesorado', turno: 'manana', materia: 'Física y Química' },
  { id: 'irene', nombre: 'Irene', apellido: 'Mora', rol: 'Profesorado', turno: 'manana', materia: 'Plástica' },
  { id: 'carmen', nombre: 'Carmen', apellido: 'Lago', rol: 'Conserjería', turno: 'manana', alias: ['conserje', 'conserjería', 'conserjeria'] },
  { id: 'luis', nombre: 'Luis', apellido: 'Ortega', rol: 'Secretaría', turno: 'manana', alias: ['secretaría', 'secretaria', 'secretario'] },
];

// Lista viva: misma referencia siempre, el contenido lo actualiza CentroProvider
export const EQUIPO: Persona[] = [...EQUIPO_INICIAL];
export function sincronizarEquipo(lista: Persona[]) {
  EQUIPO.splice(0, EQUIPO.length, ...lista);
}

// Personas en activo (sin las dadas de baja)
export const activos = () => EQUIPO.filter((p) => !p.baja);
export const daClase = (p: Persona) => p.rol === 'Profesorado' || p.rol === 'Jefatura';
// Dirección y jefatura organizan el centro; el resto ve lo suyo y lo de sus compañeros
export const esGestion = (p: Persona | undefined) => !!p && (p.rol === 'Dirección' || p.rol === 'Jefatura');

export const persona = (id: string) => EQUIPO.find((p) => p.id === id);
export const iniciales = (p: Persona) => ((p.nombre[0] ?? '') + (p.apellido[0] ?? '')).toUpperCase() || '?';
export const nombreCompleto = (p: Persona) => `${p.nombre} ${p.apellido}`.trim();
