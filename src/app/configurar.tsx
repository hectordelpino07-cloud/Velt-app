// Configurar centro: dirección crea las plantas, dice cuántas aulas tiene
// cada una, les pone nombre y rellena los horarios. Pensado para hacerse en
// diez minutos y sin manual: todo se edita en el sitio y se guarda solo.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, cortado, Mono } from '../components/ui';
import { Clase, esClase, esLugar, Espacio, Franja, JORNADAS, TIPOS_ESPACIO, TurnoFranja } from '../data/centro';
import { activos, CENTRO, daClase, DIRECTOR, EQUIPO, Persona, persona, ROLES, TURNOS } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra, sale, vibra } from '../lib/motion';
import { useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

type Pestana = 'espacios' | 'jornada' | 'personal' | 'horarios';

export default function Configurar() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const [pestana, setPestana] = useState<Pestana>('espacios');
  const cfg = useCentro();
  const { reiniciar } = useVelt();
  const toast = useToast();

  return (
    <View style={{ maxWidth: 1000 }}>
      <TitularRevela texto="Configura tu centro." tam={ancho ? 48 : 30} />
      <Mono style={{ marginTop: 10, fontSize: 14 }}>{CENTRO} · los cambios se guardan solos</Mono>
      <Animated.View entering={entra(2, 120)}>
        <Text style={s.intro}>
          Cuatro pasos, en este orden: las plantas y sus aulas, la jornada (horas de mañana, de tarde o ambas), el personal y qué hace cada profesor en cada hora.
          Con eso VELT ya sabe qué aula está libre y dónde está cada uno.
        </Text>
      </Animated.View>

      <View style={s.pestanas}>
        {(
          [
            ['espacios', '01 · Plantas y aulas'],
            ['jornada', '02 · Jornada'],
            ['personal', '03 · Personal'],
            ['horarios', '04 · Horarios'],
          ] as const
        ).map(([id, texto]) => (
          <Pressable key={id} onPress={() => setPestana(id)} accessibilityRole="tab" style={[s.pestana, pestana === id && s.pestanaOn, cortado(8)]}>
            <Text style={[s.pestanaTexto, pestana === id && { color: color.crema }]}>{texto}</Text>
          </Pressable>
        ))}
      </View>

      {pestana === 'espacios' && <Espacios />}
      {pestana === 'jornada' && <Jornada />}
      {pestana === 'personal' && <PersonalLista />}
      {pestana === 'horarios' && <Horarios ancho={ancho} />}

      <View style={s.reinicio}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={s.reinicioTitulo}>Antes de una demo</Text>
          <Text style={s.reinicioTexto}>Vuelve a dejar el centro, el material y las tareas como al principio, con los datos de ejemplo.</Text>
        </View>
        <Boton
          variante="linea"
          pequeno
          onPress={() => {
            cfg.reiniciarCentro();
            reiniciar();
            vibra('exito');
            toast('Demo reiniciada: centro, material y tareas como al principio.');
          }}
        >
          Reiniciar la demo
        </Boton>
      </View>
    </View>
  );
}

// Campo de texto que guarda al salir de él (o al pulsar Intro), no en cada letra:
// así escribir no recalcula ni guarda todo el centro a cada pulsación.
function Campo({ valor, alGuardar, ...resto }: Omit<TextInputProps, 'value' | 'onChangeText'> & { valor: string; alGuardar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor);
  const [antes, setAntes] = useState(valor);
  if (antes !== valor) {
    setAntes(valor);
    setTexto(valor);
  }
  const guardar = () => {
    if (texto !== valor) alGuardar(texto);
  };
  return <TextInput {...resto} value={texto} onChangeText={setTexto} onBlur={guardar} onSubmitEditing={guardar} />;
}

// ——— Paso 1: plantas y aulas ———

