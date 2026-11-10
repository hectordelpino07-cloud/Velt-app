// Avisos de quien usa la app: tareas nuevas, recordatorios, respuestas,
// mensajes de compañeros y cambios de horario. En el móvil, cada uno llega
// además como notificación.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, cortado, Mono } from '../components/ui';
import { entra, recoloca } from '../lib/motion';
import { hace, TipoAviso, useVelt, useYo } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const TIPOS: Record<TipoAviso, { nombre: string; tono: string }> = {
  tarea: { nombre: 'Tarea nueva', tono: color.cobalto },
  recordatorio: { nombre: 'Recordatorio', tono: color.rojo },
  confirmada: { nombre: 'Confirmada', tono: color.lima },
  hecha: { nombre: 'Hecha', tono: color.cobalto },
  duda: { nombre: 'Duda', tono: color.lima },
  respuesta: { nombre: 'Respuesta', tono: color.lima },
  mensaje: { nombre: 'Mensaje', tono: color.tinta },
  horario: { nombre: 'Horario', tono: color.cobalto },
};

export default function Avisos() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { yo } = useYo();
  const { avisos, leerAviso, leerTodos } = useVelt();
  const mios = avisos.filter((a) => a.para === yo.id).sort((a, b) => b.creada - a.creada);
  const sinLeer = mios.filter((a) => !a.leido).length;

  return (
    <View style={{ maxWidth: 760 }}>
      <TitularRevela texto="Avisos." tam={ancho ? 48 : 30} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
        <Mono style={{ fontSize: 14 }}>{sinLeer === 0 ? 'Estás al día' : `${sinLeer} sin leer`}</Mono>
        {sinLeer > 0 && (
          <Boton variante="linea" pequeno onPress={leerTodos}>
            Marcar todo como leído
          </Boton>
        )}
      </View>

      <View style={{ marginTop: 22, gap: 8 }}>
        {mios.length === 0 && <Text style={s.vacio}>Cuando alguien te envíe una tarea, te escriba o cambie tu horario, lo verás aquí.</Text>}
        {mios.map((a, i) => {
          const t = TIPOS[a.tipo];
          return (
            <Animated.View key={a.id} entering={entra(Math.min(i, 8))} layout={recoloca}>
              <Pressable
                onPress={() => {
                  leerAviso(a.id);
                  router.navigate(a.ruta as never);
                }}
                accessibilityRole="link"
              >
                {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                  <View style={[s.aviso, { borderLeftColor: a.leido ? color.borde : t.tono }, hovered && { backgroundColor: '#FBFAF6' }, a.leido && { opacity: 0.62 }]}>
                    <Avatar id={a.de} tam={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.texto}>{a.texto}</Text>
                      {a.detalle ? (
                        <Text style={s.detalle} numberOfLines={2}>
                          {a.detalle}
                        </Text>
                      ) : null}
                      <Text style={s.cuando}>
                        {t.nombre} · {hace(a.creada)}
                      </Text>
                    </View>
                    {!a.leido && <View style={[s.punto, { backgroundColor: t.tono }]} />}
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View style={[s.nota, cortado(14)]}>
        <Text style={s.notaTitulo}>Cómo llegan los avisos</Text>
        <Text style={s.notaTexto}>
          En el móvil, cada aviso llega al instante como notificación, aunque la app esté cerrada. Si una tarea sigue sin confirmar, dirección lo ve en Seguimiento y puede enviar un recordatorio con un toque.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  vacio: { fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.gris, maxWidth: 460 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, borderLeftWidth: 4, padding: 14 },
  texto: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  detalle: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.tinta, marginTop: 2 },
  cuando: { fontFamily: font.ui, fontSize: 12, color: color.gris, marginTop: 6 },
  punto: { width: 10, height: 10 },
  nota: { backgroundColor: '#E7E3D8', padding: 18, marginTop: 28 },
  notaTitulo: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  notaTexto: { fontFamily: font.ui, fontSize: 14, lineHeight: 21, color: color.tinta, marginTop: 6 },
});
