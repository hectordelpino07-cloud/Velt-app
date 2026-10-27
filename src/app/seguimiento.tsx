// Dirección ve en qué estado está cada tarea enviada y las dudas del equipo.
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Avatar, Boton, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { nombreCompleto, persona } from '../data/equipo';
import { Estado, Tarea, useVelt } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const COLUMNAS: { estado: Estado; titulo: string }[] = [
  { estado: 'pendiente', titulo: 'Sin confirmar' },
  { estado: 'confirmada', titulo: 'Confirmadas' },
  { estado: 'hecha', titulo: 'Hechas' },
];

export default function Seguimiento() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { tareas, reiniciar } = useVelt();
  const dudas = tareas.filter((t) => t.duda && t.estado !== 'hecha');

  return (
    <View>
      <Mono style={{ marginBottom: 12 }}>// Seguimiento · {tareas.length} tareas</Mono>
      <Titular tam={ancho ? 64 : 38} style={{ marginBottom: 28 }}>
        Quién tiene{'\n'}qué entre manos.
      </Titular>

      {dudas.map((t) => (
        <Panel key={t.id} bg={color.lima} corte={14} style={{ marginBottom: 14 }}>
          <Mono style={{ color: color.tinta }}>// Duda de {persona(t.responsableId)?.nombre} · {t.titulo}</Mono>
          <Text style={s.duda}>«{t.duda}»</Text>
        </Panel>
      ))}

      <View style={[s.columnas, !ancho && { flexDirection: 'column' }]}>
        {COLUMNAS.map((c) => {
          const lista = tareas.filter((t) => t.estado === c.estado);
          return (
            <View key={c.estado} style={ancho ? { flex: 1 } : undefined}>
              <View style={s.cabecera}>
                <Text style={s.cabTexto}>{c.titulo}</Text>
                <Text style={s.cabN}>{lista.length}</Text>
              </View>
              {lista.length === 0 && <Text style={s.vacio}>Nada por aquí.</Text>}
              {lista.map((t) => (
                <Fila key={t.id} t={t} />
              ))}
            </View>
          );
        })}
      </View>

      <Boton variante="linea" onPress={reiniciar} style={{ alignSelf: 'flex-start', marginTop: 32 }}>
        Borrar datos de prueba
      </Boton>
    </View>
  );
}

function Fila({ t }: { t: Tarea }) {
  const p = persona(t.responsableId);
  return (
    <View style={s.fila}>
      <Avatar id={t.responsableId} tam={30} />
      <View style={{ flex: 1 }}>
        <Text style={s.titulo}>{t.titulo}</Text>
        <Text style={s.sub}>{p ? nombreCompleto(p) : '—'}</Text>
        <View style={{ marginTop: 8 }}>
          <Etiqueta dia={t.dia} hora={t.hora} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  columnas: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 6 },
  cabTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  cabN: { fontFamily: font.display, fontSize: 22, color: color.cobalto },
  vacio: { fontFamily: font.ui, fontSize: 13, color: color.gris, paddingVertical: 12 },
  fila: { flexDirection: 'row', gap: 12, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14, marginTop: 8 },
  titulo: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  sub: { fontFamily: font.ui, fontSize: 12, color: color.gris, marginTop: 2 },
  duda: { fontFamily: font.uiMedium, fontSize: 16, color: color.tinta, marginTop: 8 },
});