function Espacios() {
  const cfg = useCentro();
  return (
    <View style={{ gap: 18 }}>
      {cfg.plantas.map((pl, i) => {
        const suyos = cfg.espacios.filter((e) => e.planta === pl.id);
        const aulas = suyos.filter((e) => e.tipo === 'aula').length;
        return (
          <Animated.View key={pl.id} exiting={sale} style={[s.planta, cortado(18)]}>
            <View style={s.plantaCabecera}>
              <Campo
                valor={pl.nombre}
                alGuardar={(t) => cfg.renombrarPlanta(pl.id, t)}
                style={s.plantaNombre}
                accessibilityLabel="Nombre de la planta"
              />
              <View style={s.contador}>
                <Text style={s.contadorEtiqueta}>Aulas de grupo</Text>
                <Pressable onPress={() => cfg.numeroAulas(pl.id, Math.max(0, aulas - 1))} accessibilityLabel="Quitar un aula" style={s.contadorBoton}>
                  <Text style={s.contadorSigno}>−</Text>
                </Pressable>
                <Text style={s.contadorN}>{aulas}</Text>
                <Pressable onPress={() => cfg.numeroAulas(pl.id, aulas + 1)} accessibilityLabel="Añadir un aula" style={s.contadorBoton}>
                  <Text style={s.contadorSigno}>+</Text>
                </Pressable>
              </View>
            </View>

            {suyos.length === 0 && <Text style={s.vacio}>Sin espacios todavía. Sube el número de aulas o añade un espacio abajo.</Text>}
            {suyos.map((e) => (
              <FilaEspacio key={e.id} e={e} />
            ))}

            <View style={s.anadir}>
              <Mono>+ Añadir</Mono>
              {TIPOS_ESPACIO.map((t) => (
                <Pressable key={t.id} onPress={() => cfg.addEspacio(pl.id, t.id)} accessibilityRole="button" style={s.anadirBoton}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <Text style={[s.anadirTexto, hovered && { color: color.cobalto }]}>{t.nombre}</Text>
                  )}
                </Pressable>
              ))}
              {cfg.plantas.length > 1 && (
                <Pressable onPress={() => cfg.quitarPlanta(pl.id)} accessibilityRole="button" style={{ marginLeft: 'auto' }}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <Text style={[s.quitarPlanta, hovered && { color: color.rojo }]}>Quitar planta</Text>
                  )}
                </Pressable>
              )}
            </View>
          </Animated.View>
        );
      })}
      <Boton variante="principal" onPress={cfg.addPlanta} style={{ alignSelf: 'flex-start' }}>
        + Añadir planta
      </Boton>
    </View>
  );
}

function FilaEspacio({ e }: { e: Espacio }) {
  const cfg = useCentro();
  return (
    <Animated.View exiting={sale} style={s.espacio}>
      <Campo valor={e.nombre} alGuardar={(t) => cfg.editarEspacio(e.id, { nombre: t })} style={s.espacioNombre} accessibilityLabel="Nombre del espacio" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }} style={{ flexGrow: 0 }}>
        {TIPOS_ESPACIO.map((t) => (
          <Pressable key={t.id} onPress={() => cfg.editarEspacio(e.id, { tipo: t.id })} style={[s.tipo, e.tipo === t.id && s.tipoOn]}>
            <Text style={[s.tipoTexto, e.tipo === t.id && { color: color.crema }]}>{t.nombre}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        onPress={() => cfg.editarEspacio(e.id, { cerrado: e.cerrado ? undefined : 'Cerrada por mantenimiento' })}
        accessibilityRole="button"
        style={[s.tipo, e.cerrado && { backgroundColor: '#E7E3D8', borderColor: color.gris }]}
      >
        <Text style={s.tipoTexto}>{e.cerrado ? 'Reabrir' : 'Cerrar'}</Text>
      </Pressable>
      <Pressable onPress={() => cfg.quitarEspacio(e.id)} accessibilityLabel={`Borrar ${e.nombre}`} style={s.borrar}>
        {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.borrarTexto, hovered && { color: color.rojo }]}>✕</Text>}
      </Pressable>
    </Animated.View>
  );
}

// ——— Paso 2: jornada ———

