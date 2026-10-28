// Pantalla principal de dirección: escribir una idea y convertirla en tareas.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, Chip, Contador, cortado, Etiqueta, Mono, Panel, Titular } from '../components/ui';
import { DIRECTOR, nombreCompleto, persona } from '../data/equipo';
import { entra, entraLado, recoloca, sale, vibra } from '../lib/motion';
import { aFecha, etiquetaDia } from '../lib/fechas';
import { analizarIdea, Analisis } from '../lib/parser';
import { useVelt } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

// Ideas de ejemplo para enseñar VELT a un centro en un clic
const EJEMPLOS = [
  {
    titulo: 'Claustro del jueves',
    texto:
      'El jueves hay claustro a las 17:00. Necesito que Inés prepare el orden del día, que Carmen abra el salón de actos y que alguien imprima las actas. Raúl ya va justo, mejor que no.',
  },
  {
    titulo: 'Falta un profesor',
    texto: 'Mañana falta Andrés. Hay que cubrir su guardia de 3.ª hora con 2.º ESO B y que Lucía me pase el examen de recuperación.',
  },
  {
    titulo: 'Excursión de 4.º ESO',
    texto:
      'El viernes salimos de excursión con 4.º ESO al Parque de las Ciencias. Necesito que Marta recoja las autorizaciones antes del miércoles, que Luis imprima las listas y que Carmen reserve el autobús para las 8:30.',
  },
];

const PASOS = ['Separando acciones', 'Buscando responsables', 'Comprobando la carga del equipo', 'Detectando lo que falta'];

type Fase = 'escribir' | 'pensando' | 'resultado' | 'enviado';
type Enviado = { tareas: number; personas: { id: string; n: number }[] };

