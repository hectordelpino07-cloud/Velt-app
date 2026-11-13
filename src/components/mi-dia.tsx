// «Mi día»: lo primero que ve el profesorado y el resto del personal. Dónde
// tiene que estar ahora, qué viene después y qué tiene pendiente.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CENTRO } from '../data/equipo';
import { DIAS, esClase } from '../data/centro';
import { useCentro } from '../lib/centro';
import { atrasada, claveOrden, diaDeTarea } from '../lib/fechas';
import { entra, entraLado } from '../lib/motion';
import { useVelt, useYo } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';
import { ahoraYLuego, ProgresoHora, textoHueco, tonoMateria } from './horario';
import { TitularRevela } from './motion';
import { Boton, Contador, cortado, Etiqueta, Foto, Mono } from './ui';

function saludo() {
  const h = new Date().getHours();
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export function MiDia() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const cfg = useCentro();
  const { yo } = useYo();
  const { tareas, avisos } = useVelt();
  const hoy = cfg.horario[yo.id] ?? [];
  const { real, franja, hueco, siguiente, terminado, finde, hecho, quedan } = ahoraYLuego(hoy, cfg.franjas);
  const mias = tareas.filter((t) => t.responsableId === yo.id && t.estado !== 'hecha').sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));
  const porConfirmar = mias.filter((t) => t.estado === 'pendiente').length;
  const sinLeer = avisos.filter((a) => a.para === yo.id && !a.leido).length;
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const enCentro = cfg.franjas.filter((f) => hoy[f.id] && hoy[f.id] !== 'fuera');

  return (
    <View>
      <TitularRevela texto={`${saludo()},\n${yo.nombre}.`} tam={ancho ? 76 : 42} anima />
      <Animated.View entering={entra(0, 300)}>
        <Mono style={{ marginTop: 10, fontSize: 14 }}>
          {fecha.charAt(0).toUpperCase() + fecha.slice(1)} · {CENTRO}
        </Mono>
      </Animated.View>

      <View style={[s.arriba, !ancho && { flexDirection: 'column' }]}>
        <Animated.View entering={entra(2, 150)} style={[s.ahora, cortado(28), ancho && { flex: 1.6 }]}>
          <Foto de="aula" />
          <Mono style={{ color: color.lima }}>{real ? `Ahora · ${franja!.inicio}–${franja!.fin}` : 'Fuera del horario de clases'}</Mono>
          <Text style={[s.ahoraTexto, { fontSize: ancho ? 44 : 30, lineHeight: ancho ? 44 : 31 }]}>
            {real ? textoHueco(hueco, cfg.nombreEspacio, yo) : siguiente ? `${finde ? 'El lunes empiezas' : 'Tu próxima hora es'} a las ${siguiente.inicio}` : terminado ? 'Ya has terminado por hoy' : 'Hoy no tienes clases ni guardias'}
          </Text>
          {siguiente ? (
            <Text style={s.luego}>
              {real ? 'Después' : 'Te toca'}: {siguiente.inicio} · {textoHueco(hoy[siguiente.id], cfg.nombreEspacio, yo)}
            </Text>
          ) : null}
          {real && <ProgresoHora hecho={hecho} quedan={quedan} />}
        </Animated.View>
        <View style={[s.atajos, ancho && { flex: 1 }]}>
          <Atajo i={0} n={porConfirmar} l={porConfirmar === 1 ? 'tarea por confirmar' : 'tareas por confirmar'} bg={porConfirmar ? color.cobalto : color.blanco} claro={!!porConfirmar} ruta="/mis-tareas" />
          <Atajo i={1} n={sinLeer} l={sinLeer === 1 ? 'aviso sin leer' : 'avisos sin leer'} bg={sinLeer ? color.lima : color.blanco} ruta="/avisos" />
        </View>
      </View>

      <View style={[s.bajo, !ancho && { flexDirection: 'column' }]}>
        <View style={{ flex: ancho ? 1.2 : undefined }}>
          <View style={s.cab}>
            <Text style={s.cabTexto}>{finde ? 'Tu lunes' : `Tu ${DIAS[cfg.dia].toLowerCase()}`}</Text>
            <Pressable onPress={() => router.navigate('/horarios')} accessibilityRole="link">
              <Text style={s.enlace}>Ver la semana →</Text>
            </Pressable>
          </View>
          {enCentro.length === 0 && <Text style={s.vacio}>No tienes nada en el horario de hoy.</Text>}
          {enCentro.map((f, i) => {
            const h = hoy[f.id];
            const esAhora = real && franja!.id === f.id;
            const pasada = real && f.id < franja!.id;
            return (
              <Animated.View key={f.id} entering={entraLado(i, 300)} style={[s.linea, pasada && { opacity: 0.45 }]}>
                <Text style={[s.hora, esAhora && { color: color.cobalto }]}>{f.inicio}</Text>
                <View style={[s.marca, { backgroundColor: esClase(h) ? tonoMateria(h.materia) : h === 'guardia' ? color.tinta : '#C9C3B4' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.lineaTexto}>{f.recreo && h === 'libre' ? 'Recreo' : textoHueco(h, cfg.nombreEspacio, yo)}</Text>
                  {esAhora && <Text style={s.lineaAhora}>Ahora</Text>}
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ flex: ancho ? 1 : undefined }}>
          <View style={s.cab}>
            <Text style={s.cabTexto}>Tus tareas</Text>
            <Text style={s.cabSub}>{mias.length} activas</Text>
          </View>
          {mias.length === 0 && <Text style={s.vacio}>Nada pendiente. Cuando dirección te envíe algo, te llegará un aviso.</Text>}
          {mias.slice(0, 4).map((t, i) => (
            <Animated.View key={t.id} entering={entra(i, 400)} style={s.tarea}>
              <Text style={s.tareaTitulo}>{t.titulo}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <Etiqueta dia={diaDeTarea(t)} hora={t.hora} alerta={atrasada(t)} />
                <Text style={[s.estado, t.estado === 'confirmada' && { backgroundColor: color.lima }]}>{t.estado === 'confirmada' ? 'Confirmada' : 'Sin confirmar'}</Text>
              </View>
            </Animated.View>
          ))}
          {mias.length > 0 && (
            <Boton onPress={() => router.navigate('/mis-tareas')} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
              {porConfirmar ? 'Confirmar mis tareas' : 'Ver mis tareas'}
            </Boton>
          )}
        </View>
      </View>
    </View>
  );
}

function Atajo({ i, n, l, bg, claro, ruta }: { i: number; n: number; l: string; bg: string; claro?: boolean; ruta: string }) {
  const tx = claro ? color.blanco : color.tinta;
  return (
    <Animated.View entering={entra(i, 300)} style={{ flex: 1 }}>
      <Pressable onPress={() => router.navigate(ruta as never)} accessibilityRole="link" style={{ flex: 1 }}>
        {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => (
          <View style={[s.atajo, { backgroundColor: bg }, cortado(16), (hovered || pressed) && { transform: [{ translateY: -3 }] }]}>
            <Contador valor={n} style={[s.atajoN, { color: tx }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Text style={[s.atajoL, { color: tx }]}>{l}</Text>
              <Text style={[s.atajoFlecha, { color: tx }]}>→</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  arriba: { flexDirection: 'row', gap: 16, marginTop: 30, alignItems: 'stretch' },
  ahora: { backgroundColor: color.tinta, padding: 30, minHeight: 200, justifyContent: 'center' },
  ahoraTexto: { fontFamily: font.display, letterSpacing: -1.2, color: color.crema, textTransform: 'uppercase', marginTop: 10 },
  luego: { fontFamily: font.uiMedium, fontSize: 15, color: color.grisClaro, marginTop: 16 },
  atajos: { flexDirection: 'row', gap: 12 },
  atajo: { flex: 1, padding: 20, minHeight: 150, justifyContent: 'space-between', borderWidth: 0 },
  atajoN: { fontFamily: font.display, fontSize: 64, lineHeight: 64, letterSpacing: -2.5 },
  atajoL: { fontFamily: font.uiMedium, fontSize: 14, flexShrink: 1 },
  atajoFlecha: { fontFamily: font.monoBold, fontSize: 22 },
  bajo: { flexDirection: 'row', gap: 40, marginTop: 40 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 14 },
  cabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  enlace: { fontFamily: font.uiBold, fontSize: 13, color: color.cobalto },
  vacio: { fontFamily: font.ui, fontSize: 14, lineHeight: 21, color: color.gris },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: color.borde },
  hora: { width: 52, fontFamily: font.monoBold, fontSize: 14, color: color.tinta },
  marca: { width: 4, alignSelf: 'stretch' },
  lineaTexto: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  lineaAhora: { fontFamily: font.uiMedium, fontSize: 12, color: color.cobalto, marginTop: 2 },
  tarea: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14, marginBottom: 8 },
  tareaTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  estado: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta, backgroundColor: '#E2DDD0', paddingHorizontal: 6, paddingVertical: 3 },
});
