import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Redirect, Slot, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icono, ICONO_RUTA } from '../components/iconos';
import { Intro } from '../components/motion';
import { Avatar, cortado, Logo, Mono } from '../components/ui';
import { CENTRO, nombreCompleto } from '../data/equipo';
import { curva } from '../lib/motion';
import { CentroProvider, useCentro } from '../lib/centro';
import { SesionProvider, useSesion } from '../lib/sesion';
import { useVelt, useYo, VeltProvider } from '../lib/store';
import { ToastProvider } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

type Seccion = { ruta: string; texto: string; corto: string };

// Dirección y jefatura organizan el centro
const NAV_GESTION: Seccion[] = [
  { ruta: '/', texto: 'Hoy', corto: 'Hoy' },
  { ruta: '/idea', texto: 'Nueva idea', corto: 'Idea' },
  { ruta: '/horarios', texto: 'Horarios', corto: 'Horarios' },
  { ruta: '/centro', texto: 'Mapa del centro', corto: 'Mapa' },
  { ruta: '/material', texto: 'Material', corto: 'Material' },
  { ruta: '/seguimiento', texto: 'Seguimiento', corto: 'Equipo' },
];
// El profesorado y el resto del personal ven su día, su horario y a sus compañeros
const NAV_PERSONAL: Seccion[] = [
  { ruta: '/', texto: 'Mi día', corto: 'Mi día' },
  { ruta: '/mis-tareas', texto: 'Mis tareas', corto: 'Tareas' },
  { ruta: '/horarios', texto: 'Horarios', corto: 'Horarios' },
  { ruta: '/centro', texto: 'Mapa del centro', corto: 'Mapa' },
  { ruta: '/equipo', texto: 'Equipo', corto: 'Equipo' },
  { ruta: '/material', texto: 'Material', corto: 'Material' },
];
const MIS_TAREAS: Seccion = { ruta: '/mis-tareas', texto: 'Mis tareas', corto: 'Tareas' };
const SOLO_GESTION = ['/idea', '/seguimiento', '/configurar'];

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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <SesionProvider>
        <Puerta>
          <VeltProvider>
            <CentroProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Marco />
                <Intro />
              </ToastProvider>
            </CentroProvider>
          </VeltProvider>
        </Puerta>
      </SesionProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// En la web, los detalles que el navegador pinta por su cuenta también llevan
// la marca: selección de texto, cursor, foco del teclado y barras de scroll.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('velt-web')) {
  const estilo = document.createElement('style');
  estilo.id = 'velt-web';
  estilo.textContent = `
    ::selection { background: ${color.lima}; color: ${color.tinta}; }
    * { caret-color: ${color.cobalto}; -webkit-tap-highlight-color: transparent; }
    :focus-visible { outline: 2px solid ${color.cobalto}; outline-offset: 2px; }
    html, body { background: ${color.crema}; overscroll-behavior: none; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    * { scrollbar-width: thin; scrollbar-color: #C9C3B4 transparent; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-thumb { background: #C9C3B4; border: 3px solid ${color.crema}; }
    ::-webkit-scrollbar-track { background: transparent; }
    input, textarea { font-size: max(16px, 1em); }
    html, body, #root { height: 100%; height: 100dvh; }
    html { -webkit-text-size-adjust: 100%; }
    [role="button"], [role="link"], [role="tab"], button, a { touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; } }
  `;
  document.head.appendChild(estilo);
  // Pantalla completa en el móvil: la app llega a la muesca y la barra del sistema toma el color de la cabecera
  const vista = document.querySelector('meta[name="viewport"]') ?? document.head.appendChild(document.createElement('meta'));
  vista.setAttribute('name', 'viewport');
  vista.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content');
  const tema = document.createElement('meta');
  tema.setAttribute('name', 'theme-color');
  tema.setAttribute('content', color.tinta);
  document.head.appendChild(tema);
}

