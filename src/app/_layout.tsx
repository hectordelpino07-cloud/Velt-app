import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Slot, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Intro } from '../components/motion';
import { Avatar, cortado, Logo, Mono } from '../components/ui';
import { CENTRO, DIRECTOR, nombreCompleto } from '../data/equipo';
import { entra } from '../lib/motion';
import { useVelt, VeltProvider } from '../lib/store';
import { ToastProvider } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const NAV = [
  { ruta: '/', texto: 'Hoy', corto: 'Hoy', num: '01' },
  { ruta: '/idea', texto: 'Nueva idea', corto: 'Idea', num: '02' },
  { ruta: '/centro', texto: 'Mapa del centro', corto: 'Centro', num: '03' },
  { ruta: '/seguimiento', texto: 'Seguimiento', corto: 'Equipo', num: '04' },
  { ruta: '/mis-tareas', texto: 'Mis tareas', corto: 'Tareas', num: '05' },
] as const;

const ALTO_NAV = 44;
const HUECO_NAV = 4;

export default function Raiz() {
  const [listas] = useFonts({
    'ArchivoExpanded-Black': require('../../assets/fonts/ArchivoExpanded-Black.ttf'),
    'ArchivoExpanded-ExtraBold': require('../../assets/fonts/ArchivoExpanded-ExtraBold.ttf'),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  if (!listas) return <View style={{ flex: 1, backgroundColor: color.tinta }} />;

  return (
    <SafeAreaProvider>
      <VeltProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Marco />
          <Intro />
        </ToastProvider>
      </VeltProvider>
    </SafeAreaProvider>
  );
}

function Marco() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const ruta = usePathname();
  const { tareas } = useVelt();
  const dudas = tareas.filter((t) => t.duda && !t.respuesta && t.estado !== 'hecha').length;
  const pendientes = tareas.filter((t) => t.estado === 'pendiente').length;
  const activo = Math.max(0, NAV.findIndex((n) => n.ruta === ruta));

  // El recuadro azul de la barra lateral se desliza hasta la sección activa
  const y = useSharedValue(activo * (ALTO_NAV + HUECO_NAV));
  useEffect(() => {
    y.value = withSpring(activo * (ALTO_NAV + HUECO_NAV), { damping: 20, stiffness: 220 });
  }, [activo, y]);
  const indicador = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const insignia = (r: string) => (r === '/seguimiento' && dudas ? dudas : r === '/mis-tareas' && pendientes ? pendientes : 0);

  // Cada pantalla entra con un pequeño deslizamiento al cambiar de sección
  const contenido = (
    <Animated.View key={ruta} entering={entra(0)}>
      <Slot />
    </Animated.View>
  );

  if (ancho) {
    return (
      <View style={s.escritorio}>
        <View style={s.lateral}>
          <Logo tam={34} />
          <Mono style={{ color: color.lima, marginTop: 30, marginBottom: 14 }}>// VELT Escolar</Mono>
          <View style={{ gap: HUECO_NAV }}>
            <Animated.View style={[s.indicador, cortado(9), indicador]} />
            {NAV.map((n, i) => {
              const on = i === activo;
              const num = insignia(n.ruta);
              return (
                <Pressable key={n.ruta} onPress={() => router.navigate(n.ruta)} accessibilityRole="link" style={s.nav}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <>
                      <Text style={[s.navNum, (on || hovered) && { color: on ? color.lima : color.crema }]}>{n.num}</Text>
                      <Text style={[s.navTexto, (on || hovered) && { color: color.blanco }]}>{n.texto}</Text>
                      {num ? (
                        <View style={[s.insignia, on && { backgroundColor: color.lima }]}>
                          <Text style={s.insigniaTexto}>{num}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <View style={s.centro}>
            <Mono style={{ color: color.grisClaro, fontSize: 10 }}>// Centro</Mono>
            <Text style={s.centroNombre}>{CENTRO}</Text>
            <Text style={s.centroDato}>8 personas · curso 26/27</Text>
          </View>
          <View style={s.yo}>
            <Avatar id={DIRECTOR.id} activo />
            <View>
              <Text style={s.yoNombre}>{nombreCompleto(DIRECTOR)}</Text>
              <Text style={s.yoCentro}>Dirección</Text>
            </View>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contenido}>
          {contenido}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: color.tinta }}>
        <View style={s.barra}>
          <Logo tam={26} />
          <Mono style={{ color: color.lima }}>// Escolar</Mono>
        </View>
        <View style={s.pestanas}>
          {NAV.map((n, i) => {
            const on = i === activo;
            const num = insignia(n.ruta);
            return (
              <Pressable key={n.ruta} onPress={() => router.navigate(n.ruta)} accessibilityRole="link" style={s.pestana}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.navTexto, { fontSize: 10, letterSpacing: 0.6 }, on && { color: color.blanco }]}>{n.corto}</Text>
                  {num ? (
                    <View style={[s.insignia, { marginLeft: 0 }]}>
                      <Text style={s.insigniaTexto}>{num}</Text>
                    </View>
                  ) : null}
                </View>
                {on && <Animated.View entering={entra(0)} style={s.subrayado} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.contenido, { padding: 16, paddingBottom: 96 }]} keyboardShouldPersistTaps="handled">
        {contenido}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  escritorio: { flex: 1, flexDirection: 'row', backgroundColor: color.crema },
  lateral: { width: 240, backgroundColor: color.tinta, padding: 20, paddingTop: 26 },
  contenido: { padding: 44, maxWidth: 1200, width: '100%' },
  indicador: { position: 'absolute', left: 0, right: 0, top: 0, height: ALTO_NAV, backgroundColor: color.cobalto },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, height: ALTO_NAV, paddingHorizontal: 12 },
  navNum: { fontFamily: font.mono, fontSize: 10, color: '#4B5063' },
  navTexto: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase', color: color.grisClaro },
  insignia: { marginLeft: 'auto', minWidth: 20, height: 20, paddingHorizontal: 5, backgroundColor: color.lima, alignItems: 'center', justifyContent: 'center' },
  insigniaTexto: { fontFamily: font.monoBold, fontSize: 11, color: color.tinta },
  centro: { borderTopWidth: 1, borderTopColor: '#22263A', paddingVertical: 16, gap: 4 },
  centroNombre: { fontFamily: font.displayBold, fontSize: 13, color: color.crema, textTransform: 'uppercase', letterSpacing: -0.2 },
  centroDato: { fontFamily: font.ui, fontSize: 12, color: color.grisClaro },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  pestanas: { flexDirection: 'row', paddingHorizontal: 8 },
  pestana: { flex: 1, alignItems: 'center', paddingTop: 6, paddingBottom: 12 },
  subrayado: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 3, backgroundColor: color.lima },
  yo: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#22263A', paddingTop: 16 },
  yoNombre: { fontFamily: font.uiMedium, color: color.crema, fontSize: 14 },
  yoCentro: { fontFamily: font.ui, color: color.grisClaro, fontSize: 12 },
});
