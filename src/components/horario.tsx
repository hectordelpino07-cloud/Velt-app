// El horario de la semana, de lunes a viernes. La misma rejilla sirve para una
// persona (qué da y dónde), para un grupo (qué tiene y con quién) y para ver
// quién está de guardia. En el móvil se ve un día cada vez.
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DIAS, DIAS_CORTO, esLugar, Franja, franjaActual, Hueco, Semana } from '../data/centro';
import { Persona, persona } from '../data/equipo';
import { curva } from '../lib/motion';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';
import { Avatar, Barra } from './ui';

export type CeldaHorario = {
  tipo: 'clase' | 'guardia' | 'libre' | 'fuera' | 'lugar' | 'aviso';
  titulo?: string;
  sub?: string;
  materia?: string; // da el color de la franja lateral
  onPress?: () => void;
};

// Un tono por materia, siempre dentro de la familia de la marca
const TONOS = [color.cobalto, color.tinta, '#7A8CFF', '#9CC22B', '#5B6070', '#3B4BC4', '#C6F24E', '#B9BDCB'];
export function tonoMateria(nombre: string) {
  let n = 0;
  for (let i = 0; i < nombre.length; i++) n = (n * 31 + nombre.charCodeAt(i)) >>> 0;
  return TONOS[n % TONOS.length];
}

// Celda del horario de una persona
export function celdaDePersona(h: Hueco | undefined, nombreEspacio: (id: string | null) => string): CeldaHorario {
  if (!h || h === 'fuera') return { tipo: 'fuera' };
  if (h === 'libre') return { tipo: 'libre' };
  if (h === 'guardia') return { tipo: 'guardia', titulo: 'Guardia' };
  if (esLugar(h)) return h.motivo === 'Guardia de recreo' ? { tipo: 'guardia', titulo: 'Recreo', sub: nombreEspacio(h.lugar) } : { tipo: 'lugar', titulo: h.motivo, sub: h.motivo === nombreEspacio(h.lugar) ? undefined : nombreEspacio(h.lugar) };
  const aula = nombreEspacio(h.espacio);
  return { tipo: 'clase', titulo: h.grupo, sub: aula === h.grupo ? h.materia : `${h.materia} · ${aula}`, materia: h.materia };
}

// Lo que hace alguien en una franja, en una frase corta
export function textoHueco(h: Hueco | undefined, nombreEspacio: (id: string | null) => string, p?: Persona) {
  if (!h || h === 'fuera') return 'No está en el centro';
  if (h === 'guardia') return 'De guardia';
  if (h === 'libre') return p && p.rol !== 'Profesorado' && p.rol !== 'Jefatura' ? 'En su puesto' : 'Sala de profesores';
  if (esLugar(h)) return h.motivo === nombreEspacio(h.lugar) ? h.motivo : `${h.motivo} · ${nombreEspacio(h.lugar)}`;
  const aula = nombreEspacio(h.espacio);
  return aula === h.grupo ? `${h.grupo} · ${h.materia}` : `${h.grupo} · ${h.materia} · ${aula}`;
}

// Ahora y después, para la ficha y «Mi día». `terminado`: ya no le queda nada hoy
export function ahoraYLuego(hoy: Hueco[] | undefined, franjas: Franja[], d = new Date()) {
  const hs = hoy ?? [];
  const min = (h: string) => parseInt(h.slice(0, 2), 10) * 60 + parseInt(h.slice(3), 10);
  const ocupa = (h: Hueco | undefined) => !!h && h !== 'fuera' && h !== 'libre';
  const reloj = d.getHours() * 60 + d.getMinutes();
  // En fin de semana se enseña el lunes entero, como si aún no hubiera empezado
  const finde = d.getDay() === 0 || d.getDay() === 6;
  const actual = finde ? undefined : franjas.find((f) => reloj >= min(f.inicio) && reloj < min(f.fin));
  const siguiente = franjas.find((f) => (finde || min(f.inicio) > reloj) && ocupa(hs[f.id]));
  const algo = franjas.some((f) => ocupa(hs[f.id]));
  // Parte de la hora en curso que ya ha pasado (0–1) y minutos que quedan
  const hecho = actual ? (reloj - min(actual.inicio)) / Math.max(1, min(actual.fin) - min(actual.inicio)) : 0;
  const quedan = actual ? min(actual.fin) - reloj : 0;
  return { hecho, quedan, real: !!actual, franja: actual ?? null, hueco: actual ? hs[actual.id] : undefined, siguiente, terminado: !actual && !siguiente && algo, finde };
}

