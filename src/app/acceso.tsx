// Entrada a VELT: con tu cuenta (los datos reales de tu centro) o viendo la
// demo. Tras crear la cuenta, dirección crea el centro y el resto del
// personal se une con el código de invitación que le pasa dirección.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Boton, Foto, Logo } from '../components/ui';
import { nuevoCodigo, Persona } from '../data/equipo';
import { centroNuevo } from '../lib/centro';
import { entra } from '../lib/motion';
import { useSesion } from '../lib/sesion';
import { hayServidor } from '../lib/supabase';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const CLAVE_CODIGO = 'velt.codigo.v1';
const almacen = typeof localStorage !== 'undefined' ? localStorage : null;
const guardarCodigo = (c: string | null) => {
  try {
    if (c) almacen?.setItem(CLAVE_CODIGO, c);
    else almacen?.removeItem(CLAVE_CODIGO);
  } catch {}
};
const leerCodigo = () => {
  try {
    return almacen?.getItem(CLAVE_CODIGO) ?? '';
  } catch {
    return '';
  }
};

export default function Acceso() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const sesion = useSesion();
  const params = useLocalSearchParams<{ codigo?: string }>();
  // Quien llega con el enlace de invitación ya trae su código
  const [codigoInicial] = useState(() => (typeof params.codigo === 'string' ? params.codigo.toUpperCase() : leerCodigo()));
  useEffect(() => {
    if (codigoInicial) guardarCodigo(codigoInicial);
  }, [codigoInicial]);

  // Ya dentro de un centro: a la app
  useEffect(() => {
    if (sesion.miembro) router.replace('/');
  }, [sesion.miembro]);

  return (
    <View style={[s.pantalla, !ancho && { flexDirection: 'column' }]}>
      <View style={[s.lado, !ancho && { minHeight: 220, padding: 24 }]}>
        <Foto de="pasillo" fuerza={0.22} />
        <Logo tam={ancho ? 40 : 30} />
        <View style={{ flex: 1 }} />
        <Text style={[s.ladoTitulo, { fontSize: ancho ? 56 : 32, lineHeight: ancho ? 54 : 31 }]}>Tu centro,{'\n'}coordinado.</Text>
        <Text style={s.ladoTexto}>Tareas, horarios, guardias y material del personal en un solo sitio. Sin datos de alumnos.</Text>
      </View>
      <View style={[s.formulario, !ancho && { padding: 20 }]}>
        <View style={{ width: '100%', maxWidth: 420 }}>
          {!hayServidor ? (
            <SinServidor />
          ) : sesion.correo ? (
            <Bienvenida codigoInicial={codigoInicial} />
          ) : (
            <Cuenta invitado={!!codigoInicial} />
          )}
        </View>
      </View>
    </View>
  );
}

function SinServidor() {
  const { verDemo } = useSesion();
  return (
    <View>
      <TitularRevela texto="Entra en VELT." tam={36} />
      <Text style={s.texto}>Esta versión funciona solo como demo.</Text>
      <Boton
        onPress={() => {
          verDemo();
          router.replace('/');
        }}
        style={{ marginTop: 20, alignSelf: 'flex-start' }}
      >
        Ver la demo
      </Boton>
    </View>
  );
}

