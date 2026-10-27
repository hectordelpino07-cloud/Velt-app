import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Slot, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Logo, Mono } from '../components/ui';
import { CENTRO, DIRECTOR, nombreCompleto } from '../data/equipo';
import { useVelt, VeltProvider } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const NAV = [
  { ruta: '/', texto: 'Nueva idea' },
  { ruta: '/seguimiento', texto: 'Seguimiento' },
  { ruta: '/mis-tareas', texto: 'Mis tareas' },
] as const;

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
        <StatusBar style="light" />
        <Marco />
      </VeltProvider>
    </SafeAreaProvider>
  );
}

function Marco() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const ruta = usePathname();
  const { tareas } = useVelt();
  const dudas = tareas.filter((t) => t.duda && t.estado !== 'hecha').length;

  const enlaces = NAV.map((n) => {
    const on = ruta === n.ruta;
    const extra = n.ruta === '/seguimiento' && dudas ? ` · ${dudas}` : '';
    return (
      <Pressable key={n.ruta} onPress={() => router.navigate(n.ruta)} accessibilityRole="link" style={[ancho ? s.nav : s.navMovil, on && s.navOn]}>
        {ancho && <View style={[s.cuadro, on && { borderColor: color.blanco }]} />}
        <Text style={[s.navTexto, on && { color: color.blanco }]}>{n.texto + extra}</Text>
        {on && <View style={s.navCorte} />}
      </Pressable>
    );
  });

  if (ancho) {
    return (
      <View style={s.escritorio}>
        <View style={s.lateral}>
          <Logo tam={34} />
          <Mono style={{ color: color.lima, marginTop: 28, marginBottom: 14 }}>// VELT Escolar</Mono>
          <View style={{ gap: 4 }}>{enlaces}</View>
          <View style={{ flex: 1 }} />
          <View style={s.yo}>
            <Avatar id={DIRECTOR.id} />
            <View>
              <Text style={s.yoNombre}>{nombreCompleto(DIRECTOR)}</Text>
              <Text style={s.yoCentro}>{CENTRO}</Text>
            </View>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contenido}>
          <Slot />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingBottom: 10 }}>
          {enlaces}
        </ScrollView>
      </SafeAreaView>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.contenido, { padding: 16, paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
        <Slot />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  escritorio: { flex: 1, flexDirection: 'row', backgroundColor: color.crema },
  lateral: { width: 232, backgroundColor: color.tinta, padding: 20, paddingTop: 26 },
  contenido: { padding: 40, maxWidth: 1180, width: '100%' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12 },
  navMovil: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2A2E3A' },
  navOn: { backgroundColor: color.cobalto, borderColor: color.cobalto },
  navCorte: {
    position: 'absolute', right: 0, bottom: 0, width: 0, height: 0,
    borderLeftWidth: 8, borderBottomWidth: 8, borderLeftColor: 'transparent', borderBottomColor: color.tinta,
  },
  cuadro: { width: 12, height: 12, borderWidth: 2, borderColor: color.grisClaro },
  navTexto: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase', color: color.grisClaro },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  yo: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2A2E3A', paddingTop: 16 },
  yoNombre: { fontFamily: font.uiMedium, color: color.crema, fontSize: 14 },
  yoCentro: { fontFamily: font.ui, color: color.grisClaro, fontSize: 12 },
});
