// Pantalla principal de dirección: escribir una idea y convertirla en tareas.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Avatar, Boton, Chip, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { DIRECTOR, nombreCompleto, persona } from '../data/equipo';
import { analizarIdea, Analisis } from '../lib/parser';
import { useVelt } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const EJEMPLO =
  'El jueves hay claustro a las 17:00. Necesito que Inés prepare el orden del día, que Carmen abra el salón de actos y que alguien imprima las actas. Raúl ya va justo, mejor que no.';

export default function NuevaIdea() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  // Idea y tareas lado a lado solo si caben bien; si no, una debajo de otra
  const dosColumnas = width >= 1240;
  const { carga, enviar } = useVelt();
  const [texto, setTexto] = useState('');
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [enviadas, setEnviadas] = useState<number | null>(null);

  const convertir = (t = texto) => {
    setAnalisis(analizarIdea(t, carga));
    setRespuestas({});
    setDescartadas([]);
    setEnviadas(null);
  };

  // Tareas con las respuestas del director ya aplicadas
  const finales = useMemo(() => {
    if (!analisis) return [];
    const resp = (tipo: string, tareaId?: string) => {
      const p = analisis.preguntas.find((q) => q.tipo === tipo && (!tareaId || q.tareaId === tareaId));
      return p ? respuestas[p.id] ?? null : null;
    };
    return analisis.tareas
      .filter((t) => !descartadas.includes(t.id))
      .map((t) => ({
        ...t,
        responsableId: t.responsableId ?? resp('responsable', t.id),
        dia: t.dia ?? resp('dia'),
        hora: t.hora ?? resp('hora'),
      }));
  }, [analisis, respuestas, descartadas]);

  const pendientes = analisis
    ? analisis.preguntas.filter((p) => !respuestas[p.id] && !(p.tareaId && descartadas.includes(p.tareaId)))
    : [];
  const personas = [...new Set(finales.map((t) => t.responsableId).filter(Boolean))] as string[];
  const nombres = personas.map((id) => persona(id)!.nombre);
  const listo = finales.length > 0 && pendientes.length === 0;

  const enviarTareas = () => {
    enviar(
      finales.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        responsableId: t.responsableId!,
        dia: t.dia,
        hora: t.hora,
        nota: t.nota,
        porque: analisis?.porque ?? '',
      })),
    );
    setEnviadas(finales.length);
    setAnalisis(null);
    setTexto('');
  };

  const ahora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const primera = finales.find((t) => t.responsableId);

  return (
    <View>
      <Mono style={{ marginBottom: 12 }}>// Idea · Hoy {ahora}</Mono>
      <Titular tam={ancho ? 64 : 38} style={{ marginBottom: 28 }}>
        De tu idea{'\n'}a tareas claras.
      </Titular>

      {enviadas !== null && (
        <Panel bg={color.lima} style={{ marginBottom: 24 }}>
          <Mono style={{ color: color.tinta }}>// Enviado</Mono>
          <Text style={s.okTexto}>
            {enviadas} {enviadas === 1 ? 'tarea enviada' : 'tareas enviadas'}. Cada persona solo recibe lo suyo.
          </Text>
          <Boton variante="tinta" fondo={color.lima} onPress={() => router.navigate('/seguimiento')} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
            Ver seguimiento →
          </Boton>
        </Panel>
      )}

      <View style={[s.columnas, !dosColumnas && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={dosColumnas ? { width: 420 } : undefined}>
          <Panel>
            <Mono style={{ color: color.lima, marginBottom: 12 }}>// Escribe lo que necesitas</Mono>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              multiline
              placeholder={'Ej.: «El jueves hay claustro. Necesito que Inés prepare el orden del día y que alguien imprima las actas.»'}
              placeholderTextColor="#6E7385"
              style={s.entrada}
              accessibilityLabel="Tu idea"
            />
          </Panel>
          <View style={s.botones}>
            <Boton onPress={() => convertir()} disabled={texto.trim().length < 8} style={{ flex: 1 }}>
              Convertir en tareas →
            </Boton>
            <Boton
              variante="gris"
              onPress={() => {
                setTexto(EJEMPLO);
                convertir(EJEMPLO);
              }}
            >
              Ejemplo
            </Boton>
          </View>
          <Mono style={{ marginTop: 14, lineHeight: 18 }}>
            En el móvil puedes dictarla con el micrófono del teclado. VELT solo te preguntará lo que falte.
          </Mono>
        </View>

        <View style={dosColumnas ? { flex: 1, minWidth: 0 } : undefined}>
          {!analisis && enviadas === null && <Vacio />}
          {analisis && (
            <>
              <View style={s.resumen}>
                <Dato n={String(finales.length)} l="Tareas" />
                <Dato n={String(personas.length)} l="Personas" />
                <Dato n={diaLimite(finales) ?? '—'} l="Fecha límite" azul />
                <Dato n={String(pendientes.length)} l="Preguntas" />
              </View>

              <Mono style={{ marginBottom: 14, lineHeight: 18 }}>
                {`VELT ha detectado ${analisis.tareas.length} ${analisis.tareas.length === 1 ? 'acción' : 'acciones'}`}
                {analisis.excluidos.length ? `, ${analisis.excluidos.length} restricción` : ''}
                {` y ${analisis.preguntas.length} ${analisis.preguntas.length === 1 ? 'dato que falta' : 'datos que faltan'}.`}
                {analisis.excluidos.length
                  ? ` No se asigna nada a ${analisis.excluidos.map((id) => persona(id)!.nombre).join(' ni a ')}.`
                  : ''}
              </Mono>

              {finales.length === 0 ? (
                <Panel bg={color.blanco} style={s.tarjeta}>
                  <Text style={s.tareaTitulo}>No he encontrado tareas en la idea.</Text>
                  <Text style={s.tareaSub}>
                    Prueba a decir quién y qué: «Necesito que Raúl revise las notas y que Carmen abra el gimnasio».
                  </Text>
                </Panel>
              ) : (
                <View style={s.tarjeta}>
                  {finales.map((t, i) => {
                    const p = t.responsableId ? persona(t.responsableId) : undefined;
                    return (
                      <View key={t.id} style={[s.tarea, i === 0 && { borderTopWidth: 0 }]}>
                        <Avatar id={t.responsableId} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.tareaTitulo}>{t.titulo}</Text>
                          <Text style={s.tareaSub}>
                            {p ? `${nombreCompleto(p)} · ${p.rol}` : 'Falta responsable'}
                            {t.nota ? ` · ${t.nota}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 8 }}>
                          <Etiqueta dia={t.dia} hora={t.hora} acento={!t.responsableId} />
                          <Pressable onPress={() => setDescartadas((d) => [...d, t.id])} accessibilityLabel={`Quitar ${t.titulo}`}>
                            <Text style={s.quitar}>Quitar</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {pendientes.map((p) => (
                <Panel key={p.id} bg={color.lima} corte={14} style={{ marginTop: 16 }}>
                  <Mono style={{ color: color.tinta }}>// VELT necesita saber una cosa</Mono>
                  <Text style={s.pregunta}>{p.texto}</Text>
                  <View style={s.chips}>
                    {p.opciones.map((o) => (
                      <Chip key={o.valor} etiqueta={o.etiqueta} detalle={o.detalle} onPress={() => setRespuestas((r) => ({ ...r, [p.id]: o.valor }))} />
                    ))}
                  </View>
                </Panel>
              ))}

              {finales.length > 0 && (
                <View style={s.enviar}>
                  <Mono style={{ flexShrink: 1 }}>
                    {pendientes.length ? 'Responde arriba para poder enviar' : `Se enviará a ${unir(nombres)}`}
                  </Mono>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Boton variante="gris" onPress={() => setAnalisis(null)}>
                      Editar
                    </Boton>
                    <Boton onPress={enviarTareas} disabled={!listo}>
                      {`Enviar a ${personas.length} ${personas.length === 1 ? 'persona' : 'personas'} →`}
                    </Boton>
                  </View>
                </View>
              )}

              {primera && listo && (
                <View style={[s.vista, !ancho && { flexDirection: 'column' }]}>
                  <View style={{ flex: 1 }}>
                    <Titular tam={22} style={{ marginBottom: 10 }}>
                      Así lo recibe {persona(primera.responsableId!)!.nombre}
                    </Titular>
                    <Text style={s.tareaSub}>
                      Cada persona recibe solo lo suyo: qué, para cuándo y por qué. Para el profesorado, VELT es solo recibir y confirmar.
                    </Text>
                  </View>
                  <Panel style={{ width: ancho ? 270 : '100%' }} corte={16}>
                    <Mono style={{ color: color.lima, marginBottom: 10 }}>// Nueva tarea · de {DIRECTOR.nombre}</Mono>
                    <Titular tam={22} style={{ color: color.crema, marginBottom: 12 }}>
                      {primera.titulo}
                    </Titular>
                    <Etiqueta dia={primera.dia} hora={primera.hora} acento />
                    {analisis.porque ? <Text style={s.porque}>Por qué: {analisis.porque}</Text> : null}
                  </Panel>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Vacio() {
  return (
    <View style={s.vacio}>
      <Mono style={{ marginBottom: 10 }}>// Cómo funciona</Mono>
      {[
        'Escribe la idea como se la dirías a tu equipo.',
        'VELT la separa en tareas con responsable y fecha.',
        'Si falta algo, te lo pregunta. Solo eso.',
        'Cada persona recibe lo suyo y lo confirma.',
      ].map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.borde }}>
          <Text style={s.paso}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={[s.tareaTitulo, { fontFamily: font.ui, flex: 1 }]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Dato({ n, l, azul }: { n: string; l: string; azul?: boolean }) {
  return (
    <View style={s.dato}>
      <Text style={[s.datoN, azul && { color: color.cobalto }]}>{n}</Text>
      <Text style={s.datoL}>{l}</Text>
    </View>
  );
}

const ORDEN = ['Hoy', 'Mañana', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const diaLimite = (ts: { dia: string | null }[]) =>
  ts.map((t) => t.dia).filter(Boolean).sort((a, b) => ORDEN.indexOf(b!) - ORDEN.indexOf(a!))[0] ?? null;

const unir = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

const s = StyleSheet.create({
  columnas: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  entrada: { minHeight: 170, color: color.crema, fontFamily: font.ui, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  botones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resumen: { flexDirection: 'row', borderTopWidth: 3, borderTopColor: color.tinta, borderBottomWidth: 1, borderBottomColor: color.borde, marginBottom: 14 },
  dato: { flex: 1, paddingVertical: 14, paddingRight: 8 },
  datoN: { fontFamily: font.display, fontSize: 30, letterSpacing: -0.8, color: color.tinta, textTransform: 'uppercase' },
  datoL: { fontFamily: font.ui, fontSize: 12, color: color.gris, marginTop: 4 },
  tarjeta: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, paddingHorizontal: 18, paddingVertical: 4 },
  tarea: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: 1, borderTopColor: color.borde },
  tareaTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  tareaSub: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris, marginTop: 3 },
  quitar: { fontFamily: font.mono, fontSize: 11, color: color.gris, textDecorationLine: 'underline' },
  pregunta: { fontFamily: font.display, fontSize: 19, lineHeight: 22, color: color.tinta, textTransform: 'uppercase', marginTop: 8, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enviar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 18 },
  vista: { flexDirection: 'row', gap: 24, alignItems: 'center', marginTop: 32 },
  porque: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.grisClaro, marginTop: 12 },
  okTexto: { fontFamily: font.uiMedium, fontSize: 16, color: color.tinta, marginTop: 6 },
  vacio: { borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 14 },
  paso: { fontFamily: font.monoBold, fontSize: 13, color: color.cobalto, marginTop: 1 },
});
