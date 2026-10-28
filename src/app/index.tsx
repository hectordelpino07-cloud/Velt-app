// «Hoy»: lo primero que ve dirección. El parte del día en grande, como el
// saldo de una app de banca, y lo que importa ordenado por hora.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Barra, Contador, cortado, Mono } from '../components/ui';
import { esClase } from '../data/centro';
import { CENTRO, DIRECTOR, EQUIPO, persona } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra, entraLado } from '../lib/motion';
import { useVelt } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const ORDEN = ['Hoy', 'Mañana', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function saludo() {
  const h = new Date().getHours();
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Hoy() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const grande = width >= 1240;
  const { tareas, carga } = useVelt();
  const { ausentes, cubiertas, horario, materiales } = useCentro();
  // Avisos del centro: clases sin cubrir por ausencias y material averiado
  const clasesAusentes = ausentes.flatMap((id) =>
    (horario[id] ?? []).map((h, f) => (esClase(h) ? `${f}:${h.espacio}` : '')).filter(Boolean),
  );
  const sinCubrir = clasesAusentes.filter((k) => !cubiertas[k]).length;
  const averiados = materiales.filter((m) => m.estado === 'averiado').length;

  const activas = tareas.filter((t) => t.estado !== 'hecha');
  const sinConfirmar = tareas.filter((t) => t.estado === 'pendiente').length;
  const confirmadas = tareas.filter((t) => t.estado === 'confirmada').length;
  const hechas = tareas.filter((t) => t.estado === 'hecha').length;
  const dudas = tareas.filter((t) => t.duda && !t.respuesta && t.estado !== 'hecha').length;
  const equipo = EQUIPO.filter((p) => p.id !== DIRECTOR.id);
  const libres = equipo.filter((p) => !carga[p.id]).length;
  const proximas = [...activas]
    .sort((a, b) => ORDEN.indexOf(a.dia ?? 'Dom') - ORDEN.indexOf(b.dia ?? 'Dom') || (a.hora ?? '99').localeCompare(b.hora ?? '99'))
    .slice(0, 6);
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 14 }}>
          // {fecha} · {CENTRO}
        </Mono>
      </Animated.View>
      <TitularRevela texto={`${saludo()},\n${DIRECTOR.nombre}.`} tam={ancho ? 76 : 42} />

      {/* Parte del día: el número grande es lo único que hay que mirar */}
      <Animated.View entering={entra(2, 150)} style={[s.parte, cortado(28), { marginTop: 30 }]}>
        <Text style={[s.fondoHoy, { fontSize: ancho ? 200 : 130 }]} numberOfLines={1}>
          HOY
        </Text>
        <View style={[s.parteFila, !ancho && { flexDirection: 'column', gap: 26 }]}>
          <View style={{ flex: ancho ? 1.3 : undefined }}>
            <Mono style={{ color: color.lima }}>// Parte del día</Mono>
            <Contador valor={sinConfirmar} style={[s.parteN, { fontSize: ancho ? 150 : 104, lineHeight: ancho ? 150 : 104 }]} />
            <Text style={s.parteTexto}>
              {sinConfirmar === 1 ? 'tarea espera' : 'tareas esperan'} a que alguien la confirme.
            </Text>
          </View>
          <View style={[s.parteDatos, !ancho && { borderLeftWidth: 0, paddingLeft: 0 }]}>
            <DatoParte n={dudas} l="Dudas sin responder" acento={dudas > 0} />
            <DatoParte n={confirmadas} l="Confirmadas en marcha" />
            <DatoParte n={hechas} l="Hechas" />
            <DatoParte n={libres} l="Personas sin tareas" />
          </View>
        </View>
        <View style={{ marginTop: 28 }}>
          <Barra
            alto={8}
            vacio="#232838"
            total={tareas.length}
            tramos={[
              { valor: hechas, color: color.cobalto },
              { valor: confirmadas, color: color.lima },
            ]}
          />
          <Text style={s.parteBarra}>
            {Math.round((hechas / (tareas.length || 1)) * 100)}% del trabajo de la semana hecho
          </Text>
        </View>
      </Animated.View>

      {(ausentes.length > 0 || averiados > 0) && (
        <Animated.View entering={entra(0, 250)}>
          <Pressable onPress={() => router.navigate(ausentes.length ? '/centro' : '/material')} accessibilityRole="link">
            {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
              <View style={[s.aviso, cortado(14), hovered && { backgroundColor: '#B82424' }]}>
                <Text style={s.avisoTexto}>
                  {ausentes.length
                    ? `${ausentes.map((id) => persona(id)?.nombre).join(' y ')} ${ausentes.length === 1 ? 'falta' : 'faltan'} hoy · ${sinCubrir} ${sinCubrir === 1 ? 'clase' : 'clases'} sin cubrir`
                    : ''}
                  {ausentes.length && averiados ? '   ·   ' : ''}
                  {averiados ? `${averiados} ${averiados === 1 ? 'equipo averiado' : 'equipos averiados'}` : ''}
                </Text>
                <Text style={s.avisoFlecha}>Resolver →</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      )}

      {/* Dos acciones, en bloques de color sólido */}
      <View style={[s.acciones, !ancho && { flexDirection: 'column' }]}>
        <Bloque
          i={0}
          bg={color.cobalto}
          texto={color.blanco}
          etiqueta="// 01 · Lo principal"
          titulo={'Escribe\nuna idea'}
          sub="VELT la reparte en tareas."
          onPress={() => router.navigate('/idea')}
        />
        <Bloque
          i={1}
          bg={color.lima}
          texto={color.tinta}
          etiqueta={dudas ? `// ${dudas} sin responder` : '// 02 · En movimiento'}
          titulo={dudas ? 'Responde\ndudas' : 'Mapa del\ncentro'}
          sub={dudas ? 'Tu equipo te espera.' : 'Qué aula está libre y dónde está cada uno.'}
          onPress={() => router.navigate(dudas ? '/seguimiento' : '/centro')}
        />
      </View>

      <View style={[s.bajo, !grande && { flexDirection: 'column' }]}>
        {/* Lo próximo, en línea de tiempo */}
        <View style={{ flex: grande ? 1.4 : undefined }}>
          <View style={s.cabecera}>
            <Text style={s.cabTexto}>Lo próximo</Text>
            <Text style={s.cabSub}>{activas.length} activas</Text>
          </View>
          {proximas.length === 0 && <Text style={s.vacio}>No hay nada pendiente. Escribe una idea para empezar.</Text>}
          {proximas.map((t, i) => {
            const p = persona(t.responsableId);
            const ultima = i === proximas.length - 1;
            return (
              <Animated.View key={t.id} entering={entraLado(i, 400)} style={s.linea}>
                <View style={s.lineaHora}>
                  <Text style={s.hora}>{t.hora ?? '—'}</Text>
                  <Text style={s.dia}>{t.dia ?? ''}</Text>
                </View>
                <View style={s.eje}>
                  <View style={[s.punto, t.estado === 'confirmada' ? { backgroundColor: color.lima } : { borderWidth: 2, borderColor: color.tinta }]} />
                  {!ultima && <View style={s.trazo} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 22 }}>
                  <Text style={s.lineaTitulo}>{t.titulo}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Avatar id={t.responsableId} tam={22} />
                    <Text style={s.lineaQuien}>{p?.nombre}</Text>
                    <Text style={[s.estado, t.estado === 'confirmada' ? { backgroundColor: color.lima } : { backgroundColor: '#E2DDD0' }]}>
                      {t.estado === 'confirmada' ? 'Confirmada' : 'Sin confirmar'}
                    </Text>
                    {t.duda && !t.respuesta ? <Text style={[s.estado, { backgroundColor: color.tinta, color: color.lima }]}>Duda</Text> : null}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* El equipo de un vistazo */}
        <View style={{ flex: grande ? 1 : undefined }}>
          <View style={s.cabecera}>
            <Text style={s.cabTexto}>Equipo</Text>
            <Text style={s.cabSub}>{libres} libres</Text>
          </View>
          <View style={s.rejilla}>
            {equipo.map((p, i) => {
              const c = carga[p.id] ?? 0;
              return (
                <Animated.View key={p.id} entering={entra(i, 500)} style={[s.miembro, c >= 4 && { backgroundColor: '#FBE3E3' }, cortado(10)]}>
                  <Avatar id={p.id} tam={34} />
                  <Text style={s.miembroNombre}>{p.nombre}</Text>
                  <Text style={s.miembroRol}>{p.rol}</Text>
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
                    {[0, 1, 2, 3].map((k) => (
                      <View key={k} style={[s.pip, k < c && { backgroundColor: c >= 4 ? color.rojo : color.cobalto }]} />
                    ))}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function DatoParte({ n, l, acento }: { n: number; l: string; acento?: boolean }) {
  return (
    <View style={s.datoParte}>
      <Contador valor={n} style={[s.datoParteN, acento && { color: color.lima }]} />
      <Text style={s.datoParteL}>{l}</Text>
    </View>
  );
}

function Bloque({
  i,
  bg,
  texto,
  etiqueta,
  titulo,
  sub,
  onPress,
}: {
  i: number;
  bg: string;
  texto: string;
  etiqueta: string;
  titulo: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={entra(i, 300)} style={{ flex: 1 }}>
      <Pressable onPress={onPress} accessibilityRole="link">
        {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => (
          <View style={[s.bloque, { backgroundColor: bg }, cortado(22), (hovered || pressed) && { transform: [{ translateY: -4 }] }]}>
            <Mono style={{ color: texto, opacity: 0.75 }}>{etiqueta}</Mono>
            <Text style={[s.bloqueTitulo, { color: texto }]}>{titulo}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Text style={[s.bloqueSub, { color: texto }]}>{sub}</Text>
              <Text style={[s.bloqueFlecha, { color: texto }, (hovered || pressed) && { transform: [{ translateX: 6 }] }]}>→</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  aviso: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: color.rojo, paddingVertical: 14, paddingHorizontal: 20, marginTop: 16 },
  avisoTexto: { fontFamily: font.uiBold, fontSize: 15, color: color.blanco, flexShrink: 1 },
  avisoFlecha: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.blanco },
  parte: { backgroundColor: color.tinta, padding: 30, overflow: 'hidden' },
  fondoHoy: {
    position: 'absolute',
    right: -12,
    bottom: -0.32 * 200,
    fontFamily: font.display,
    color: '#151A2B',
    letterSpacing: -6,
  },
  parteFila: { flexDirection: 'row', gap: 32, alignItems: 'flex-end' },
  parteN: { fontFamily: font.display, color: color.crema, letterSpacing: -6, marginTop: 6 },
  parteTexto: { fontFamily: font.uiMedium, fontSize: 18, color: color.crema, maxWidth: 360 },
  parteDatos: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#262B3C', paddingLeft: 28, gap: 14 },
  datoParte: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  datoParteN: { fontFamily: font.display, fontSize: 30, color: color.crema, minWidth: 44 },
  datoParteL: { fontFamily: font.ui, fontSize: 14, color: color.grisClaro },
  parteBarra: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.grisClaro, marginTop: 10 },
  acciones: { flexDirection: 'row', gap: 16, marginTop: 16 },
  bloque: { padding: 24, minHeight: 210, justifyContent: 'space-between' },
  bloqueTitulo: { fontFamily: font.display, fontSize: 40, lineHeight: 38, letterSpacing: -1, textTransform: 'uppercase', marginVertical: 18 },
  bloqueSub: { fontFamily: font.uiMedium, fontSize: 15 },
  bloqueFlecha: { fontFamily: font.monoBold, fontSize: 28 },
  bajo: { flexDirection: 'row', gap: 40, marginTop: 44 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 18 },
  cabTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  vacio: { fontFamily: font.ui, fontSize: 14, color: color.gris },
  linea: { flexDirection: 'row', gap: 14 },
  lineaHora: { width: 58, alignItems: 'flex-end' },
  hora: { fontFamily: font.monoBold, fontSize: 15, color: color.tinta },
  dia: { fontFamily: font.mono, fontSize: 11, color: color.gris, textTransform: 'uppercase', marginTop: 2 },
  eje: { width: 14, alignItems: 'center' },
  punto: { width: 12, height: 12, marginTop: 4 },
  trazo: { flex: 1, width: 2, backgroundColor: color.borde, marginTop: 4 },
  lineaTitulo: { fontFamily: font.uiBold, fontSize: 16, color: color.tinta },
  lineaQuien: { fontFamily: font.ui, fontSize: 13, color: color.gris },
  estado: { fontFamily: font.monoBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: color.tinta, paddingHorizontal: 6, paddingVertical: 3 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miembro: { width: 132, backgroundColor: color.blanco, padding: 14 },
  miembroNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta, marginTop: 10 },
  miembroRol: { fontFamily: font.ui, fontSize: 12, color: color.gris },
  pip: { flex: 1, height: 4, backgroundColor: '#E2DDD0' },
});