// ——— Paso 1: entrar o crear la cuenta ———
function Cuenta({ invitado }: { invitado: boolean }) {
  const { entrar, registrar, verDemo } = useSesion();
  const [nueva, setNueva] = useState(invitado);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const valido = /\S+@\S+\.\S+/.test(correo) && clave.length >= 6;

  const enviar = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    const e = nueva ? await registrar(correo, clave) : await entrar(correo, clave);
    setEnviando(false);
    if (e) setError(e);
  };

  return (
    <Animated.View key={nueva ? 'nueva' : 'entrar'} entering={entra(0)}>
      <TitularRevela texto={nueva ? 'Crea tu cuenta.' : 'Entra en VELT.'} tam={36} />
      <Text style={s.texto}>
        {invitado
          ? 'Te han invitado a VELT. Crea tu cuenta con tu correo y entrarás directamente en tu centro.'
          : nueva
            ? 'Con tu correo y una contraseña. Después creas tu centro o te unes con el código que te pase dirección.'
            : 'Con el correo y la contraseña de tu cuenta.'}
      </Text>

      <Text style={s.etiqueta}>Correo</Text>
      <TextInput
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
        placeholder="nombre@centro.es"
        placeholderTextColor="#9A9DA8"
        style={s.campo}
      />
      <Text style={s.etiqueta}>Contraseña</Text>
      <TextInput
        value={clave}
        onChangeText={setClave}
        secureTextEntry
        autoComplete={nueva ? 'new-password' : 'current-password'}
        placeholder={nueva ? 'Al menos 6 caracteres' : ''}
        placeholderTextColor="#9A9DA8"
        onSubmitEditing={enviar}
        style={s.campo}
      />
      {error && (
        <Animated.View entering={entra(0)} style={s.error}>
          <Text style={s.errorTexto}>{error}</Text>
        </Animated.View>
      )}
      <Boton onPress={enviar} disabled={!valido || enviando} style={{ marginTop: 20 }}>
        {enviando ? 'Un momento…' : nueva ? 'Crear cuenta' : 'Entrar'}
      </Boton>
      <Pressable
        onPress={() => {
          setNueva((x) => !x);
          setError(null);
        }}
        accessibilityRole="button"
        style={{ marginTop: 16, alignSelf: 'flex-start' }}
      >
        <Text style={s.enlace}>{nueva ? '¿Ya tienes cuenta? Entra' : '¿Es tu primera vez? Crea tu cuenta'}</Text>
      </Pressable>

      <View style={s.demo}>
        <Text style={s.demoTitulo}>¿Solo quieres verlo?</Text>
        <Text style={s.demoTexto}>La demo tiene un instituto de ejemplo con 15 personas. Lo que hagas allí no se guarda en ningún centro.</Text>
        <Boton
          variante="linea"
          pequeno
          onPress={() => {
            verDemo();
            router.replace('/');
          }}
          style={{ alignSelf: 'flex-start', marginTop: 12 }}
        >
          Ver la demo
        </Boton>
      </View>
    </Animated.View>
  );
}