export default function NuevaIdea() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const dosColumnas = width >= 1240;
  const { carga, enviar } = useVelt();
  const [texto, setTexto] = useState('');
  const [fase, setFase] = useState<Fase>('escribir');
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [enviado, setEnviado] = useState<Enviado | null>(null);

  const convertir = (t = texto) => {
    setAnalisis(analizarIdea(t, carga));
    setRespuestas({});
    setDescartadas([]);
    setFase('pensando');
  };

  // Pequeña pausa para que se vea el análisis: da confianza y explica qué hace VELT
  useEffect(() => {
    if (fase !== 'pensando') return;
    const t = setTimeout(() => setFase('resultado'), 1500);
    return () => clearTimeout(t);
  }, [fase]);

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
    vibra('exito');
    setEnviado({ tareas: finales.length, personas: personas.map((id) => ({ id, n: finales.filter((t) => t.responsableId === id).length })) });
    setFase('enviado');
    setAnalisis(null);
    setTexto('');
  };

  const reiniciar = () => {
    setFase('escribir');
    setEnviado(null);
    setAnalisis(null);
  };

  const ahora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const primera = finales.find((t) => t.responsableId);
  const leyendo = fase === 'pensando' || fase === 'resultado';

  if (fase === 'enviado' && enviado) return <PantallaEnviado enviado={enviado} ancho={ancho} onNueva={reiniciar} />;

  return (
    <View>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 12 }}>{'// '}Idea · Hoy {ahora}</Mono>
      </Animated.View>
      <View style={{ marginBottom: 30 }}>
        <TitularRevela texto={'De tu idea\na tareas claras.'} tam={ancho ? 68 : 38} />
      </View>

      <View style={[s.columnas, !dosColumnas && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Animated.View entering={entra(2)} style={dosColumnas ? { width: 430 } : undefined}>
          <Panel sombra={ancho ? 10 : 6}>
            <View style={s.cabeceraIdea}>
              <Mono style={{ color: color.lima }}>{leyendo ? '// Tu idea' : '// Escribe lo que necesitas'}</Mono>
              {leyendo && (
                <Pressable onPress={() => setFase('escribir')} accessibilityRole="button">
                  <Text style={s.editar}>Editar</Text>
                </Pressable>
              )}
            </View>
            {leyendo && analisis ? (
              <View>
                <Resaltado texto={texto} analisis={analisis} />
                {fase === 'pensando' && <Escaner />}
              </View>
            ) : (
              <TextInput
                value={texto}
                onChangeText={setTexto}
                multiline
                placeholder={'Escríbela como se la dirías a tu equipo.\n\nEj.: «El jueves hay claustro. Necesito que Inés prepare el orden del día y que alguien imprima las actas.»'}
                placeholderTextColor="#6E7385"
                style={s.entrada}
                accessibilityLabel="Tu idea"
              />
            )}
          </Panel>
          {!leyendo && (
            <Animated.View entering={entra(3)} style={s.botones}>
              <Boton onPress={() => convertir()} disabled={texto.trim().length < 8} style={{ flex: 1 }}>
                Convertir en tareas →
              </Boton>
            </Animated.View>
          )}
          {leyendo && analisis && fase === 'resultado' && <Leyenda analisis={analisis} />}
          {!leyendo && (
            <Mono style={{ marginTop: 14, lineHeight: 18 }}>En el móvil puedes dictarla con el micrófono del teclado.</Mono>
          )}
        </Animated.View>

        <View style={dosColumnas ? { flex: 1, minWidth: 0 } : { marginTop: 8 }}>
          {fase === 'escribir' && (
            <Ejemplos
              onElegir={(t) => {
                setTexto(t);
                convertir(t);
              }}
            />
          )}

          {fase === 'pensando' && <Pensando />}

          {fase === 'resultado' && analisis && (
            <>
              <Animated.View entering={entra(0)} style={s.resumen}>
                <Dato n={finales.length} l="Tareas" />
                <Dato n={personas.length} l="Personas" />
                <View style={s.dato}>
                  <Text style={[s.datoN, { color: color.cobalto }]}>{diaLimite(finales) ?? '—'}</Text>
                  <Text style={s.datoL}>Fecha límite</Text>
                </View>
                <Dato n={pendientes.length} l="Por resolver" alerta={pendientes.length > 0} />
              </Animated.View>

              {finales.length === 0 ? (
                <Panel bg={color.blanco} style={s.tarjeta}>
                  <Text style={s.tareaTitulo}>No he encontrado tareas en la idea.</Text>
                  <Text style={s.tareaSub}>
                    Prueba a decir quién y qué: «Necesito que Raúl revise las notas y que Carmen abra el gimnasio».
                  </Text>
                </Panel>
              ) : (
                <View style={s.tarjeta}>
                  {finales.map((t, i) => (
                    <FilaTarea key={t.id} t={t} i={i} onQuitar={() => setDescartadas((d) => [...d, t.id])} />
                  ))}
                </View>
              )}

              {pendientes.map((p, i) => (
                <Animated.View key={p.id} entering={entra(i, finales.length * 70 + 150)} exiting={FadeOutUp.duration(220)} layout={recoloca}>
                  <Panel bg={color.lima} corte={14} style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Mono style={{ color: color.tinta }}>{'// '}VELT necesita saber una cosa</Mono>
                      <Mono style={{ color: color.tinta }}>
                        {i + 1}/{pendientes.length}
                      </Mono>
                    </View>
                    <Text style={s.pregunta}>{p.texto}</Text>
                    <View style={s.chips}>
                      {p.opciones.map((o) => (
                        <Chip
                          key={o.valor}
                          etiqueta={o.etiqueta}
                          detalle={o.detalle}
                          destacado={o.detalle === 'Por su puesto'}
                          onPress={() => {
                            vibra();
                            setRespuestas((r) => ({ ...r, [p.id]: o.valor }));
                          }}
                        />
                      ))}
                    </View>
                  </Panel>
                </Animated.View>
              ))}

              {finales.length > 0 && (
                <Animated.View layout={recoloca} style={s.enviar}>
                  <View style={{ flexShrink: 1, gap: 6 }}>
                    <Mono>{pendientes.length ? 'Responde arriba para poder enviar' : 'Se enviará a'}</Mono>
                    {!pendientes.length && (
                      <View style={{ flexDirection: 'row' }}>
                        {personas.map((id, i) => (
                          <Animated.View key={id} entering={entraLado(i)} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: color.crema, borderRadius: 20 }}>
                            <Avatar id={id} tam={32} />
                          </Animated.View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Boton variante="gris" onPress={() => setFase('escribir')}>
                      Editar
                    </Boton>
                    <Boton onPress={enviarTareas} disabled={!listo}>
                      {`Enviar a ${personas.length} ${personas.length === 1 ? 'persona' : 'personas'} →`}
                    </Boton>
                  </View>
                </Animated.View>
              )}

              {primera && listo && (
                <Animated.View entering={entra(0, 120)} style={[s.vista, !ancho && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flex: ancho ? 1 : undefined }}>
                    <Titular tam={22} style={{ marginBottom: 10 }}>
                      Así lo recibe {persona(primera.responsableId!)!.nombre}
                    </Titular>
                    <Text style={s.tareaSub}>
                      Cada persona recibe solo lo suyo: qué, para cuándo y por qué. Para el profesorado, VELT es solo recibir y confirmar.
                    </Text>
                  </View>
                  <Panel style={{ width: ancho ? 280 : '100%' }} corte={16} sombra={8} tonoSombra={color.lima}>
                    <Mono style={{ color: color.lima, marginBottom: 10 }}>{'// '}Nueva tarea · de {DIRECTOR.nombre}</Mono>
                    <Titular tam={22} style={{ color: color.crema, marginBottom: 12 }}>
                      {primera.titulo}
                    </Titular>
                    <Etiqueta dia={etiquetaRelativa(primera.dia)} hora={primera.hora} acento fondo={color.tinta} />
                    {analisis.porque ? <Text style={s.porque}>Por qué: {analisis.porque}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                      <View style={[s.falsoBoton, { backgroundColor: color.cobalto }]}>
                        <Text style={[s.falsoTexto, { color: color.blanco }]}>Confirmar</Text>
                      </View>
                      <View style={s.falsoBoton}>
                        <Text style={s.falsoTexto}>Tengo una duda</Text>
                      </View>
                    </View>
                  </Panel>
                </Animated.View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// La idea con lo detectado marcado: azul si ya tiene responsable, lima si
// falta algo y tachado en rojo lo que VELT no enviará al equipo.
function Resaltado({ texto, analisis }: { texto: string; analisis: Analisis }) {
  const marcas: { ini: number; fin: number; tipo: 'ok' | 'falta' | 'aviso' }[] = [];
  for (const t of analisis.tareas) {
    const ini = texto.indexOf(t.fuente);
    if (ini >= 0) marcas.push({ ini, fin: ini + t.fuente.length, tipo: t.responsableId ? 'ok' : 'falta' });
  }
  for (const a of analisis.avisos) {
    const ini = texto.indexOf(a);
    if (ini >= 0) marcas.push({ ini, fin: ini + a.length, tipo: 'aviso' });
  }
  marcas.sort((a, b) => a.ini - b.ini);
  const trozos: { t: string; tipo?: 'ok' | 'falta' | 'aviso' }[] = [];
  let pos = 0;
  for (const m of marcas) {
    if (m.ini < pos) continue;
    if (m.ini > pos) trozos.push({ t: texto.slice(pos, m.ini) });
    trozos.push({ t: texto.slice(m.ini, m.fin), tipo: m.tipo });
    pos = m.fin;
  }
  if (pos < texto.length) trozos.push({ t: texto.slice(pos) });

  return (
    <Text style={s.idea}>
      «
      {trozos.map((k, i) => (
        <Text key={i} style={k.tipo === 'ok' ? s.marcaOk : k.tipo === 'falta' ? s.marcaFalta : k.tipo === 'aviso' ? s.marcaAviso : undefined}>
          {k.t}
        </Text>
      ))}
      »
    </Text>
  );
}

function Leyenda({ analisis }: { analisis: Analisis }) {
  const items = [
    { c: color.cobalto, t: 'Tarea con responsable' },
    { c: color.lima, t: 'Falta un dato' },
    ...(analisis.avisos.length ? [{ c: color.rojo, t: 'Solo para ti, no se envía' }] : []),
  ];
  return (
    <Animated.View entering={entra(0, 200)} style={{ marginTop: 16, gap: 8 }}>
      {items.map((x) => (
        <View key={x.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 12, height: 12, backgroundColor: x.c }} />
          <Mono>{x.t}</Mono>
        </View>
      ))}
    </Animated.View>
  );
}

// Línea lima que barre la idea mientras VELT la lee
function Escaner() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
  }, [y]);
  const anim = useAnimatedStyle(() => ({ top: `${y.value * 100}%` as `${number}%` }));
  return <Animated.View pointerEvents="none" style={[s.escaner, anim]} />;
}

function Pensando() {
  return (
    <View style={{ borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 16 }}>
      <Mono style={{ marginBottom: 12 }}>{'// '}VELT está leyendo tu idea</Mono>
      {PASOS.map((p, i) => (
        <Animated.View key={p} entering={entraLado(i, 0)} style={s.paso}>
          <Cuadro retraso={i * 300} />
          <Text style={s.pasoTexto}>{p}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// Cuadro que parpadea y luego se queda fijo, como un «hecho»
function Cuadro({ retraso }: { retraso: number }) {
  const [hecho, setHecho] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHecho(true), retraso + 320);
    return () => clearTimeout(t);
  }, [retraso]);
  return hecho ? (
    <Animated.View entering={ZoomIn.duration(200)} style={[s.cuadro, { backgroundColor: color.cobalto }]}>
      <Text style={{ color: color.blanco, fontSize: 10, fontFamily: font.monoBold }}>✓</Text>
    </Animated.View>
  ) : (
    <View style={[s.cuadro, { borderWidth: 2, borderColor: color.tinta }]} />
  );
}

function Ejemplos({ onElegir }: { onElegir: (t: string) => void }) {
  return (
    <View>
      <Animated.View entering={entra(3)} style={{ borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 14, marginBottom: 6 }}>
        <Mono>{'// '}Cómo funciona</Mono>
      </Animated.View>
      {['Escribe la idea como se la dirías a tu equipo.', 'VELT la separa en tareas con responsable y fecha.', 'Si falta algo, te lo pregunta. Solo eso.', 'Cada persona recibe lo suyo y lo confirma.'].map(
        (t, i) => (
          <Animated.View key={t} entering={entra(i, 260)} style={[s.como, i > 0 && { borderTopWidth: 1, borderTopColor: color.borde }]}>
            <Text style={s.comoNum}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={s.comoTexto}>{t}</Text>
          </Animated.View>
        ),
      )}
      <Animated.View entering={entra(5, 260)} style={{ marginTop: 28 }}>
        <Mono style={{ marginBottom: 12 }}>{'// '}Prueba con un ejemplo</Mono>
        <View style={{ gap: 10 }}>
          {EJEMPLOS.map((e) => (
            <TarjetaEjemplo key={e.titulo} titulo={e.titulo} texto={e.texto} onPress={() => onElegir(e.texto)} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function TarjetaEjemplo({ titulo, texto, onPress }: { titulo: string; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => (
        <View style={[s.ejemplo, (hovered || pressed) && s.ejemploOn, cortado(12)]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.ejemploTitulo, (hovered || pressed) && { color: color.blanco }]}>{titulo}</Text>
            <Text numberOfLines={2} style={[s.ejemploTexto, (hovered || pressed) && { color: color.azulSuave }]}>
              {texto}
            </Text>
          </View>
          <Text style={[s.flecha, (hovered || pressed) && { color: color.lima, transform: [{ translateX: 4 }] }]}>→</Text>
        </View>
      )}
    </Pressable>
  );
}

type Final = { id: string; titulo: string; responsableId: string | null; dia: string | null; hora: string | null; nota?: string };

function FilaTarea({ t, i, onQuitar }: { t: Final; i: number; onQuitar: () => void }) {
  const p = t.responsableId ? persona(t.responsableId) : undefined;
  // Destello lima cuando se resuelve el responsable
  const flash = useSharedValue(0);
  useEffect(() => {
    if (t.responsableId) flash.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 700 }));
  }, [t.responsableId, flash]);
  const anim = useAnimatedStyle(() => ({ backgroundColor: `rgba(198,242,78,${flash.value * 0.55})` }));

  return (
    <Animated.View entering={entra(i, 80)} exiting={sale} layout={recoloca} style={[s.tarea, i === 0 && { borderTopWidth: 0 }, anim]}>
      <Avatar id={t.responsableId} />
      <View style={{ flex: 1 }}>
        <Text style={s.tareaTitulo}>{t.titulo}</Text>
        <Text style={s.tareaSub}>
          {p ? `${nombreCompleto(p)} · ${p.rol}` : 'Falta responsable'}
          {t.nota ? ` · ${t.nota}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Etiqueta dia={etiquetaRelativa(t.dia)} hora={t.hora} acento={!t.responsableId || !t.dia} />
        <Pressable onPress={onQuitar} accessibilityLabel={`Quitar ${t.titulo}`}>
          {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.quitar, hovered && { color: color.rojo }]}>Quitar</Text>}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function PantallaEnviado({ enviado, ancho, onNueva }: { enviado: Enviado; ancho: boolean; onNueva: () => void }) {
  return (
    <View style={{ maxWidth: 760 }}>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 12 }}>{'// '}Enviado · hoy {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Mono>
      </Animated.View>
      <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)}>
        <TitularRevela texto="Enviado." tam={ancho ? 96 : 56} style={{ color: color.cobalto }} />
      </Animated.View>
      <Animated.View entering={entra(1, 200)}>
        <Text style={s.enviadoTexto}>
          {enviado.tareas} {enviado.tareas === 1 ? 'tarea' : 'tareas'} repartidas. Cada persona ya tiene lo suyo y te avisará al confirmar.
        </Text>
      </Animated.View>

      <View style={{ marginTop: 28, borderTopWidth: 3, borderTopColor: color.tinta }}>
        {enviado.personas.map((x, i) => {
          const p = persona(x.id)!;
          return (
            <Animated.View key={x.id} entering={entraLado(i, 350)} style={s.destinatario}>
              <Avatar id={x.id} tam={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.tareaTitulo}>{nombreCompleto(p)}</Text>
                <Text style={s.tareaSub}>
                  {p.rol} · {x.n} {x.n === 1 ? 'tarea' : 'tareas'}
                </Text>
              </View>
              <Animated.View entering={ZoomIn.delay(650 + i * 140).duration(260)} style={[s.notificado, cortado(6)]}>
                <Text style={s.notificadoTexto}>Notificado</Text>
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={entra(0, 700)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
        <Boton onPress={() => router.navigate('/seguimiento')}>Ver seguimiento →</Boton>
        <Boton variante="gris" onPress={onNueva}>
          Nueva idea
        </Boton>
      </Animated.View>
    </View>
  );
}

function Dato({ n, l, alerta }: { n: number; l: string; alerta?: boolean }) {
  return (
    <View style={s.dato}>
      <Contador valor={n} style={[s.datoN, alerta && { color: color.tinta, backgroundColor: color.lima, alignSelf: 'flex-start', paddingHorizontal: 6 }]} />
      <Text style={s.datoL}>{l}</Text>
    </View>
  );
}

// «Jue» → «Jue 30»: así se ve qué jueves es antes de enviar
const etiquetaRelativa = (dia: string | null) => {
  const f = aFecha(dia);
  return f ? etiquetaDia(f) : dia;
};
// La fecha más lejana de todas las tareas
const diaLimite = (ts: { dia: string | null }[]) => {
  const ultima = ts.map((t) => aFecha(t.dia)).filter((f): f is string => !!f).sort().pop();
  return ultima ? etiquetaDia(ultima) : null;
};

const s = StyleSheet.create({
  columnas: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },
  cabeceraIdea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  editar: { fontFamily: font.monoBold, fontSize: 11, color: color.lima, textDecorationLine: 'underline', textTransform: 'uppercase', letterSpacing: 1 },
  entrada: { minHeight: 190, color: color.crema, fontFamily: font.ui, fontSize: 16, lineHeight: 25, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  idea: { color: '#E7E4DC', fontFamily: font.ui, fontSize: 16, lineHeight: 28 },
  marcaOk: { backgroundColor: color.cobalto, color: color.blanco },
  marcaFalta: { backgroundColor: color.lima, color: color.tinta },
  marcaAviso: { color: '#FF8A8A', textDecorationLine: 'line-through', textDecorationColor: color.rojo },
  escaner: { position: 'absolute', left: -20, right: -20, height: 2, backgroundColor: color.lima, boxShadow: `0 0 18px 4px rgba(198,242,78,0.55)` },
  botones: { flexDirection: 'row', gap: 10, marginTop: 18 },
  resumen: { flexDirection: 'row', borderTopWidth: 3, borderTopColor: color.tinta, borderBottomWidth: 1, borderBottomColor: color.borde, marginBottom: 16 },
  dato: { flex: 1, paddingVertical: 14, paddingRight: 8 },
  datoN: { fontFamily: font.display, fontSize: 34, letterSpacing: -0.8, color: color.tinta, textTransform: 'uppercase' },
  datoL: { fontFamily: font.ui, fontSize: 12, color: color.gris, marginTop: 4 },
  tarjeta: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, paddingHorizontal: 18, paddingVertical: 4 },
  tarea: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 15, paddingHorizontal: 6, marginHorizontal: -6, borderTopWidth: 1, borderTopColor: color.borde },
  tareaTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  tareaSub: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris, marginTop: 3 },
  quitar: { fontFamily: font.mono, fontSize: 11, color: color.gris, textDecorationLine: 'underline' },
  pregunta: { fontFamily: font.display, fontSize: 20, lineHeight: 23, color: color.tinta, textTransform: 'uppercase', marginTop: 8, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enviar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 20 },
  vista: { flexDirection: 'row', gap: 28, alignItems: 'center', marginTop: 36 },
  porque: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.grisClaro, marginTop: 12 },
  falsoBoton: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: color.crema },
  falsoTexto: { fontFamily: font.monoBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: color.tinta },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.borde },
  pasoTexto: { fontFamily: font.uiMedium, fontSize: 15, color: color.tinta },
  cuadro: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  como: { flexDirection: 'row', gap: 14, paddingVertical: 11 },
  comoNum: { fontFamily: font.monoBold, fontSize: 13, color: color.cobalto, marginTop: 2 },
  comoTexto: { fontFamily: font.ui, fontSize: 15, color: color.tinta, flex: 1 },
  ejemplo: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  ejemploOn: { backgroundColor: color.cobalto, borderColor: color.cobalto },
  ejemploTitulo: { fontFamily: font.displayBold, fontSize: 15, color: color.tinta, textTransform: 'uppercase', letterSpacing: -0.2, marginBottom: 4 },
  ejemploTexto: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris },
  flecha: { fontFamily: font.monoBold, fontSize: 20, color: color.cobalto },
  enviadoTexto: { fontFamily: font.ui, fontSize: 18, lineHeight: 27, color: color.tinta, marginTop: 16, maxWidth: 560 },
  destinatario: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: color.borde },
  notificado: { backgroundColor: color.lima, paddingVertical: 5, paddingHorizontal: 10 },
  notificadoTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.tinta },
});
