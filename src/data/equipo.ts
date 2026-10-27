// Equipo de ejemplo. Datos inventados: nunca poner aquí personas reales.
export type Rol = 'Dirección' | 'Jefatura' | 'Profesorado' | 'Conserjería' | 'Secretaría';

export type Persona = {
  id: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  // Palabras con las que el director puede referirse a esta persona sin decir su nombre
  alias?: string[];
};

export const CENTRO = 'IES San Marcos';

export const DIRECTOR: Persona = { id: 'pablo', nombre: 'Pablo', apellido: 'Ríos', rol: 'Dirección' };

export const EQUIPO: Persona[] = [
  DIRECTOR,
  { id: 'ines', nombre: 'Inés', apellido: 'Soto', rol: 'Jefatura', alias: ['jefatura', 'jefa de estudios'] },
  { id: 'raul', nombre: 'Raúl', apellido: 'Vega', rol: 'Profesorado' },
  { id: 'marta', nombre: 'Marta', apellido: 'Gil', rol: 'Profesorado' },
  { id: 'andres', nombre: 'Andrés', apellido: 'Peña', rol: 'Profesorado' },
  { id: 'lucia', nombre: 'Lucía', apellido: 'Navas', rol: 'Profesorado' },
  { id: 'carmen', nombre: 'Carmen', apellido: 'Lago', rol: 'Conserjería', alias: ['conserje', 'conserjería', 'conserjeria'] },
  { id: 'luis', nombre: 'Luis', apellido: 'Ortega', rol: 'Secretaría', alias: ['secretaría', 'secretaria', 'secretario'] },
];

export const persona = (id: string) => EQUIPO.find((p) => p.id === id);
export const iniciales = (p: Persona) => (p.nombre[0] + p.apellido[0]).toUpperCase();
export const nombreCompleto = (p: Persona) => `${p.nombre} ${p.apellido}`;