function Jornada() {
  const cfg = useCentro();
  const toast = useToast();
  const turnos: { id: TurnoFranja; nombre: string }[] = [
    { id: 'manana', nombre: 'Mañana' },
    { id: 'tarde', nombre: 'Tarde' },
  ];
  return (
    <View>
      <Mono style={{ marginBottom: 10 }}>{'// '}Empieza por una plantilla</Mono>
      <View style={s.plantillas}>
        {JORNADAS.map((j) => {
          const igual = j.franjas.length === cfg.franjas.length && j.franjas.every((f, i) => f.inicio === cfg.franjas[i].inicio && f.turno === cfg.franjas[i].turno);
          return (
            <Pressable
              key={j.id}
              onPress={() => {
                cfg.ponerJornada(j.id);
                vibra();
                toast(`Jornada «${j.nombre}». Las clases que ya tenías en esas horas se mantienen.`);
              }}
              accessibilityRole="button"
              style={[s.plantilla, igual && s.plantillaOn, cortado(12)]}
            >
              <Text style={[s.plantillaNombre, igual && { color: color.crema }]}>{j.nombre}</Text>
              <Text style={[s.plantillaDetalle, igual && { color: color.grisClaro }]}>{j.detalle}</Text>
              {igual && <Text style={s.plantillaMarca}>✓ En uso</Text>}
            </Pressable>
          );
        })}
      </View>

      <Text style={s.notaHorario}>Después ajusta cada hora: escribe el inicio y el final, marca el recreo o borra las que sobren.</Text>

      {turnos.map((t) => {
        const suyas = cfg.franjas.filter((f) => f.turno === t.id);
        return (
          <View key={t.id} style={[s.planta, cortado(18), { marginTop: 16 }]}>
            <View style={s.plantaCabecera}>
              <Text style={[s.plantaNombre, { flex: 0 }]}>{t.nombre}</Text>
              <Mono>{suyas.length ? `${suyas[0].inicio} – ${suyas[suyas.length - 1].fin}` : 'Sin horas'}</Mono>
            </View>
            {suyas.map((f) => (
              <FilaFranja key={f.id} f={f} />
            ))}
            <Pressable onPress={() => cfg.addFranja(t.id)} accessibilityRole="button" style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                <Text style={[s.anadirTexto, hovered && { color: color.cobalto }]}>+ Añadir una hora de {t.nombre.toLowerCase()}</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function FilaFranja({ f }: { f: Franja }) {
  const cfg = useCentro();
  // Se escribe libremente y solo se guarda cuando la hora es válida (HH:MM)
  const [inicio, setInicio] = useState(f.inicio);
  const [fin, setFin] = useState(f.fin);
  // Si la hora cambia desde fuera (al elegir otra plantilla), se actualiza aquí
  const [antes, setAntes] = useState({ inicio: f.inicio, fin: f.fin });
  if (antes.inicio !== f.inicio || antes.fin !== f.fin) {
    setAntes({ inicio: f.inicio, fin: f.fin });
    setInicio(f.inicio);
    setFin(f.fin);
  }
  const guardar = (campo: 'inicio' | 'fin', v: string) => {
    const limpio = v.replace(/[^0-9:]/g, '').slice(0, 5);
    (campo === 'inicio' ? setInicio : setFin)(limpio);
    if (HORA.test(limpio)) cfg.editarFranja(f.id, { [campo]: limpio });
  };
  return (
    <Animated.View exiting={sale} style={s.espacio}>
      <TextInput value={inicio} onChangeText={(v) => guardar('inicio', v)} style={[s.hora, !HORA.test(inicio) && s.horaMal]} accessibilityLabel="Hora de inicio" />
      <Text style={s.guion}>–</Text>
      <TextInput
        value={fin}
        onChangeText={(v) => guardar('fin', v)}
        style={[s.hora, (!HORA.test(fin) || fin <= inicio) && s.horaMal]}
        accessibilityLabel="Hora de final"
      />
      <Campo valor={f.nombre} alGuardar={(t) => cfg.editarFranja(f.id, { nombre: t })} style={s.espacioNombre} accessibilityLabel="Nombre de la hora" />
      <Pressable onPress={() => cfg.editarFranja(f.id, { recreo: !f.recreo })} style={[s.tipo, f.recreo && s.tipoOn]}>
        <Text style={[s.tipoTexto, f.recreo && { color: color.crema }]}>Recreo</Text>
      </Pressable>
      <Pressable onPress={() => cfg.quitarFranja(f.id)} accessibilityLabel={`Borrar ${f.nombre}`} style={s.borrar}>
        {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.borrarTexto, hovered && { color: color.rojo }]}>✕</Text>}
      </Pressable>
    </Animated.View>
  );
}

// ——— Paso 3: personal ———

function PersonalLista() {
  const cfg = useCentro();
  const toast = useToast();
  const lista = [...EQUIPO].sort((a, b) => Number(!!a.baja) - Number(!!b.baja));
  return (
    <View>
      <View style={[s.planta, cortado(18)]}>
        <View style={s.plantaCabecera}>
          <Text style={[s.plantaNombre, { flex: 0 }]}>Personal</Text>
          <Mono>{activos().length} en activo</Mono>
        </View>
        {lista.map((p) => (
          <FilaPersona key={p.id} p={p} />
        ))}
        <View style={s.anadir}>
          <Boton
            pequeno
            onPress={() => {
              cfg.addPersona();
              vibra();
              toast('Persona añadida al final de la lista. Escribe su nombre y elige su turno.');
            }}
          >
            + Añadir persona
          </Boton>
        </View>
      </View>
      <Text style={s.notaHorario}>
        Dar de baja no borra a nadie: deja de aparecer en el mapa, los horarios y las propuestas de VELT, pero sus tareas antiguas se conservan. Solo
        datos del personal del centro, nunca de alumnos.
      </Text>
    </View>
  );
}

function FilaPersona({ p }: { p: Persona }) {
  const cfg = useCentro();
  const director = p.id === DIRECTOR.id;
  return (
    <Animated.View style={[s.persona, p.baja && { opacity: 0.45 }]}>
      <View style={s.personaArriba}>
        <Avatar id={p.id} tam={32} />
        <Campo
          valor={p.nombre}
          alGuardar={(t) => cfg.editarPersona(p.id, { nombre: t })}
          placeholder="Nombre"
          placeholderTextColor="#9A9DA8"
          style={[s.campo, { width: 120, fontFamily: font.uiBold }]}
          editable={!p.baja}
        />
        <Campo
          valor={p.apellido}
          alGuardar={(t) => cfg.editarPersona(p.id, { apellido: t })}
          placeholder="Apellido"
          placeholderTextColor="#9A9DA8"
          style={[s.campo, { width: 130 }]}
          editable={!p.baja}
        />
        <Campo
          valor={p.materia ?? ''}
          alGuardar={(t) => cfg.editarPersona(p.id, { materia: t })}
          placeholder={daClase(p) ? 'Asignatura' : 'Puesto'}
          placeholderTextColor="#9A9DA8"
          style={[s.campo, { flex: 1, minWidth: 120 }]}
          editable={!p.baja && daClase(p)}
        />
        {!director && (
          <Pressable onPress={() => cfg.darDeBaja(p.id, !p.baja)} accessibilityRole="button" style={{ paddingHorizontal: 6 }}>
            {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
              <Text style={[s.baja, hovered && { color: p.baja ? color.cobalto : color.rojo }]}>{p.baja ? 'Recuperar' : 'Dar de baja'}</Text>
            )}
          </Pressable>
        )}
      </View>
      {!p.baja && (
        <View style={s.personaAbajo}>
          {director ? (
            <Text style={s.tipoTexto}>Dirección · siempre en el centro</Text>
          ) : (
            <>
              {ROLES.map((r) => (
                <Pressable key={r} onPress={() => cfg.editarPersona(p.id, { rol: r })} style={[s.tipo, p.rol === r && s.tipoOn]}>
                  <Text style={[s.tipoTexto, p.rol === r && { color: color.crema }]}>{r}</Text>
                </Pressable>
              ))}
              <View style={s.separador} />
              {TURNOS.map((t) => (
                <Pressable key={t.id} onPress={() => cfg.editarPersona(p.id, { turno: t.id })} style={[s.tipo, p.turno === t.id && s.turnoOn]}>
                  <Text style={[s.tipoTexto, p.turno === t.id && { color: color.tinta }]}>{t.nombre}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
}

// ——— Paso 4: horarios ———

function Horarios({ ancho }: { ancho: boolean }) {
  const cfg = useCentro();
  const profes = activos().filter(daClase);
  const [elegido, setQuien] = useState(profes[0]?.id ?? '');
  const quien = profes.some((p) => p.id === elegido) ? elegido : profes[0]?.id ?? '';
  const yo = persona(quien);
  const [eligiendo, setEligiendo] = useState<number | null>(null);
  const huecos = cfg.horario[quien] ?? [];
  const lugaresClase = cfg.espacios.filter((e) => e.tipo !== 'oficina');

  // ¿Alguien más da clase en ese espacio a esa hora?
  const choque = (franja: number, espacioId: string) =>
    Object.entries(cfg.horario).find(([p, hs]) => p !== quien && esClase(hs[franja]) && (hs[franja] as Clase).espacio === espacioId)?.[0];

  const ponerClase = (franja: number) => {
    const libre = lugaresClase.find((e) => !choque(franja, e.id)) ?? lugaresClase[0];
    if (!libre) return;
    cfg.ponerHueco(quien, franja, {
      espacio: libre.id,
      grupo: libre.tipo === 'aula' ? libre.nombre : '',
      materia: yo?.materia ?? '',
    });
    setEligiendo(franja);
  };

  return (
    <View>
      {profes.length === 0 && <Text style={s.vacio}>No hay profesorado. Añádelo en «03 · Personal».</Text>}
      <Mono style={{ marginBottom: 10 }}>{'// '}Elige a un profesor</Mono>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
        {profes.map((p) => {
          const id = p.id;
          const on = id === quien;
          return (
            <Pressable
              key={id}
              onPress={() => {
                setQuien(id);
                setEligiendo(null);
              }}
              accessibilityRole="button"
              style={[s.profe, on && s.profeOn, cortado(8)]}
            >
              <Avatar id={id} tam={28} activo={on} />
              <View>
                <Text style={[s.profeNombre, on && { color: color.crema }]}>{p.nombre}</Text>
                <Text style={[s.profeMateria, on && { color: color.grisClaro }]}>
                  {[p.materia, TURNOS.find((t) => t.id === p.turno)?.nombre].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[s.horario, cortado(18)]}>
        {cfg.franjas.map((f) => {
          const h = huecos[f.id] ?? 'libre';
          const tipo = esClase(h) ? 'clase' : esLugar(h) ? 'fijo' : h;
          const fueraTurno = !!yo && yo.turno !== 'ambos' && yo.turno !== f.turno;
          const conflicto = esClase(h) ? choque(f.id, h.espacio) : undefined;
          return (
            <Animated.View key={`${quien}-${f.id}`} style={[s.franja, f.recreo && { backgroundColor: '#FAF8F3' }, tipo === 'fuera' && { opacity: 0.55 }]}>
              <View style={[s.franjaFila, !ancho && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={{ width: 92 }}>
                  <Text style={s.franjaHora}>{f.inicio}</Text>
                  <Text style={s.franjaNombre}>{f.nombre}</Text>
                </View>
                <View style={s.segmentos}>
                  <Segmento on={tipo === 'clase'} texto="Clase" onPress={() => (tipo === 'clase' ? setEligiendo(eligiendo === f.id ? null : f.id) : ponerClase(f.id))} />
                  <Segmento on={tipo === 'guardia'} texto="Guardia" onPress={() => cfg.ponerHueco(quien, f.id, 'guardia')} />
                  <Segmento on={tipo === 'libre'} texto="Libre" onPress={() => cfg.ponerHueco(quien, f.id, 'libre')} />
                  <Segmento on={tipo === 'fuera'} texto="No está" onPress={() => cfg.ponerHueco(quien, f.id, 'fuera')} />
                  {esLugar(h) && <Segmento on texto={h.motivo} onPress={() => {}} />}
                </View>
                {esClase(h) && (
                  <View style={s.claseResumen}>
                    <Pressable onPress={() => setEligiendo(eligiendo === f.id ? null : f.id)} style={[s.aulaElegida, conflicto && { borderColor: color.rojo }]}>
                      <Text style={s.aulaElegidaTexto}>{cfg.nombreEspacio(h.espacio)} ▾</Text>
                    </Pressable>
                    <Campo
                      valor={h.grupo}
                      placeholder="Grupo"
                      placeholderTextColor="#9A9DA8"
                      alGuardar={(t) => cfg.ponerHueco(quien, f.id, { ...h, grupo: t })}
                      style={[s.campo, { width: 110 }]}
                    />
                    <Campo
                      valor={h.materia}
                      placeholder="Asignatura"
                      placeholderTextColor="#9A9DA8"
                      alGuardar={(t) => cfg.ponerHueco(quien, f.id, { ...h, materia: t })}
                      style={[s.campo, { flex: 1, minWidth: 120 }]}
                    />
                  </View>
                )}
              </View>
              {fueraTurno && tipo !== 'fuera' && (
                <Text style={s.avisoTurno}>Esta hora no es de su turno ({TURNOS.find((t) => t.id === yo?.turno)?.nombre.toLowerCase()}).</Text>
              )}
              {conflicto && esClase(h) && (
                <Text style={s.conflicto}>
                  Choque: coincide con {persona(conflicto)?.nombre}: a esta hora ya da clase en {cfg.nombreEspacio(h.espacio)}.
                </Text>
              )}
              {eligiendo === f.id && esClase(h) && (
                <Animated.View entering={entra(0)} style={s.elegir}>
                  {lugaresClase.map((e) => {
                    const ocupado = choque(f.id, e.id);
                    const on = e.id === h.espacio;
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => {
                          cfg.ponerHueco(quien, f.id, { ...h, espacio: e.id, grupo: e.tipo === 'aula' && (!h.grupo || h.grupo === cfg.nombreEspacio(h.espacio)) ? e.nombre : h.grupo });
                          setEligiendo(null);
                        }}
                        style={[s.opcion, on && s.opcionOn, ocupado && !on && { opacity: 0.45 }]}
                      >
                        <Text style={[s.opcionTexto, on && { color: color.crema }]}>{e.nombre}</Text>
                        {ocupado && <Text style={s.opcionOcupada}>{persona(ocupado)?.nombre}</Text>}
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
      <Text style={s.notaHorario}>
        El resto del personal (dirección, conserjería, secretaría) tiene un sitio fijo. Los nombres son solo de personal del centro: VELT no guarda datos de
        alumnos.
      </Text>
    </View>
  );
}

function Segmento({ on, texto, onPress }: { on: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.segmento, on && s.segmentoOn]}>
      <Text style={[s.segmentoTexto, on && { color: color.lima }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  plantillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  plantilla: { flexGrow: 1, flexBasis: 220, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 16 },
  plantillaOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  plantillaNombre: { fontFamily: font.display, fontSize: 17, textTransform: 'uppercase', color: color.tinta },
  plantillaDetalle: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 4 },
  plantillaMarca: { fontFamily: font.uiBold, fontSize: 12, color: color.lima, marginTop: 10 },
  hora: { fontFamily: font.monoBold, fontSize: 15, color: color.tinta, width: 64, borderBottomWidth: 1.5, borderBottomColor: color.borde, paddingVertical: 6, textAlign: 'center', outlineStyle: 'none' } as never,
  horaMal: { borderBottomColor: color.rojo, color: color.rojo },
  guion: { fontFamily: font.mono, color: color.gris },
  persona: { borderTopWidth: 1, borderTopColor: color.borde, paddingVertical: 10 },
  personaArriba: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  personaAbajo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 8, marginLeft: 42 },
  separador: { width: 1, height: 18, backgroundColor: color.borde, marginHorizontal: 6 },
  turnoOn: { backgroundColor: color.lima, borderColor: color.lima },
  baja: { fontFamily: font.uiMedium, fontSize: 13, color: color.gris, textDecorationLine: 'underline' },
  avisoTurno: { fontFamily: font.uiMedium, fontSize: 12, color: color.gris, marginTop: 6 },
  intro: { fontFamily: font.ui, fontSize: 16, lineHeight: 24, color: color.gris, marginTop: 16, maxWidth: 640 },
  pestanas: { flexDirection: 'row', gap: 6, marginTop: 26, marginBottom: 18, flexWrap: 'wrap' },
  pestana: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#E7E3D8' },
  pestanaOn: { backgroundColor: color.tinta },
  pestanaTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  planta: { backgroundColor: color.blanco, padding: 20, borderWidth: 1, borderColor: color.borde },
  plantaCabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  plantaNombre: { fontFamily: font.display, fontSize: 24, textTransform: 'uppercase', color: color.tinta, minWidth: 180, flex: 1, outlineStyle: 'none', paddingVertical: 4 } as never,
  contador: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contadorEtiqueta: { fontFamily: font.uiMedium, fontSize: 13, color: color.gris, marginRight: 4 },
  contadorBoton: { width: 34, height: 34, backgroundColor: color.tinta, alignItems: 'center', justifyContent: 'center' },
  contadorSigno: { fontFamily: font.monoBold, fontSize: 18, color: color.lima },
  contadorN: { fontFamily: font.display, fontSize: 24, color: color.tinta, minWidth: 34, textAlign: 'center' },
  vacio: { fontFamily: font.ui, fontSize: 14, color: color.gris, paddingVertical: 8 },
  espacio: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.borde, flexWrap: 'wrap' },
  espacioNombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta, minWidth: 150, flex: 1, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'transparent', outlineStyle: 'none' } as never,
  tipo: { borderWidth: 1, borderColor: color.borde, paddingVertical: 5, paddingHorizontal: 8 },
  tipoOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  tipoTexto: { fontFamily: font.uiMedium, fontSize: 12, color: color.tinta },
  borrar: { paddingHorizontal: 8, paddingVertical: 4 },
  borrarTexto: { fontFamily: font.monoBold, fontSize: 14, color: color.gris },
  anadir: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.borde },
  anadirBoton: { paddingVertical: 4 },
  anadirTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta, textDecorationLine: 'underline' },
  quitarPlanta: { fontFamily: font.uiMedium, fontSize: 13, color: color.gris, textDecorationLine: 'underline' },
  profe: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  profeOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  profeNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  profeMateria: { fontFamily: font.ui, fontSize: 11, color: color.gris },
  horario: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, marginTop: 14 },
  franja: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.borde },
  franjaFila: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  franjaHora: { fontFamily: font.monoBold, fontSize: 15, color: color.tinta },
  franjaNombre: { fontFamily: font.uiMedium, fontSize: 12, color: color.gris },
  segmentos: { flexDirection: 'row' },
  segmento: { borderWidth: 1.5, borderColor: color.tinta, paddingVertical: 6, paddingHorizontal: 10, marginLeft: -1.5, maxWidth: 170 },
  segmentoOn: { backgroundColor: color.tinta },
  segmentoTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  claseResumen: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  aulaElegida: { borderWidth: 1.5, borderColor: color.cobalto, backgroundColor: color.azulSuave, paddingVertical: 6, paddingHorizontal: 10 },
  aulaElegidaTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.cobalto },
  campo: { fontFamily: font.ui, fontSize: 14, color: color.tinta, borderBottomWidth: 1.5, borderBottomColor: color.borde, paddingVertical: 6, outlineStyle: 'none' } as never,
  conflicto: { fontFamily: font.uiMedium, fontSize: 13, color: color.rojo, marginTop: 8 },
  elegir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, padding: 12, backgroundColor: color.crema },
  opcion: { borderWidth: 1, borderColor: color.borde, backgroundColor: color.blanco, paddingVertical: 6, paddingHorizontal: 10 },
  opcionOn: { backgroundColor: color.cobalto, borderColor: color.cobalto },
  opcionTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
  opcionOcupada: { fontFamily: font.uiMedium, fontSize: 12, color: color.rojo, marginTop: 1 },
  notaHorario: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.gris, marginTop: 12 },
  reinicio: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 40, paddingTop: 18, borderTopWidth: 3, borderTopColor: color.tinta },
  reinicioTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  reinicioTexto: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 2 },
});