// ——— Paso 2: crear el centro o unirse a uno ———
function Bienvenida({ codigoInicial }: { codigoInicial: string }) {
  const { correo, crearCentro, unirse, salir } = useSesion();
  const [opcion, setOpcion] = useState<'unirse' | 'crear'>(codigoInicial ? 'unirse' : 'crear');
  const [codigo, setCodigo] = useState(codigoInicial);
  const [centro, setCentro] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const hacerUnirse = async (c = codigo) => {
    if (c.trim().length < 6 || enviando) return;
    setEnviando(true);
    setError(null);
    const e = await unirse(c.trim());
    setEnviando(false);
    if (e) setError(e);
    else guardarCodigo(null);
  };
  // Con el enlace de invitación, se une sin tener que pulsar nada
  const hecho = useRef(false);
  useEffect(() => {
    if (codigoInicial && !hecho.current) {
      hecho.current = true;
      hacerUnirse(codigoInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoInicial]);

  const hacerCrear = async () => {
    if (!centro.trim() || !nombre.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    const director: Persona = { id: `dir-${Date.now().toString(36)}`, nombre: nombre.trim(), apellido: apellido.trim(), rol: 'Dirección', turno: 'ambos', codigo: nuevoCodigo() };
    const e = await crearCentro(centro.trim(), director.id, centroNuevo(director));
    setEnviando(false);
    if (e) setError(e);
  };

  return (
    <Animated.View entering={entra(0)}>
      <TitularRevela texto="Tu centro." tam={36} />
      <Text style={s.texto}>Has entrado como {correo}. Falta unirte a tu centro.</Text>

      <View style={s.opciones}>
        <Pressable onPress={() => setOpcion('unirse')} accessibilityRole="tab" style={[s.opcion, opcion === 'unirse' && s.opcionOn]}>
          <Text style={[s.opcionTexto, opcion === 'unirse' && { color: color.crema }]}>Tengo un código</Text>
        </Pressable>
        <Pressable onPress={() => setOpcion('crear')} accessibilityRole="tab" style={[s.opcion, opcion === 'crear' && s.opcionOn]}>
          <Text style={[s.opcionTexto, opcion === 'crear' && { color: color.crema }]}>Soy dirección: crear el centro</Text>
        </Pressable>
      </View>

      {opcion === 'unirse' ? (
        <Animated.View key="unirse" entering={entra(0)}>
          <Text style={s.texto}>Dirección te habrá pasado un código de 6 letras o un enlace.</Text>
          <TextInput
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            autoCapitalize="characters"
            placeholder="K7P2QX"
            placeholderTextColor="#9A9DA8"
            onSubmitEditing={() => hacerUnirse()}
            style={[s.campo, s.campoCodigo]}
          />
          <Boton onPress={() => hacerUnirse()} disabled={codigo.length < 6 || enviando} style={{ marginTop: 16 }}>
            {enviando ? 'Un momento…' : 'Unirme a mi centro'}
          </Boton>
        </Animated.View>
      ) : (
        <Animated.View key="crear" entering={entra(0)}>
          <Text style={s.etiqueta}>Nombre del centro</Text>
          <TextInput value={centro} onChangeText={setCentro} placeholder="IES …" placeholderTextColor="#9A9DA8" style={s.campo} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.etiqueta}>Tu nombre</Text>
              <TextInput value={nombre} onChangeText={setNombre} autoComplete="given-name" style={s.campo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.etiqueta}>Apellido</Text>
              <TextInput value={apellido} onChangeText={setApellido} autoComplete="family-name" style={s.campo} />
            </View>
          </View>
          <Text style={s.nota}>Empezarás con una jornada de mañana y unas plantas de ejemplo. En «Configurar centro» pones tus aulas y tu personal, y cada persona recibe su código para entrar.</Text>
          <Boton onPress={hacerCrear} disabled={!centro.trim() || !nombre.trim() || enviando} style={{ marginTop: 16 }}>
            {enviando ? 'Creando…' : 'Crear el centro'}
          </Boton>
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={entra(0)} style={s.error}>
          <Text style={s.errorTexto}>{error}</Text>
        </Animated.View>
      )}

      <Pressable onPress={salir} accessibilityRole="button" style={{ marginTop: 26, alignSelf: 'flex-start' }}>
        <Text style={s.enlace}>Salir de esta cuenta</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, minHeight: '100%' as never, flexDirection: 'row', backgroundColor: color.crema },
  lado: { flex: 1, backgroundColor: color.tinta, padding: 48, overflow: 'hidden' },
  ladoTitulo: { fontFamily: font.display, color: color.crema, textTransform: 'uppercase', letterSpacing: -1.5 },
  ladoTexto: { fontFamily: font.uiMedium, fontSize: 16, lineHeight: 23, color: color.grisClaro, marginTop: 16, maxWidth: 420 },
  formulario: { flex: 1, padding: 48, alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.gris, marginTop: 12 },
  etiqueta: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta, marginTop: 18, marginBottom: 6 },
  campo: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, paddingVertical: 13, paddingHorizontal: 14, fontFamily: font.ui, fontSize: 16, color: color.tinta, outlineStyle: 'none' } as never,
  campoCodigo: { fontFamily: font.monoBold, fontSize: 24, letterSpacing: 6, textAlign: 'center', marginTop: 14 } as never,
  error: { backgroundColor: '#FBE3E3', borderLeftWidth: 4, borderLeftColor: color.rojo, padding: 12, marginTop: 16 },
  errorTexto: { fontFamily: font.uiMedium, fontSize: 14, lineHeight: 20, color: color.tinta },
  enlace: { fontFamily: font.uiBold, fontSize: 14, color: color.cobalto },
  demo: { borderTopWidth: 1, borderTopColor: color.borde, marginTop: 30, paddingTop: 20 },
  demoTitulo: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  demoTexto: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris, marginTop: 4 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20 },
  opcion: { paddingVertical: 9, paddingHorizontal: 12, borderWidth: 2, borderColor: color.tinta },
  opcionOn: { backgroundColor: color.tinta },
  opcionTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  nota: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris, marginTop: 14 },
});
