// Dirección ve en qué estado está cada tarea, la carga de cada persona
// y responde a las dudas del equipo.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeOutUp } from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Barra, Boton, Contador, cortado, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { DIRECTOR, EQUIPO, nombreCompleto, persona } from '../data/equipo';
import { entra, recoloca, sale } from '../lib/motion';
import { Estado, Tarea, useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const COLUMNAS: { estado: Estado; titulo: string; tono: string }[] = [
  { estado: 'pendiente', titulo: 'Sin confirmar', tono: '#C9C3B4' },
  { estado: 'confirmada', titulo: 'Confirmadas', tono: color.lima },
  { estado: 'hecha', titulo: 'Hechas', tono: color.cobalto },
];

const CARGA_ALTA = 4;

export default function Seguimiento() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  // Carga al lado del tablero solo en pantallas grandes; columnas en fila si caben
  const cargaAlLado = width >= 1500;
  const columnasEnFila = width >= 1100;
  const { tareas, carga, reiniciar } = useVelt();
  const dudas = tareas.filter((t) => t.duda && !t.respuesta && t.estado !== 'hecha');
  const n = (e: Estado) => tareas.filter((t) => t.estado === e).length;
  const equipo = EQUIPO.filter((p) => p.id !== DIRECTOR.id).sort((a, b) => (carga[b.id] ?? 0) - (carga[a.id] ?? 0));
  const maxCarga = Math.max(CARGA_ALTA, ...equipo.map((p) => carga[p.id] ?? 0));

  return (
    <View>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 12 }}>// Seguimiento · en tiempo real</Mono>
      </Animated.View>
      <View style={{ marginBottom: 28 }}>
        <TitularRevela texto={'Quién tiene\nqué entre manos.'} tam={ancho ? 68 : 38} />
      </View>

      <Animated.View entering={entra(2)} style={[s.resumen, cortado(24)]}>
        <View style={s.cifras}>
          <Cifra n={tareas.length} l="Tareas" />
          <Cifra n={n('pendiente')} l="Sin confirmar" />
          <Cifra n={n('confirmada')} l="Confirmadas" />
          <Cifra n={n('hecha')} l="Hechas" azul />
        </View>
        <Barra
          alto={10}
          vacio="#232838"
          total={tareas.length}
          tramos={[
            { valor: n('hecha'), color: color.cobalto },
            { valor: n('confirmada'), color: color.lima },
            { valor: n('pendiente'), color: '#4A5068' },
          ]}
        />
      </Animated.View>

      {dudas.length > 0 && (
        <View style={{ marginTop: 28 }}>
          <Mono style={{ marginBottom: 12 }}>// Dudas del equipo · {dudas.length}</Mono>
          <View style={{ gap: 14 }}>
            {dudas.map((t, i) => (
              <Animated.View key={t.id} entering={entra(i, 200)} exiting={FadeOutUp.duration(240)} layout={recoloca}>
                <Duda t={t} />
              </Animated.View>
            ))}
          </View>
        </View>
      )}

      <View style={[s.bloques, !cargaAlLado && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Animated.View entering={entra(3)} style={cargaAlLado ? { width: 340 } : undefined}>
          <View style={s.cabecera}>
            <Text style={s.cabTexto}>Carga del equipo</Text>
            <Text style={s.cabSub}>tareas activas</Text>
          </View>
          {equipo.map((p, i) => {
            const c = carga[p.id] ?? 0;
            const alta = c >= CARGA_ALTA;
            return (
              <Animated.View key={p.id} entering={entra(i, 300)} layout={recoloca} style={s.persona}>
                <Avatar id={p.id} tam={30} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.personaNombre}>
                      {p.nombre} <Text style={s.personaRol}>· {p.rol}</Text>
                    </Text>
                    <Text style={[s.personaN, alta && { color: color.rojo }, c === 0 && { color: color.gris }]}>{c === 0 ? 'Libre' : c}</Text>
                  </View>
                  <Barra alto={6} total={maxCarga} tramos={[{ valor: c, color: alta ? color.rojo : color.tinta }]} />
                </View>
              </Animated.View>
            );
          })}
          <Text style={s.nota}>VELT tiene en cuenta esta carga al proponerte a quién asignar cada tarea.</Text>
        </Animated.View>

        <View style={[s.columnas, !columnasEnFila && { flexDirection: 'column', alignItems: 'stretch' }, cargaAlLado && { flex: 1 }]}>
          {COLUMNAS.map((c, ci) => {
            const lista = tareas.filter((t) => t.estado === c.estado);
            return (
              <Animated.View key={c.estado} entering={entra(ci, 350)} style={columnasEnFila ? { flex: 1, minWidth: 0 } : undefined}>
                <View style={[s.cabecera, { borderTopColor: c.tono === '#C9C3B4' ? color.tinta : c.tono }]}>
                  <Text style={s.cabTexto}>{c.titulo}</Text>
                  <Contador valor={lista.length} style={s.cabN} />
                </View>
                {lista.length === 0 && <Text style={s.vacio}>Nada por aquí.</Text>}
                {lista.map((t) => (
                  <Animated.View key={t.id} entering={entra(0, 100)} exiting={sale} layout={recoloca}>
                    <Fila t={t} />
                  </Animated.View>
                ))}
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Boton variante="linea" pequeno onPress={reiniciar} style={{ alignSelf: 'flex-start', marginTop: 36 }}>
        Borrar datos de prueba
      </Boton>
    </View>
  );
}

function Cifra({ n, l, azul }: { n: number; l: string; azul?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Contador valor={n} style={[s.cifraN, azul && { color: color.lima }]} />
      <Text style={s.cifraL}>{l}</Text>
    </View>
  );
}

function Duda({ t }: { t: Tarea }) {
  const { responder } = useVelt();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const p = persona(t.responsableId)!;
  return (
    <Panel bg={color.lima} corte={14}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar id={p.id} tam={32} />
        <View style={{ flex: 1 }}>
          <Mono style={{ color: color.tinta }}>// {nombreCompleto(p)} pregunta</Mono>
          <Text style={s.dudaTarea}>{t.titulo}</Text>
        </View>
      </View>
      <Text style={s.duda}>«{t.duda}»</Text>
      <View style={s.responder}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={`Responder a ${p.nombre}…`}
          placeholderTextColor="#5E6B33"
          style={s.entrada}
          onSubmitEditing={() => texto.trim() && responder(t.id, texto.trim())}
        />
        <Boton
          variante="tinta"
          fondo={color.lima}
          disabled={!texto.trim()}
          onPress={() => {
            responder(t.id, texto.trim());
            toast(`Respuesta enviada a ${p.nombre}.`);
          }}
        >
          Responder
        </Boton>
      </View>
    </Panel>
  );
}

function Fila({ t }: { t: Tarea }) {
  const p = persona(t.responsableId);
  return (
    <View style={s.fila}>
      <Avatar id={t.responsableId} tam={28} />
      <View style={{ flex: 1 }}>
        <Text style={[s.titulo, t.estado === 'hecha' && { textDecorationLine: 'line-through', color: color.gris }]}>{t.titulo}</Text>
        <Text style={s.sub}>{p ? nombreCompleto(p) : '—'}</Text>
        <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Etiqueta dia={t.dia} hora={t.hora} />
          {t.duda ? <Text style={s.marcaDuda}>{t.respuesta ? 'Duda resuelta' : 'Tiene una duda'}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  resumen: { backgroundColor: color.tinta, padding: 26, gap: 18 },
  cifras: { flexDirection: 'row', gap: 8 },
  cifraN: { fontFamily: font.display, fontSize: 52, letterSpacing: -2, color: color.crema },
  cifraL: { fontFamily: font.ui, fontSize: 13, color: color.grisClaro, marginTop: 2 },
  bloques: { flexDirection: 'row', gap: 32, marginTop: 36, alignItems: 'flex-start' },
  columnas: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 6 },
  cabTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  cabN: { fontFamily: font.display, fontSize: 22, color: color.cobalto },
  persona: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borde },
  personaNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  personaRol: { fontFamily: font.ui, color: color.gris, fontSize: 12 },
  personaN: { fontFamily: font.monoBold, fontSize: 12, color: color.tinta, textTransform: 'uppercase' },
  nota: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.gris, marginTop: 12 },
  vacio: { fontFamily: font.ui, fontSize: 13, color: color.gris, paddingVertical: 12 },
  fila: { flexDirection: 'row', gap: 12, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14, marginTop: 8 },
  titulo: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  sub: { fontFamily: font.ui, fontSize: 12, color: color.gris, marginTop: 2 },
  marcaDuda: { fontFamily: font.monoBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: color.tinta, backgroundColor: color.lima, paddingHorizontal: 6, paddingVertical: 3 },
  dudaTarea: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta, marginTop: 2 },
  duda: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 24, color: color.tinta, marginTop: 14 },
  responder: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' },
  entrada: { flex: 1, minWidth: 180, borderBottomWidth: 2, borderBottomColor: color.tinta, paddingVertical: 10, fontFamily: font.ui, fontSize: 15, color: color.tinta, outlineStyle: 'none' } as never,
});
