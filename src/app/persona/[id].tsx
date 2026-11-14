// Ficha de una persona: dónde está ahora, su horario de la semana, sus tareas
// (solo las ve ella y dirección) y los mensajes contigo. Cualquier nombre de
// la app lleva aquí.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ahoraYLuego, celdasDeSemana, EnlacePersona, HorarioSemanal, ProgresoHora, textoHueco } from '../../components/horario';
import { TuCalendario } from '../../components/calendario';
import { Avatar, Boton, Contador, cortado, Etiqueta, Foto, Mono, Titular } from '../../components/ui';
import { daClase, nombreCompleto, persona, TURNOS } from '../../data/equipo';
import { useCentro } from '../../lib/centro';
import { atrasada, claveOrden, diaDeTarea } from '../../lib/fechas';
import { docentesDe, resumenSemana } from '../../lib/horarios';
import { entra } from '../../lib/motion';
import { hace, useVelt, useYo } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../../lib/theme';

const ESTADOS = { pendiente: 'Sin confirmar', confirmada: 'Confirmada', hecha: 'Hecha' };

export default function Ficha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const cfg = useCentro();
  const { yo, gestion } = useYo();
  const { tareas, mensajes, escribir, recordar, avisar } = useVelt();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [traspasando, setTraspasando] = useState(false);
  const p = persona(id ?? '');

  if (!p)
    return (
      <View>
        <Titular tam={ancho ? 44 : 30}>No encontramos a esta persona.</Titular>
        <Boton variante="linea" pequeno onPress={() => router.navigate('/')} style={{ alignSelf: 'flex-start', marginTop: 20 }}>
          Volver al inicio
        </Boton>
      </View>
    );

  const mio = p.id === yo.id;
  const ausente = cfg.ausentes.includes(p.id);
  const { real, franja, hueco, siguiente, terminado, hecho, quedan } = ahoraYLuego(cfg.horario[p.id], cfg.franjas);
  const r = resumenSemana(cfg.semana[p.id]);
  const suyas = tareas.filter((t) => t.responsableId === p.id).sort((a, b) => claveOrden(a).localeCompare(claveOrden(b)));
  const activas = suyas.filter((t) => t.estado !== 'hecha');
  const hilo = mensajes.filter((m) => (m.de === yo.id && m.para === p.id) || (m.de === p.id && m.para === yo.id));
  // En tu propia ficha: con quién has hablado, lo último primero
  const charlas = mio
    ? [...new Set([...mensajes].reverse().filter((m) => m.de === yo.id || m.para === yo.id).map((m) => (m.de === yo.id ? m.para : m.de)))]
    : [];
  const turno = TURNOS.find((t) => t.id === p.turno)?.nombre;
  const enviar = () => {
    if (!texto.trim()) return;
    escribir(p.id, texto.trim());
    setTexto('');
    toast(`Mensaje enviado a ${p.nombre}.`);
  };

  return (
    <View>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} accessibilityRole="link" style={{ alignSelf: 'flex-start', marginBottom: 18 }}>
        <Text style={s.volver}>← Volver</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Avatar id={p.id} tam={ancho ? 76 : 56} activo={mio} />
        <View style={{ flex: 1, minWidth: 220 }}>
          <Titular tam={ancho ? 48 : 30}>{nombreCompleto(p)}</Titular>
          <Mono style={{ marginTop: 8, fontSize: 14 }}>
            {[p.rol, p.materia, turno].filter(Boolean).join(' · ')}
            {mio ? ' · eres tú' : ''}
          </Mono>
        </View>
      </View>

      <View style={[s.arriba, !ancho && { flexDirection: 'column' }]}>
        <Animated.View entering={entra(1)} style={[s.ahora, cortado(22), ancho && { flex: 1.5 }]}>
          <Foto de="aulaSol" fuerza={0.26} />
          <Mono style={{ color: ausente ? '#FF8A8A' : color.lima }}>
            {ausente ? 'Ausente hoy' : real ? `Ahora · ${franja!.inicio}–${franja!.fin}` : 'Fuera del horario de clases'}
          </Mono>
          <Text style={s.ahoraTexto}>{ausente ? 'No está en el centro' : real ? textoHueco(hueco, cfg.nombreEspacio, p) : siguiente ? `Su próxima hora es a las ${siguiente.inicio}` : terminado ? 'Ha terminado por hoy' : 'Hoy no tiene clases ni guardias'}</Text>
          {siguiente && !ausente ? (
            <Text style={s.ahoraLuego}>
              {real ? 'Después' : 'Le toca'}: {siguiente.inicio} · {textoHueco(cfg.horario[p.id]?.[siguiente.id], cfg.nombreEspacio, p)}
            </Text>
          ) : null}
          {real && !ausente && <ProgresoHora hecho={hecho} quedan={quedan} />}
        </Animated.View>
        <Animated.View entering={entra(2)} style={[s.cifras, ancho && { flex: 1 }]}>
          {daClase(p) && <Cifra n={r.lectivas} l="horas de clase a la semana" anima />}
          {daClase(p) && <Cifra n={r.guardias} l={r.guardias === 1 ? 'guardia' : 'guardias'} />}
          {(gestion || mio) && <Cifra n={activas.length} l={activas.length === 1 ? 'tarea activa' : 'tareas activas'} />}
        </Animated.View>
      </View>

      {mio && daClase(p) && <TuCalendario yo={p} />}

      <View style={s.seccion}>
        <View style={s.cab}>
          <Text style={s.cabTexto}>Horario de la semana</Text>
          {gestion && daClase(p) && (
            <Pressable onPress={() => setTraspasando((x) => !x)} accessibilityRole="button">
              <Text style={s.enlace}>{traspasando ? 'Cancelar' : 'Pasar este horario a otra persona'}</Text>
            </Pressable>
          )}
        </View>
        {traspasando && (
          <Animated.View entering={entra(0)} style={s.traspaso}>
            <Text style={s.traspasoTexto}>
              Para una sustitución: quien elijas recibe tal cual las clases y guardias de {p.nombre}, y {p.nombre} se queda sin horario.
            </Text>
            <View style={s.chips}>
              {docentesDe(cfg.personal)
                .filter((x) => x.id !== p.id)
                .map((x) => (
                  <Pressable
                    key={x.id}
                    onPress={() => {
                      cfg.traspasarHorario(p.id, x.id);
                      avisar([{ para: x.id, tipo: 'horario', texto: 'Tienes horario nuevo', detalle: `Ahora llevas las clases y guardias de ${p.nombre}.`, ruta: '/horarios' }]);
                      setTraspasando(false);
                      toast(`${x.nombre} tiene ahora el horario de ${p.nombre} y ha recibido el aviso.`);
                    }}
                    accessibilityRole="button"
                    style={s.chip}
                  >
                    <Text style={s.chipTexto}>{nombreCompleto(x)}</Text>
                  </Pressable>
                ))}
            </View>
          </Animated.View>
        )}
        <HorarioSemanal franjas={cfg.franjas} celda={celdasDeSemana(cfg.semana[p.id], cfg.nombreEspacio)} hoy={cfg.dia} version={p.id} />
      </View>

      {(gestion || mio) && (
        <View style={s.seccion}>
          <View style={s.cab}>
            <Text style={s.cabTexto}>{mio ? 'Tus tareas' : `Tareas de ${p.nombre}`}</Text>
            {mio ? (
              <Pressable onPress={() => router.navigate('/mis-tareas')} accessibilityRole="link">
                <Text style={s.enlace}>Ir a mis tareas →</Text>
              </Pressable>
            ) : (
              <Text style={s.cabSub}>{activas.length} activas</Text>
            )}
          </View>
          {suyas.length === 0 && <Text style={s.vacio}>{mio ? 'No tienes tareas.' : `${p.nombre} no tiene tareas.`}</Text>}
          {suyas.map((t) => (
            <View key={t.id} style={s.tarea}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={[s.tareaTitulo, t.estado === 'hecha' && { textDecorationLine: 'line-through', color: color.gris }]}>{t.titulo}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Etiqueta dia={diaDeTarea(t)} hora={t.hora} alerta={t.estado !== 'hecha' && atrasada(t)} />
                  <Text style={[s.estado, t.estado === 'confirmada' && { backgroundColor: color.lima }, t.estado === 'hecha' && { backgroundColor: color.azulSuave, color: color.cobalto }]}>{ESTADOS[t.estado]}</Text>
                  {t.estado === 'pendiente' && <Text style={s.cabSub}>{t.recordada ? `recordada ${hace(t.recordada)}` : `enviada ${hace(t.creada)}`}</Text>}
                </View>
              </View>
              {gestion && !mio && t.estado === 'pendiente' && (
                <Boton
                  variante="gris"
                  pequeno
                  onPress={() => {
                    recordar(t.id);
                    toast(`Recordatorio enviado a ${p.nombre}.`);
                  }}
                >
                  Recordar
                </Boton>
              )}
            </View>
          ))}
        </View>
      )}

      {!mio ? (
        <View style={s.seccion}>
          <View style={s.cab}>
            <Text style={s.cabTexto}>Mensajes con {p.nombre}</Text>
            <Text style={s.cabSub}>solo los veis vosotros</Text>
          </View>
          {hilo.length === 0 && <Text style={s.vacio}>Pregúntale lo que necesites: un cambio de guardia, dónde está un material, una duda de una clase.</Text>}
          <View style={{ gap: 8 }}>
            {hilo.map((m) => {
              const yoLoDije = m.de === yo.id;
              return (
                <Animated.View key={m.id} entering={entra(0)} style={[s.mensaje, yoLoDije ? s.mensajeMio : null, cortado(10)]}>
                  <Text style={[s.mensajeTexto, yoLoDije && { color: color.crema }]}>{m.texto}</Text>
                  <Text style={[s.mensajeHora, yoLoDije && { color: color.grisClaro }]}>
                    {yoLoDije ? 'Tú' : p.nombre} · {hace(m.creada)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
          <View style={s.escribir}>
            <TextInput value={texto} onChangeText={setTexto} onSubmitEditing={enviar} placeholder={`Escribe a ${p.nombre}…`} placeholderTextColor={color.gris} style={s.entrada} />
            <Boton onPress={enviar} disabled={!texto.trim()}>
              Enviar
            </Boton>
          </View>
        </View>
      ) : (
        charlas.length > 0 && (
          <View style={s.seccion}>
            <View style={s.cab}>
              <Text style={s.cabTexto}>Tus conversaciones</Text>
            </View>
            {charlas.map((otro) => {
              const ultimo = [...mensajes].reverse().find((m) => (m.de === otro && m.para === yo.id) || (m.de === yo.id && m.para === otro))!;
              return (
                <EnlacePersona key={otro} id={otro}>
                  <View style={s.charla}>
                    <Avatar id={otro} tam={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.tareaTitulo}>{persona(otro)?.nombre ?? '—'}</Text>
                      <Text style={s.charlaTexto} numberOfLines={1}>
                        {ultimo.de === yo.id ? 'Tú: ' : ''}
                        {ultimo.texto}
                      </Text>
                    </View>
                    <Text style={s.cabSub}>{hace(ultimo.creada)}</Text>
                  </View>
                </EnlacePersona>
              );
            })}
          </View>
        )
      )}
    </View>
  );
}

function Cifra({ n, l, anima }: { n: number; l: string; anima?: boolean }) {
  return (
    <View style={s.cifra}>
      <Contador valor={n} anima={anima} style={s.cifraN} />
      <Text style={s.cifraL}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  volver: { fontFamily: font.uiBold, fontSize: 13, color: color.gris },
  arriba: { flexDirection: 'row', gap: 16, marginTop: 26, alignItems: 'stretch' },
  ahora: { backgroundColor: color.tinta, padding: 24 },
  ahoraTexto: { fontFamily: font.display, fontSize: 28, lineHeight: 30, letterSpacing: -0.8, color: color.crema, textTransform: 'uppercase', marginTop: 8 },
  ahoraLuego: { fontFamily: font.uiMedium, fontSize: 14, color: color.grisClaro, marginTop: 14 },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cifra: { flex: 1, minWidth: 110, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 16, justifyContent: 'space-between' },
  cifraN: { fontFamily: font.display, fontSize: 40, letterSpacing: -1.5, color: color.tinta, fontVariant: ['tabular-nums'] },
  cifraL: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 4 },
  seccion: { marginTop: 36 },
  cab: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 14 },
  cabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  enlace: { fontFamily: font.uiBold, fontSize: 13, color: color.cobalto },
  traspaso: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 16, marginBottom: 14, gap: 12 },
  traspasoTexto: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.tinta, maxWidth: 620 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderWidth: 2, borderColor: color.tinta },
  chipTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  vacio: { fontFamily: font.ui, fontSize: 14, lineHeight: 21, color: color.gris, maxWidth: 560, marginBottom: 12 },
  tarea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14, marginBottom: 8 },
  tareaTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  estado: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta, backgroundColor: '#E2DDD0', paddingHorizontal: 6, paddingVertical: 3 },
  mensaje: { alignSelf: 'flex-start', maxWidth: 520, backgroundColor: color.blanco, paddingVertical: 10, paddingHorizontal: 14 },
  mensajeMio: { alignSelf: 'flex-end', backgroundColor: color.tinta },
  mensajeTexto: { fontFamily: font.ui, fontSize: 15, lineHeight: 21, color: color.tinta },
  mensajeHora: { fontFamily: font.ui, fontSize: 11, color: color.gris, marginTop: 4 },
  escribir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 14 },
  entrada: { flex: 1, minWidth: 200, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, paddingVertical: 12, paddingHorizontal: 14, fontFamily: font.ui, fontSize: 15, color: color.tinta, outlineStyle: 'none' } as never,
  charla: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borde },
  charlaTexto: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 2 },
});