// Antes de enseñar la app: ¿demo o cuenta? ¿ya está dentro de un centro?
function Puerta({ children }: { children: ReactNode }) {
  const { modo, cargando, miembro, correo } = useSesion();
  const ruta = usePathname();
  if (cargando) return <View style={{ flex: 1, backgroundColor: color.tinta }} />;
  const fuera = modo === null || (modo === 'real' && (!correo || !miembro));
  if (ruta === '/acceso')
    return (
      <ToastProvider>
        <StatusBar style="light" />
        <ScrollView style={{ flex: 1, backgroundColor: color.crema }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Slot />
        </ScrollView>
      </ToastProvider>
    );
  if (fuera) return <Redirect href="/acceso" />;
  return <>{children}</>;
}

function Marco() {
  const sesion = useSesion();
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const ruta = usePathname();
  const { tareas, avisos } = useVelt();
  const { materiales, espacios } = useCentro();
  const { yo, gestion } = useYo();

  // Jefatura organiza el centro y además recibe tareas de dirección
  const NAV = gestion ? (yo.rol === 'Jefatura' ? [NAV_GESTION[0], MIS_TAREAS, ...NAV_GESTION.slice(1)] : NAV_GESTION) : NAV_PERSONAL;
  const dudas = tareas.filter((t) => t.duda && !t.respuesta && t.estado !== 'hecha').length;
  const averiados = materiales.filter((m) => m.estado === 'averiado').length;
  const porConfirmar = tareas.filter((t) => t.responsableId === yo.id && t.estado === 'pendiente').length;
  const sinLeer = avisos.filter((a) => a.para === yo.id && !a.leido).length;
  const activo = NAV.findIndex((n) => n.ruta === ruta); // -1 en fichas, avisos y configurar
  const configurando = ruta === '/configurar';
  const [mas, setMas] = useState(false);

  // El recuadro azul de la barra lateral se desliza hasta la sección activa
  const y = useSharedValue(Math.max(0, activo) * (ALTO_NAV + HUECO_NAV));
  useEffect(() => {
    if (activo >= 0) y.set(withTiming(activo * (ALTO_NAV + HUECO_NAV), { duration: 200, easing: curva }));
  }, [activo, y]);
  const indicador = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const insignia = (r: string) =>
    r === '/seguimiento' && dudas ? dudas : r === '/material' && gestion && averiados ? averiados : r === '/mis-tareas' && porConfirmar ? porConfirmar : 0;

  // Lo que es solo de dirección no se abre con otro perfil
  if (!gestion && SOLO_GESTION.includes(ruta)) return <Redirect href="/" />;

  // Cambiar de sección es como cambiar de pestaña: sin animación, se hace
  // decenas de veces al día y tiene que sentirse inmediato
  const contenido = <Slot />;

  if (ancho) {
    return (
      <View style={s.escritorio}>
        <View style={s.lateral}>
          <Logo tam={34} />
          <Mono marca style={{ color: color.lima, marginTop: 30, marginBottom: 14 }}>
            {'// '}VELT Escolar
          </Mono>
          <View style={{ gap: HUECO_NAV }}>
            <Animated.View style={[s.indicador, cortado(9), indicador, activo < 0 && { opacity: 0 }]} />
            {NAV.map((n, i) => {
              const on = i === activo;
              const num = insignia(n.ruta);
              return (
                <Pressable key={n.ruta} onPress={() => router.navigate(n.ruta as never)} accessibilityRole="link" style={s.nav}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <>
                      <Icono nombre={ICONO_RUTA[n.ruta] ?? 'hoy'} tam={18} color={on || hovered ? color.blanco : color.grisClaro} />
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
          <Pressable onPress={() => router.navigate('/avisos')} accessibilityRole="link" style={[s.nav, s.avisos, ruta === '/avisos' && { backgroundColor: '#1A1D27' }]}>
            {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
              <>
                <Text style={[s.navTexto, (hovered || ruta === '/avisos') && { color: color.blanco }]}>Avisos</Text>
                {sinLeer ? (
                  <View style={s.insignia}>
                    <Text style={s.insigniaTexto}>{sinLeer}</Text>
                  </View>
                ) : null}
              </>
            )}
          </Pressable>
          <View style={s.centro}>
            <Mono style={{ color: color.grisClaro, fontSize: 12 }}>Centro</Mono>
            <Text style={s.centroNombre}>{CENTRO}</Text>
            <Text style={s.centroDato}>
              {espacios.length} espacios · {materiales.length} materiales
            </Text>
            {sesion.modo === 'demo' && (
              <Pressable
                onPress={() => {
                  sesion.salirDeDemo();
                  router.replace('/acceso');
                }}
                accessibilityRole="link"
                style={s.configurar}
              >
                {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.configurarTexto, { color: color.lima }, hovered && { textDecorationLine: 'underline' }]}>Estás en la demo · Entrar con tu centro →</Text>}
              </Pressable>
            )}
            {gestion && (
              <Pressable onPress={() => router.navigate('/configurar')} accessibilityRole="link" style={s.configurar}>
                {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                  <Text style={[s.configurarTexto, (hovered || configurando) && { color: color.lima }]}>
                    {configurando ? '● ' : ''}Configurar centro →
                  </Text>
                )}
              </Pressable>
            )}
          </View>
          <View style={s.yo}>
            <Pressable onPress={() => router.navigate(`/persona/${yo.id}`)} accessibilityRole="link" accessibilityLabel="Ver mi ficha" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
              <Avatar id={yo.id} activo />
              <View style={{ flex: 1 }}>
                <Text style={s.yoNombre} numberOfLines={1}>
                  {nombreCompleto(yo)}
                </Text>
                <Text style={s.yoCentro}>{yo.rol}</Text>
              </View>
            </Pressable>
            {sesion.modo === 'real' ? (
              <Pressable onPress={sesion.salir} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
                {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.configurarTexto, hovered && { color: color.lima }]}>Salir</Text>}
              </Pressable>
            ) : (
              <Pressable onPress={() => router.navigate('/entrar')} accessibilityRole="link" accessibilityLabel="Cambiar de persona">
                {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.configurarTexto, (hovered || ruta === '/entrar') && { color: color.lima }]}>Cambiar</Text>}
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.contenido}>
          {contenido}
        </ScrollView>
      </View>
    );
  }

  // En el móvil: cabecera fina arriba y las secciones principales abajo, al alcance del pulgar
  const extra: Seccion[] = gestion ? [{ ruta: '/configurar', texto: 'Configurar centro', corto: 'Ajustes' }] : [];
  const abajo = NAV.slice(0, 4);
  const resto = [...NAV.slice(4), ...extra, { ruta: '/avisos', texto: 'Avisos', corto: 'Avisos' }];
  const enResto = resto.some((n) => n.ruta === ruta);
  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: color.tinta }}>
        <View style={s.barra}>
          <Logo tam={26} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Pressable onPress={() => router.navigate('/avisos')} accessibilityRole="link" accessibilityLabel={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icono nombre="avisos" tam={22} color={ruta === '/avisos' ? color.lima : color.crema} />
              {sinLeer ? (
                <View style={[s.insignia, { marginLeft: 0 }]}>
                  <Text style={s.insigniaTexto}>{sinLeer}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable onPress={() => router.navigate(sesion.modo === 'real' ? `/persona/${yo.id}` : '/entrar')} accessibilityRole="link" hitSlop={8} accessibilityLabel={sesion.modo === 'real' ? 'Ver mi ficha' : `Eres ${yo.nombre}. Cambiar de persona`}>
              <Avatar id={yo.id} tam={30} activo />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.contenido, { padding: 16, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        {contenido}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={s.tabs}>
        <View style={s.tabsFila}>
          {abajo.map((n) => {
            const on = n.ruta === ruta;
            const num = insignia(n.ruta);
            return (
              <Pressable key={n.ruta} onPress={() => router.navigate(n.ruta as never)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={s.tab}>
                <Icono nombre={ICONO_RUTA[n.ruta] ?? 'hoy'} color={on ? color.lima : color.grisClaro} />
                <Text style={[s.tabTexto, on && { color: color.blanco }]} numberOfLines={1}>
                  {n.corto}
                </Text>
                {num ? (
                  <View style={s.tabInsignia}>
                    <Text style={s.insigniaTexto}>{num}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable onPress={() => setMas(true)} accessibilityRole="button" accessibilityLabel="Más secciones" style={s.tab}>
            <Icono nombre="mas" color={enResto ? color.lima : color.grisClaro} />
            <Text style={[s.tabTexto, enResto && { color: color.blanco }]}>Más</Text>
            {resto.some((n) => insignia(n.ruta)) || sinLeer ? <View style={s.tabPunto} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>
      {mas && (
        <Hoja onCerrar={() => setMas(false)}>
          {resto.map((n) => {
            const num = n.ruta === '/avisos' ? sinLeer : insignia(n.ruta);
            return (
              <Pressable
                key={n.ruta}
                onPress={() => {
                  setMas(false);
                  router.navigate(n.ruta as never);
                }}
                accessibilityRole="link"
                style={({ pressed }) => [s.hojaFila, pressed && { backgroundColor: '#1A1D27' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Icono nombre={ICONO_RUTA[n.ruta] ?? 'hoy'} color={n.ruta === ruta ? color.lima : color.grisClaro} />
                  <Text style={[s.hojaTexto, n.ruta === ruta && { color: color.lima }]}>{n.texto}</Text>
                </View>
                {num ? (
                  <View style={[s.insignia, { marginLeft: 0 }]}>
                    <Text style={s.insigniaTexto}>{num}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setMas(false);
              if (sesion.modo === 'real') sesion.salir();
              else router.navigate('/entrar');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [s.hojaFila, pressed && { backgroundColor: '#1A1D27' }]}
          >
            <Text style={[s.hojaTexto, { color: color.grisClaro }]}>{sesion.modo === 'real' ? 'Cerrar sesión' : 'Cambiar de persona'}</Text>
          </Pressable>
        </Hoja>
      )}
    </View>
  );
}

// Hoja que sube desde abajo con el resto de secciones. Se cierra tocando fuera.
function Hoja({ children, onCerrar }: { children: ReactNode; onCerrar: () => void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,13,20,0.55)' }]}>
        <Pressable onPress={onCerrar} accessibilityLabel="Cerrar" style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(260).easing(curva)} style={s.hoja}>
        <SafeAreaView edges={['bottom']}>
          <View style={s.hojaAsa} />
          {children}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { backgroundColor: color.tinta, borderTopWidth: 1, borderTopColor: '#1E2233' },
  tabsFila: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 10, minHeight: 52 },
  tabTexto: { fontFamily: font.uiMedium, fontSize: 12, color: color.grisClaro, marginTop: 4 },
  tabInsignia: { position: 'absolute', top: 3, left: '60%' as never, minWidth: 18, height: 18, paddingHorizontal: 4, backgroundColor: color.lima, alignItems: 'center', justifyContent: 'center' },
  tabPunto: { position: 'absolute', top: 7, left: '64%' as never, width: 7, height: 7, backgroundColor: color.lima },
  hoja: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.tinta, paddingTop: 8, paddingBottom: 12 },
  hojaAsa: { alignSelf: 'center', width: 36, height: 4, backgroundColor: '#3A4058', marginBottom: 10 },
  hojaFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 22 },
  hojaTexto: { fontFamily: font.uiBold, fontSize: 17, color: color.crema },
  escritorio: { flex: 1, flexDirection: 'row', backgroundColor: color.crema },
  lateral: { width: 240, backgroundColor: color.tinta, padding: 20, paddingTop: 26 },
  contenido: { padding: 44, maxWidth: 1200, width: '100%' },
  indicador: { position: 'absolute', left: 0, right: 0, top: 0, height: ALTO_NAV, backgroundColor: color.cobalto },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, height: ALTO_NAV, paddingHorizontal: 12 },
  navTexto: { fontFamily: font.uiMedium, fontSize: 15, color: color.grisClaro },
  avisos: { marginBottom: 12 },
  insignia: { marginLeft: 'auto', minWidth: 20, height: 20, paddingHorizontal: 5, backgroundColor: color.lima, alignItems: 'center', justifyContent: 'center' },
  insigniaTexto: { fontFamily: font.monoBold, fontSize: 11, color: color.tinta },
  centro: { borderTopWidth: 1, borderTopColor: '#22263A', paddingVertical: 16, gap: 4 },
  centroNombre: { fontFamily: font.displayBold, fontSize: 13, color: color.crema, textTransform: 'uppercase', letterSpacing: -0.2 },
  centroDato: { fontFamily: font.ui, fontSize: 12, color: color.grisClaro },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  pestanas: { flexDirection: 'row', paddingHorizontal: 6 },
  pestana: { alignItems: 'center', paddingTop: 6, paddingBottom: 12, paddingHorizontal: 9 },
  configurar: { marginTop: 10, alignSelf: 'flex-start' },
  configurarTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.grisClaro },
  subrayado: { position: 'absolute', bottom: 0, left: 7, right: 7, height: 3, backgroundColor: color.lima },
  yo: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#22263A', paddingTop: 16 },
  yoNombre: { fontFamily: font.uiMedium, color: color.crema, fontSize: 14 },
  yoCentro: { fontFamily: font.ui, color: color.grisClaro, fontSize: 12 },
});
