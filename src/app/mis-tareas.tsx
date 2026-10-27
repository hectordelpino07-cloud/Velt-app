// Vista del personal: recibir, confirmar y marcar como hecha. Nada más.
// Mientras no haya inicio de sesión, «Ver como» permite probar cada perfil.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Boton, Chip, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { DIRECTOR, EQUIPO, persona } from '../data/equipo';
import { Tarea, useVelt } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

export default function MisTareas() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { tareas } = useVelt();
  const [yo, setYo] = useState('carmen');
  const p = persona(yo)!;
  const mias = tareas.filter((t) => t.responsableId === yo && t.estado !== 'hecha');
  const hechas = tareas.filter((t) => t.responsableId === yo && t.estado === 'hecha').length;

  return (
    <View style={{ maxWidth: 720 }}>
      <Mono style={{ marginBottom: 10 }}>// Ver como (prueba, sin inicio de sesión)</Mono>
      <View style={s.chips}>
        {EQUIPO.filter((x) => x.id !== DIRECTOR.id).map((x) => (
          <Chip key={x.id} etiqueta={x.nombre} activo={x.id === yo} onPress={() => setYo(x.id)} />
        ))}
      </View>

      <Mono style={{ marginTop: 28, marginBottom: 12 }}>
        // {p.rol} · {mias.length} pendientes · {hechas} hechas
      </Mono>
      <Titular tam={ancho ? 56 : 36} style={{ marginBottom: 24 }}>
        Hola, {p.nombre}.
      </Titular>

      {mias.length === 0 && (
        <Text style={s.vacio}>No tienes nada pendiente. Cuando dirección te envíe algo, aparecerá aquí.</Text>
      )}
      <View style={{ gap: 16 }}>
        {mias.map((t) => (
          <TarjetaTarea key={t.id} t={t} />
        ))}
      </View>
    </View>
  );
}

function TarjetaTarea({ t }: { t: Tarea }) {
  const { cambiarEstado, preguntarDuda } = useVelt();
  const [escribiendo, setEscribiendo] = useState(false);
  const [duda, setDuda] = useState('');

  return (
    <Panel corte={16}>
      <Mono style={{ color: color.lima, marginBottom: 10 }}>
        // {t.estado === 'pendiente' ? 'Nueva tarea' : 'Confirmada'} · de {DIRECTOR.nombre}
      </Mono>
      <Titular tam={24} style={{ color: color.crema, marginBottom: 12 }}>
        {t.titulo}
      </Titular>
      <Etiqueta dia={t.dia} hora={t.hora} acento />
      {t.porque ? <Text style={s.porque}>Por qué: {t.porque}</Text> : null}
      {t.nota ? <Text style={s.porque}>{t.nota}</Text> : null}
      {t.duda ? <Text style={[s.porque, { color: color.lima }]}>Tu duda: «{t.duda}» · enviada a dirección</Text> : null}

      {escribiendo ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <TextInput value={duda} onChangeText={setDuda} placeholder="Escribe tu duda" placeholderTextColor="#6E7385" style={s.entrada} autoFocus />
          <View style={s.botones}>
            <Boton
              variante="blanco"
              fondo={color.tinta}
              disabled={!duda.trim()}
              onPress={() => {
                preguntarDuda(t.id, duda.trim());
                setEscribiendo(false);
                setDuda('');
              }}
            >
              Enviar duda
            </Boton>
            <Boton variante="linea" onPress={() => setEscribiendo(false)} style={{ borderColor: color.grisClaro }}>
              <Text style={{ color: color.crema }}>Cancelar</Text>
            </Boton>
          </View>
        </View>
      ) : (
        <View style={[s.botones, { marginTop: 16 }]}>
          {t.estado === 'pendiente' ? (
            <Boton fondo={color.tinta} onPress={() => cambiarEstado(t.id, 'confirmada')}>
              Confirmar
            </Boton>
          ) : (
            <Boton fondo={color.tinta} onPress={() => cambiarEstado(t.id, 'hecha')}>
              Marcar hecha
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vacio: { fontFamily: font.ui, fontSize: 15, color: color.gris },
  porque: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.grisClaro, marginTop: 12 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entrada: { backgroundColor: '#1A1D27', color: color.crema, fontFamily: font.ui, fontSize: 15, padding: 12 },
});
