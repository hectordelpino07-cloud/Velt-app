// Vista del personal: recibir, confirmar y marcar como hecha. Nada más.
// Mientras no haya inicio de sesión, «Ver como» permite probar cada perfil.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { SlideOutRight, ZoomIn } from 'react-native-reanimated';
import { Avatar, Barra, Boton, Contador, cortado, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { DIRECTOR, EQUIPO, persona } from '../data/equipo';
import { entra, recoloca, vibra } from '../lib/motion';
import { Tarea, useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

export default function MisTareas() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { tareas } = useVelt();
  const [yo, setYo] = useState('carmen');
  const p = persona(yo)!;
  const todas = tareas.filter((t) => t.responsableId === yo);
  const activas = todas.filter((t) => t.estado !== 'hecha');
  const hechas = todas.filter((t) => t.estado === 'hecha').length;
  const confirmadas = todas.filter((t) => t.estado === 'confirmada').length;
  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={{ maxWidth: 760 }}>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 12 }}>// Ver como · prueba sin inicio de sesión</Mono>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
          {EQUIPO.filter((x) => x.id !== DIRECTOR.id).map((x) => {
            const on = x.id === yo;
            return (
              <Pressable key={x.id} onPress={() => setYo(x.id)} accessibilityRole="button" style={[s.persona, on && s.personaOn, cortado(8)]}>
                <Avatar id={x.id} tam={28} activo={on} />
                <Text style={[s.personaNombre, on && { color: color.crema }]}>{x.nombre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      <Animated.View key={yo} entering={entra(1)}>
        <Mono style={{ marginTop: 30, marginBottom: 12 }}>
          // {p.rol} · {fecha}
        </Mono>
        <Titular tam={ancho ? 64 : 40} style={{ marginBottom: 22 }}>
          Hola, {p.nombre}.
        </Titular>

        <View style={s.dia}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Mono>// Tu día</Mono>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Contador valor={hechas} style={s.diaN} />
                <Text style={[s.diaN, { color: color.gris }]}>/{todas.length}</Text>
              </View>
            </View>
            <Text style={s.diaTexto}>
              {activas.length === 0 ? 'Todo listo' : `${activas.length} ${activas.length === 1 ? 'pendiente' : 'pendientes'}`}
            </Text>
          </View>
          <Barra
            total={todas.length}
            tramos={[
              { valor: hechas, color: color.cobalto },
              { valor: confirmadas, color: color.lima },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <Leyenda c={color.cobalto} t="Hechas" />
            <Leyenda c={color.lima} t="Confirmadas" />
            <Leyenda c="#E2DDD0" t="Sin confirmar" />
          </View>
        </View>
      </Animated.View>

      {activas.length === 0 ? (
        <Animated.View key={`vacio-${yo}`} entering={ZoomIn.springify().damping(14)} style={{ marginTop: 28 }}>
          <Titular tam={ancho ? 44 : 30} style={{ color: color.cobalto }}>
            Nada pendiente.
          </Titular>
          <Text style={s.vacio}>Cuando dirección te envíe algo, aparecerá aquí con qué, para cuándo y por qué.</Text>
        </Animated.View>
      ) : (
        <View style={{ gap: 18, marginTop: 26 }}>
          {activas.map((t, i) => (
            <Animated.View key={t.id} entering={entra(i, 160)} exiting={SlideOutRight.duration(320)} layout={recoloca}>
              <TarjetaTarea t={t} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

function Leyenda({ c, t }: { c: string; t: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, backgroundColor: c }} />
      <Text style={{ fontFamily: font.ui, fontSize: 12, color: color.gris }}>{t}</Text>
    </View>
  );
}

function TarjetaTarea({ t }: { t: Tarea }) {
  const { cambiarEstado, preguntarDuda } = useVelt();
  const toast = useToast();
  const [escribiendo, setEscribiendo] = useState(false);
  const [duda, setDuda] = useState('');
  const confirmada = t.estado === 'confirmada';

  return (
    <Panel corte={18} sombra={8} tonoSombra={confirmada ? color.lima : color.cobalto}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Mono style={{ color: color.lima }}>
          // {confirmada ? 'Confirmada' : 'Nueva tarea'} · de {DIRECTOR.nombre}
        </Mono>
        {confirmada && (
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[s.sello, cortado(6)]}>
            <Text style={s.selloTexto}>✓ Confirmada</Text>
          </Animated.View>
        )}
      </View>
      <Titular tam={26} style={{ color: color.crema, marginBottom: 14 }}>
        {t.titulo}
      </Titular>
      <Etiqueta dia={t.dia} hora={t.hora} acento fondo={color.tinta} />
      {t.porque ? <Text style={s.porque}>Por qué: {t.porque}</Text> : null}
      {t.nota ? <Text style={s.porque}>{t.nota}</Text> : null}

      {t.duda ? (
        <View style={s.hilo}>
          <Text style={s.hiloQuien}>Tú</Text>
          <Text style={s.hiloTexto}>{t.duda}</Text>
          {t.respuesta ? (
            <Animated.View entering={entra(0)}>
              <Text style={[s.hiloQuien, { color: color.lima, marginTop: 10 }]}>{DIRECTOR.nombre}</Text>
              <Text style={s.hiloTexto}>{t.respuesta}</Text>
            </Animated.View>
          ) : (
            <Text style={[s.hiloQuien, { marginTop: 8 }]}>Esperando respuesta de dirección…</Text>
          )}
        </View>
      ) : null}

      {escribiendo ? (
        <Animated.View entering={entra(0)} style={{ marginTop: 16, gap: 10 }}>
          <TextInput value={duda} onChangeText={setDuda} placeholder="Escribe tu duda" placeholderTextColor="#6E7385" style={s.entrada} autoFocus />
          <View style={s.botones}>
            <Boton
              variante="lima"
              fondo={color.tinta}
              disabled={!duda.trim()}
              onPress={() => {
                preguntarDuda(t.id, duda.trim());
                setEscribiendo(false);
                setDuda('');
                toast('Duda enviada a dirección.');
              }}
            >
              Enviar duda
            </Boton>
            <Boton variante="blanco" fondo={color.tinta} onPress={() => setEscribiendo(false)}>
              Cancelar
            </Boton>
          </View>
        </Animated.View>
      ) : (
        <View style={[s.botones, { marginTop: 18 }]}>
          {confirmada ? (
            <Boton
              fondo={color.tinta}
              onPress={() => {
                vibra('exito');
                cambiarEstado(t.id, 'hecha');
                toast('¡Hecha! Dirección ya lo ve.', { etiqueta: 'Deshacer', fn: () => cambiarEstado(t.id, 'confirmada') });
              }}
            >
              Marcar hecha ✓
            </Boton>
          ) : (
            <Boton
              fondo={color.tinta}
              onPress={() => {
                vibra();
                cambiarEstado(t.id, 'confirmada');
                toast(`Confirmada. ${DIRECTOR.nombre} ya sabe que te encargas.`, { etiqueta: 'Deshacer', fn: () => cambiarEstado(t.id, 'pendiente') });
              }}
            >
              Confirmar
            </Boton>
          )}
          <Boton variante="blanco" fondo={color.tinta} onPress={() => setEscribiendo(true)}>
            Tengo una duda
          </Boton>
        </View>
      )}
    </Panel>
  );
}

const s = StyleSheet.create({
  persona: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 14, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  personaOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  personaNombre: { fontFamily: font.uiMedium, fontSize: 14, color: color.tinta },
  dia: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 18 },
  diaN: { fontFamily: font.display, fontSize: 40, letterSpacing: -1, color: color.tinta },
  diaTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.cobalto },
  vacio: { fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.gris, marginTop: 10, maxWidth: 460 },
  porque: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.grisClaro, marginTop: 12 },
  sello: { backgroundColor: color.lima, paddingVertical: 4, paddingHorizontal: 8 },
  selloTexto: { fontFamily: font.monoBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: color.tinta },
  hilo: { marginTop: 16, borderLeftWidth: 3, borderLeftColor: color.lima, paddingLeft: 12 },
  hiloQuien: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.grisClaro },
  hiloTexto: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.crema, marginTop: 3 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entrada: { backgroundColor: '#1A1D27', color: color.crema, fontFamily: font.ui, fontSize: 15, padding: 12, outlineStyle: 'none' } as never,
});
