// «¿Quién eres?»: mientras VELT no tenga inicio de sesión, aquí se elige con
// qué persona se usa la app. Dirección y jefatura ven la organización del
// centro; el resto, su día, su horario y a sus compañeros.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { levanta } from '../components/horario';
import { TitularRevela } from '../components/motion';
import { Avatar, cortado, Mono } from '../components/ui';
import { activos, esGestion, nombreCompleto } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra } from '../lib/motion';
import { useVelt, useYo } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

export default function Entrar() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  useCentro(); // se vuelve a pintar si cambia el personal
  const { entrarComo, avisos } = useVelt();
  const { yo } = useYo();
  const gente = activos();
  const bloques = [
    { titulo: 'Organizan el centro', nota: 'Ven el parte del día, crean horarios y reparten tareas.', lista: gente.filter(esGestion) },
    { titulo: 'Profesorado y personal', nota: 'Ven su día, su horario, el mapa y a sus compañeros.', lista: gente.filter((p) => !esGestion(p)) },
  ];

  return (
    <View>
      <TitularRevela texto="¿Quién eres?" tam={ancho ? 48 : 30} />
      <Mono style={{ marginTop: 10, fontSize: 14 }}>Elige una persona para ver VELT como la ve ella. Cuando haya inicio de sesión, cada una entrará con su cuenta.</Mono>

      {bloques.map((b, bi) => (
        <Animated.View key={b.titulo} entering={entra(bi + 1)} style={{ marginTop: 30 }}>
          <View style={s.cab}>
            <Text style={s.cabTexto}>{b.titulo}</Text>
            <Text style={s.cabSub}>{b.nota}</Text>
          </View>
          <View style={s.rejilla}>
            {b.lista.map((p) => {
              const on = p.id === yo.id;
              const n = avisos.filter((a) => a.para === p.id && !a.leido).length;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    entrarComo(p.id);
                    router.navigate('/');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Entrar como ${nombreCompleto(p)}`}
                  style={!ancho && { width: '100%' }}
                >
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <View style={[s.tarjeta, cortado(12), levanta(hovered), on && { backgroundColor: color.tinta }]}>
                      <Avatar id={p.id} tam={38} activo={on} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.nombre, on && { color: color.crema }]}>{nombreCompleto(p)}</Text>
                        <Text style={[s.rol, on && { color: color.grisClaro }]}>{p.rol === 'Profesorado' ? p.materia || p.rol : p.rol}</Text>
                      </View>
                      {n > 0 && (
                        <View style={s.insignia}>
                          <Text style={s.insigniaTexto}>{n}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  cab: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 14 },
  cabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabSub: { fontFamily: font.ui, fontSize: 13, color: color.gris },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 250, backgroundColor: color.blanco, padding: 14 },
  nombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  rol: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 1 },
  insignia: { minWidth: 22, height: 22, paddingHorizontal: 6, backgroundColor: color.lima, alignItems: 'center', justifyContent: 'center' },
  insigniaTexto: { fontFamily: font.monoBold, fontSize: 12, color: color.tinta },
});