export function HorarioSemanal({
  franjas,
  celda,
  version = 0,
  hoy = -1,
  ola,
}: {
  franjas: Franja[];
  celda: (dia: number, franja: number) => CeldaHorario;
  version?: number | string; // al cambiar, las celdas vuelven a entrar
  hoy?: number; // día de hoy, para resaltarlo (-1 = ninguno)
  ola?: boolean; // entrada en ola (al crear un horario)
}) {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const [diaMovil, setDiaMovil] = useState(Math.max(0, hoy));
  const ahora = franjaActual(franjas);
  const dosTurnos = franjas.some((f) => f.turno === 'tarde') && franjas.some((f) => f.turno === 'manana');

  const pinta = (d: number, f: Franja, orden: number) => {
    const c = celda(d, f.id);
    const esAhora = d === hoy && ahora.real && ahora.franja === f.id;
    return (
      <Animated.View
        key={`${version}-${d}-${f.id}`}
        entering={ola ? FadeIn.delay(orden * 22).duration(260).easing(curva) : FadeIn.duration(140)}
        style={[s.celda, f.recreo && s.celdaRecreo, esAhora && s.celdaAhora]}
      >
        <Celda c={c} recreo={!!f.recreo} />
      </Animated.View>
    );
  };

  if (!ancho) {
    return (
      <View>
        <View style={s.dias}>
          {DIAS_CORTO.map((n, d) => (
            <Pressable key={n} onPress={() => setDiaMovil(d)} accessibilityRole="tab" accessibilityLabel={DIAS[d]} style={[s.diaTab, d === diaMovil && s.diaTabOn]}>
              <Text style={[s.diaTabTexto, d === diaMovil && { color: color.crema }]}>{n}</Text>
              {d === hoy && <View style={[s.puntoHoy, d === diaMovil && { backgroundColor: color.lima }]} />}
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 6, marginTop: 12 }}>
          {franjas.map((f, i) => (
            <View key={f.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
              <View style={s.horaMovil}>
                <Text style={s.hora}>{f.inicio}</Text>
                <Text style={s.horaNombre}>{f.recreo ? 'Recreo' : f.nombre}</Text>
              </View>
              <View style={{ flex: 1 }}>{pinta(diaMovil, f, i)}</View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.rejilla}>
      <View style={s.fila}>
        <View style={s.colHora} />
        {DIAS.map((n, d) => (
          <View key={n} style={[s.cabDia, d === hoy && { borderBottomColor: color.cobalto }]}>
            <Text style={[s.cabDiaTexto, d === hoy && { color: color.cobalto }]}>{n}</Text>
            {d === hoy && <Text style={s.cabHoy}>Hoy</Text>}
          </View>
        ))}
      </View>
      {franjas.map((f, i) => (
        <View key={f.id}>
          {dosTurnos && i > 0 && franjas[i - 1].turno !== f.turno && <Text style={s.cambioTurno}>Tarde</Text>}
          <View style={s.fila}>
            <View style={[s.colHora, f.recreo && { height: 36 }]}>
              <Text style={s.hora}>{f.inicio}</Text>
              {!f.recreo && <Text style={s.horaNombre}>{f.nombre}</Text>}
            </View>
            {DIAS.map((_, d) => (
              <View key={d} style={{ flex: 1 }}>
                {pinta(d, f, d + i)}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Celda({ c, recreo }: { c: CeldaHorario; recreo: boolean }) {
  let dentro: ReactNode = null;
  if (c.tipo === 'clase' || c.tipo === 'aviso')
    dentro = (
      <View style={[s.clase, { borderLeftColor: c.tipo === 'aviso' ? color.rojo : tonoMateria(c.materia ?? '') }, c.tipo === 'aviso' && { backgroundColor: '#FBE3E3' }]}>
        <Text style={s.claseTitulo} numberOfLines={1}>
          {c.titulo}
        </Text>
        {c.sub ? (
          <Text style={s.claseSub} numberOfLines={1}>
            {c.sub}
          </Text>
        ) : null}
      </View>
    );
  else if (c.tipo === 'guardia')
    dentro = (
      <View style={[s.bloque, { backgroundColor: color.tinta }]}>
        <Text style={[s.claseTitulo, { color: color.lima }]} numberOfLines={1}>
          {c.titulo}
        </Text>
        {c.sub && !recreo ? (
          <Text style={[s.claseSub, { color: color.grisClaro }]} numberOfLines={1}>
            {c.sub}
          </Text>
        ) : null}
      </View>
    );
  else if (c.tipo === 'lugar')
    dentro = (
      <View style={[s.bloque, { backgroundColor: '#E7E3D8' }]}>
        <Text style={[s.claseTitulo, { fontFamily: font.uiMedium }]} numberOfLines={1}>
          {c.titulo}
        </Text>
        {c.sub && !recreo ? (
          <Text style={s.claseSub} numberOfLines={1}>
            {c.sub}
          </Text>
        ) : null}
      </View>
    );
  else if (c.tipo === 'libre')
    dentro = (
      <View style={s.libre}>
        <Text style={s.libreTexto}>{recreo ? 'Recreo' : c.titulo ?? 'Libre'}</Text>
      </View>
    );
  else dentro = <View style={s.fuera} />;

  if (!c.onPress) return dentro;
  return (
    <Pressable onPress={c.onPress} accessibilityRole="link" style={{ flex: 1 }}>
      {({ hovered }: { hovered?: boolean; pressed: boolean }) => <View style={[{ flex: 1 }, hovered && { opacity: 0.75 }]}>{dentro}</View>}
    </Pressable>
  );
}

// Cuánto queda de la hora en curso: una línea que avanza
export function ProgresoHora({ hecho, quedan }: { hecho: number; quedan: number }) {
  return (
    <View style={{ marginTop: 18, gap: 6 }}>
      <Barra alto={4} vacio="#232838" total={1} tramos={[{ valor: hecho, color: color.lima }]} />
      <Text style={{ fontFamily: font.uiMedium, fontSize: 12, color: color.grisClaro }}>
        {quedan <= 1 ? 'Termina ahora' : `Quedan ${quedan} min`}
      </Text>
    </View>
  );
}

// Tarjeta que se levanta un poco al pasar el ratón (solo en la web hay ratón)
export const levanta = (hovered?: boolean) =>
  ({ transitionProperty: 'transform', transitionDuration: '160ms', transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)', transform: [{ translateY: hovered ? -3 : 0 }] }) as never;

// Nombre de una persona que lleva a su ficha (horario, tareas y mensajes)
export function EnlacePersona({ id, children, style }: { id: string; children: ReactNode; style?: object }) {
  if (!persona(id)) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={() => router.navigate(`/persona/${id}`)} accessibilityRole="link" accessibilityLabel={`Ver la ficha de ${persona(id)!.nombre}`} style={style}>
      {({ hovered }: { hovered?: boolean; pressed: boolean }) => <View style={hovered ? { opacity: 0.7 } : undefined}>{children}</View>}
    </Pressable>
  );
}

// Selector de personas en fila: avatar y nombre
export function FilaPersonas({ lista, activo, onElegir }: { lista: Persona[]; activo: string; onElegir: (id: string) => void }) {
  return (
    <View style={s.personas}>
      {lista.map((p) => {
        const on = p.id === activo;
        return (
          <Pressable key={p.id} onPress={() => onElegir(p.id)} accessibilityRole="button" style={[s.personaChip, on && s.personaChipOn]}>
            <Avatar id={p.id} tam={24} activo={on} />
            <Text style={[s.personaChipTexto, on && { color: color.crema }]}>{p.nombre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Horario de una persona, listo para pintar
export const celdasDeSemana = (semana: Semana | undefined, nombreEspacio: (id: string | null) => string) => (d: number, f: number) =>
  celdaDePersona(semana?.[d]?.[f], nombreEspacio);

const ALTO = 58;

const s = StyleSheet.create({
  rejilla: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14, paddingTop: 6 },
  fila: { flexDirection: 'row', gap: 6, marginTop: 6 },
  colHora: { width: 64, height: ALTO, justifyContent: 'center' },
  hora: { fontFamily: font.monoBold, fontSize: 13, color: color.tinta },
  horaNombre: { fontFamily: font.ui, fontSize: 11, color: color.gris, marginTop: 1 },
  cabDia: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: color.tinta },
  cabDiaTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabHoy: { fontFamily: font.mono, fontSize: 11, color: color.cobalto },
  cambioTurno: { fontFamily: font.uiBold, fontSize: 12, color: color.gris, marginTop: 14, marginLeft: 70 },
  celda: { height: ALTO },
  celdaRecreo: { height: 36 },
  celdaAhora: { outlineWidth: 2, outlineColor: color.cobalto, outlineStyle: 'solid', outlineOffset: 1 } as never,
  clase: { flex: 1, backgroundColor: '#F7F5EF', borderLeftWidth: 4, paddingHorizontal: 9, justifyContent: 'center' },
  claseTitulo: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  claseSub: { fontFamily: font.ui, fontSize: 11, color: color.gris, marginTop: 1 },
  bloque: { flex: 1, paddingHorizontal: 10, justifyContent: 'center' },
  libre: { flex: 1, borderWidth: 1, borderColor: color.borde, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  libreTexto: { fontFamily: font.ui, fontSize: 11, color: color.gris },
  fuera: { flex: 1, backgroundColor: '#FAF8F3' },
  dias: { flexDirection: 'row', gap: 6 },
  diaTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 2, borderColor: color.tinta },
  diaTabOn: { backgroundColor: color.tinta },
  diaTabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  puntoHoy: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, backgroundColor: color.cobalto },
  horaMovil: { width: 58, justifyContent: 'center' },
  personas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  personaChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 12, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  personaChipOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  personaChipTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
});
