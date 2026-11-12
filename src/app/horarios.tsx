// Horarios: ver el de cualquier persona o grupo y, para dirección y jefatura,
// crear el del curso con unas pocas preguntas. VELT reparte quién da qué,
// coloca las clases sin choques y asigna las guardias.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { celdaDePersona, CeldaHorario, EnlacePersona, FilaPersonas, HorarioSemanal } from '../components/horario';
import { TitularRevela } from '../components/motion';
import { Avatar, Barra, Boton, Contador, cortado, Mono } from '../components/ui';
import { DIAS, esLugar, Semana, TurnoFranja } from '../data/centro';
import { activos, nombreCompleto, persona } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { claseDeGrupo, docentesDe, generar, gruposDe, horasDe, horasSemana, Resultado, resumenSemana, turnoDeGrupo } from '../lib/horarios';
import { asoma, entra, vibra } from '../lib/motion';
import { hace, useVelt, useYo } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

export default function Horarios() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { gestion } = useYo();
  const cfg = useCentro();
  const [pestana, setPestana] = useState<'ver' | 'crear'>('ver');
  const docentes = docentesDe(cfg.personal);
  const grupos = gruposDe(cfg.espacios);
  const clases = docentes.reduce((n, p) => n + resumenSemana(cfg.semana[p.id]).lectivas, 0);

  return (
    <View>
      <TitularRevela texto="Horarios." tam={ancho ? 48 : 30} />
      <Mono style={{ marginTop: 10, fontSize: 14 }}>
        {docentes.length} docentes · {grupos.length} grupos · {clases} clases a la semana
        {cfg.publicado ? ` · publicado ${hace(cfg.publicado)}` : ''}
      </Mono>

      {gestion && (
        <View style={s.pestanas}>
          <Pestana on={pestana === 'ver'} texto="Ver horarios" onPress={() => setPestana('ver')} />
          <Pestana on={pestana === 'crear'} texto="Crear el horario del curso" onPress={() => setPestana('crear')} />
        </View>
      )}

      {pestana === 'ver' || !gestion ? (
        <Animated.View entering={entra(1)} style={{ marginTop: 24 }}>
          <Visor semana={cfg.semana} />
        </Animated.View>
      ) : (
        <Crear alPublicar={() => setPestana('ver')} />
      )}
    </View>
  );
}

function Pestana({ on, texto, onPress }: { on: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" style={[s.pestana, on && s.pestanaOn, cortado(8)]}>
      <Text style={[s.pestanaTexto, on && { color: color.crema }]}>{texto}</Text>
    </Pressable>
  );
}

// ——— Ver: por persona, por grupo o las guardias ———

type Modo = 'persona' | 'grupo' | 'guardias';

function Visor({ semana, ola, version = 0 }: { semana: Record<string, Semana>; ola?: boolean; version?: number }) {
  const cfg = useCentro();
  const { yo } = useYo();
  const [modo, setModo] = useState<Modo>('persona');
  const gente = activos().filter((p) => semana[p.id]);
  const grupos = gruposDe(cfg.espacios);
  const [quien, setQuien] = useState(gente.some((p) => p.id === yo.id) && yo.rol !== 'Dirección' ? yo.id : docentesDe(gente)[0]?.id ?? gente[0]?.id ?? '');
  const [grupoElegido, setGrupo] = useState(grupos[0]?.id ?? '');
  const p = persona(gente.some((x) => x.id === quien) ? quien : gente[0]?.id ?? '');
  const grupo = grupos.find((g) => g.id === grupoElegido) ?? grupos[0];

  const celda = (d: number, f: number): CeldaHorario => {
    if (modo === 'persona') return celdaDePersona(p ? semana[p.id]?.[d]?.[f] : undefined, cfg.nombreEspacio);
    if (modo === 'grupo') {
      const c = grupo ? claseDeGrupo(semana, grupo.nombre, d, f) : null;
      if (!c) return cfg.franjas[f]?.recreo ? { tipo: 'libre' } : { tipo: 'libre', titulo: 'Sin clase' };
      const aula = c.clase.espacio !== grupo!.id ? ` · ${cfg.nombreEspacio(c.clase.espacio)}` : '';
      return { tipo: 'clase', titulo: c.clase.materia, sub: `${persona(c.profe)?.nombre ?? '—'}${aula}`, materia: c.clase.materia, onPress: () => router.navigate(`/persona/${c.profe}`) };
    }
    const deGuardia = gente.filter((x) => {
      const h = semana[x.id]?.[d]?.[f];
      return h === 'guardia' || (esLugar(h) && h.motivo === 'Guardia de recreo');
    });
    if (!deGuardia.length) return cfg.franjas[f]?.recreo ? { tipo: 'libre' } : { tipo: 'aviso', titulo: 'Nadie de guardia' };
    return { tipo: 'guardia', titulo: deGuardia.map((x) => x.nombre).join(', '), sub: deGuardia.length > 1 ? `${deGuardia.length} personas` : undefined };
  };
  const r = resumenSemana(p ? semana[p.id] : undefined);

  return (
    <View>
      <View style={s.segmentos}>
        {(
          [
            ['persona', 'Por persona'],
            ['grupo', 'Por grupo'],
            ['guardias', 'Guardias'],
          ] as [Modo, string][]
        ).map(([m, t]) => (
          <Pressable key={m} onPress={() => setModo(m)} accessibilityRole="tab" style={[s.segmento, modo === m && s.segmentoOn]}>
            <Text style={[s.segmentoTexto, modo === m && { color: color.crema }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {modo === 'persona' && (
        <View style={{ marginTop: 14 }}>
          <FilaPersonas lista={gente} activo={p?.id ?? ''} onElegir={setQuien} />
          {p && (
            <View style={s.quien}>
              <Avatar id={p.id} tam={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.quienNombre}>{nombreCompleto(p)}</Text>
                <Text style={s.quienDato}>
                  {p.materia || p.rol} · {r.lectivas} h de clase · {r.guardias} {r.guardias === 1 ? 'guardia' : 'guardias'}
                </Text>
              </View>
              <EnlacePersona id={p.id}>
                <Text style={s.enlace}>Ver ficha →</Text>
              </EnlacePersona>
            </View>
          )}
        </View>
      )}
      {modo === 'grupo' && (
        <View style={[s.chips, { marginTop: 14 }]}>
          {grupos.map((g) => (
            <Pressable key={g.id} onPress={() => setGrupo(g.id)} accessibilityRole="button" style={[s.chip, g.id === grupo?.id && s.chipOn]}>
              <Text style={[s.chipTexto, g.id === grupo?.id && { color: color.crema }]}>{g.nombre}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {modo === 'guardias' && <Text style={s.ayuda}>Quién está de guardia en cada hora. Si falta alguien, VELT propone primero a estas personas para cubrir la clase.</Text>}

      <View style={{ marginTop: 16 }}>
        <HorarioSemanal franjas={cfg.franjas} celda={celda} hoy={cfg.dia} ola={ola} version={`${version}-${modo}-${modo === 'persona' ? p?.id : grupo?.id}`} />
      </View>
    </View>
  );
}

// ——— Crear: cuatro pasos y un botón ———

const PASOS = ['Grupos', 'Materias', 'Profesorado', 'Horario'];
const FASES = ['Repartiendo materias entre el profesorado…', 'Colocando las clases en la semana…', 'Quitando horas sueltas…', 'Repartiendo las guardias…'];

function Crear({ alPublicar }: { alPublicar: () => void }) {
  const cfg = useCentro();
  const { avisar } = useVelt();
  const toast = useToast();
  const [paso, setPaso] = useState(0);
  const [semilla, setSemilla] = useState(1);
  const [fase, setFase] = useState(-1); // -1 parado · 0..3 creando
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [soloPara, setSoloPara] = useState<string[]>([]);
  const [encajar, setEncajar] = useState(false);

  const { plan, franjas } = cfg;
  const grupos = gruposDe(cfg.espacios);
  const docentes = docentesDe(cfg.personal);
  const dosTurnos = franjas.some((f) => f.turno === 'tarde' && !f.recreo) && franjas.some((f) => f.turno === 'manana' && !f.recreo);
  const turnoBase: TurnoFranja = franjas.some((f) => f.turno === 'manana' && !f.recreo) ? 'manana' : 'tarde';
  const caben = horasSemana(franjas, turnoBase);
  const suma = plan.materias.reduce((n, m) => n + m.horas, 0);
  const especiales = cfg.espacios.filter((e) => (e.tipo === 'especial' || e.tipo === 'exterior') && !e.cerrado);

  // Mientras se crea, las fases van pasando; el cálculo real dura menos de un segundo
  useEffect(() => {
    if (fase < 0) return;
    if (fase < FASES.length - 1) {
      const t = setTimeout(() => setFase(fase + 1), 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const r = generar({
        franjas,
        personal: cfg.personal,
        espacios: cfg.espacios,
        plan,
        semilla,
        ...(encajar && soloPara.length ? { actual: cfg.semana, soloPara } : {}),
      });
      setResultado(r);
      setFase(-1);
      vibra('exito');
    }, 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const crear = (otra?: boolean) => {
    if (otra) setSemilla((x) => x + 1);
    setResultado(null);
    setFase(0);
  };

  const publicar = () => {
    if (!resultado) return;
    cfg.publicarHorario(resultado.semana);
    avisar(Object.keys(resultado.semana).map((id) => ({ para: id, tipo: 'horario' as const, texto: 'Tienes horario nuevo', detalle: 'Ya puedes ver tus clases y guardias de la semana.', ruta: '/horarios' })));
    toast(`Horario publicado. ${Object.keys(resultado.semana).length} docentes han recibido el aviso.`);
    alPublicar();
  };

  return (
    <View style={{ marginTop: 24 }}>
      <View style={s.pasos}>
        {PASOS.map((t, i) => (
          <Pressable key={t} onPress={() => setPaso(i)} accessibilityRole="tab" style={[s.paso, i === paso && s.pasoOn, i < paso && s.pasoHecho]}>
            <Text style={[s.pasoN, i === paso && { color: color.lima }]}>{i + 1}</Text>
            <Text style={[s.pasoTexto, i === paso && { color: color.crema }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {paso === 0 && (
        <Animated.View entering={entra(0)} style={s.bloque}>
          <Text style={s.pregunta}>¿Para qué grupos hay que hacer horario?</Text>
          <Text style={s.ayuda}>
            VELT hace un horario para cada grupo que tiene aula propia. Ahora mismo son {grupos.length} y cada uno tiene {caben} horas de clase a la semana ({caben / DIAS.length} al día).
          </Text>
          <View style={[s.chips, { marginTop: 16 }]}>
            {grupos.map((g) => {
              const t = turnoDeGrupo(g.id, plan, franjas);
              return (
                <Pressable
                  key={g.id}
                  disabled={!dosTurnos}
                  onPress={() => cfg.editarPlan({ turnos: { ...plan.turnos, [g.id]: t === 'manana' ? 'tarde' : 'manana' } })}
                  accessibilityRole="button"
                  style={[s.grupo, cortado(8)]}
                >
                  <Text style={s.grupoNombre}>{g.nombre}</Text>
                  {dosTurnos && <Text style={[s.grupoTurno, t === 'tarde' && { color: color.cobalto }]}>{t === 'manana' ? 'Mañana' : 'Tarde'}</Text>}
                </Pressable>
              );
            })}
          </View>
          {grupos.length === 0 && <Text style={[s.ayuda, { color: color.rojo }]}>Todavía no hay aulas de grupo. Añádelas en «Configurar centro».</Text>}
          {dosTurnos && <Text style={s.ayuda}>Toca un grupo para pasarlo de la mañana a la tarde.</Text>}
          <View style={s.pie}>
            <Boton variante="linea" pequeno onPress={() => router.navigate('/configurar')}>
              Cambiar aulas o jornada
            </Boton>
            <Boton onPress={() => setPaso(1)} disabled={!grupos.length}>
              Siguiente: materias
            </Boton>
          </View>
        </Animated.View>
      )}

      {paso === 1 && (
        <Animated.View entering={entra(0)} style={s.bloque}>
          <Text style={s.pregunta}>¿Qué materias tiene cada grupo y cuántas horas?</Text>
          <Text style={s.ayuda}>Horas a la semana por grupo. Si una materia necesita un aula concreta, elígela y VELT no pondrá dos grupos a la vez.</Text>
          <View style={{ marginTop: 14 }}>
            {plan.materias.map((m) => {
              const i = especiales.findIndex((e) => e.id === m.espacio);
              return (
                <View key={m.id} style={s.materia}>
                  <Campo valor={m.nombre} alGuardar={(t) => cfg.editarMateria(m.id, { nombre: t })} estilo={{ flex: 1, minWidth: 150 }} />
                  <Contar valor={m.horas} min={0} max={10} sufijo="h" onCambia={(n) => cfg.editarMateria(m.id, { horas: n })} />
                  <Pressable
                    onPress={() => cfg.editarMateria(m.id, { espacio: especiales[i + 1]?.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`Aula de ${m.nombre}`}
                    style={[s.aula, m.espacio ? { backgroundColor: color.azulSuave, borderColor: color.azulSuave } : null]}
                  >
                    <Text style={[s.aulaTexto, m.espacio ? { color: color.cobalto } : null]}>{i >= 0 ? especiales[i].nombre : 'Aula del grupo'}</Text>
                  </Pressable>
                  <Pressable onPress={() => cfg.quitarMateria(m.id)} accessibilityRole="button" accessibilityLabel={`Quitar ${m.nombre}`} style={s.quitar}>
                    <Text style={s.quitarTexto}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={[s.suma, cortado(14)]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={[s.sumaN, suma > caben && { color: '#FF8A8A' }, suma === caben && { color: color.lima }]}>{suma}</Text>
              <Text style={s.sumaTexto}>de {caben} horas a la semana</Text>
            </View>
            <Barra alto={8} vacio="#232838" total={Math.max(caben, suma)} tramos={[{ valor: Math.min(suma, caben), color: color.lima }, { valor: Math.max(0, suma - caben), color: color.rojo }]} />
            <Text style={s.sumaNota}>
              {suma === caben
                ? 'Encaja justo: los grupos no tienen horas sueltas.'
                : suma > caben
                  ? `Sobran ${suma - caben} ${suma - caben === 1 ? 'hora' : 'horas'}: no caben en la semana.`
                  : `Quedan ${caben - suma} ${caben - suma === 1 ? 'hora libre' : 'horas libres'} por grupo, que irán a última hora.`}
            </Text>
          </View>
          <View style={s.pie}>
            <Boton variante="linea" pequeno onPress={cfg.addMateria}>
              Añadir materia
            </Boton>
            <Boton onPress={() => setPaso(2)}>Siguiente: profesorado</Boton>
          </View>
        </Animated.View>
      )}

      {paso === 2 && (
        <Animated.View entering={entra(0)} style={s.bloque}>
          <Text style={s.pregunta}>¿Quién puede dar cada materia?</Text>
          <Text style={s.ayuda}>Marca lo que puede dar cada persona. VELT reparte los grupos para que la carga salga pareja y nadie pase de sus horas.</Text>
          <View style={s.ajustes}>
            <Ajuste texto="Horas de clase a la semana" valor={plan.horasLectivas} min={5} max={30} onCambia={(n) => cfg.editarPlan({ horasLectivas: n })} />
            <Ajuste texto="Guardias por docente" valor={plan.guardias} min={0} max={8} onCambia={(n) => cfg.editarPlan({ guardias: n })} />
            <Ajuste texto="Personas de guardia cada hora" valor={plan.guardiasPorFranja} min={0} max={4} onCambia={(n) => cfg.editarPlan({ guardiasPorFranja: n })} />
          </View>
          <View style={{ marginTop: 8 }}>
            {docentes.map((p) => (
              <View key={p.id} style={s.docente}>
                <EnlacePersona id={p.id} style={{ width: 150 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar id={p.id} tam={30} />
                    <View>
                      <Text style={s.docenteNombre}>{p.nombre}</Text>
                      <Text style={s.docenteRol}>{p.rol === 'Jefatura' ? 'Jefatura' : p.apellido}</Text>
                    </View>
                  </View>
                </EnlacePersona>
                <View style={[s.chips, { flex: 1, minWidth: 220 }]}>
                  {plan.materias.map((m) => {
                    const on = m.profes.includes(p.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => cfg.editarMateria(m.id, { profes: on ? m.profes.filter((x) => x !== p.id) : [...m.profes, p.id] })}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={[s.da, on && s.daOn]}
                      >
                        <Text style={[s.daTexto, on && { color: color.lima }]}>{m.nombre}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Contar valor={horasDe(p, plan)} min={0} max={30} sufijo="h" onCambia={(n) => cfg.editarPersona(p.id, { horas: n })} />
              </View>
            ))}
          </View>
          <Cobertura />
          <View style={s.pie}>
            <Boton variante="linea" pequeno onPress={() => router.navigate('/configurar')}>
              Añadir o quitar personal
            </Boton>
            <Boton onPress={() => setPaso(3)}>Siguiente: crear el horario</Boton>
          </View>
        </Animated.View>
      )}

      {paso === 3 && (
        <Animated.View entering={entra(0)}>
          {!resultado && fase < 0 && (
            <View style={[s.lanzar, cortado(26)]}>
              <Text style={s.lanzarTitulo}>
                {grupos.length} grupos, {docentes.length} docentes{'\n'}y {grupos.length * suma} clases a la semana.
              </Text>
              <Text style={s.lanzarTexto}>VELT prueba combinaciones hasta que nadie está en dos sitios a la vez, ningún grupo tiene dos clases y las guardias quedan cubiertas.</Text>
              <View style={{ marginTop: 22, gap: 12 }}>
                <Pressable onPress={() => setEncajar((x) => !x)} accessibilityRole="checkbox" accessibilityState={{ checked: encajar }} style={s.opcion}>
                  <View style={[s.casilla, encajar && { backgroundColor: color.lima, borderColor: color.lima }]}>{encajar && <Text style={s.casillaMarca}>✓</Text>}</View>
                  <Text style={s.opcionTexto}>Ha llegado alguien nuevo: mantener los horarios actuales y encajar solo a…</Text>
                </Pressable>
                {encajar && (
                  <Animated.View entering={entra(0)} style={s.chips}>
                    {docentes.map((p) => {
                      const on = soloPara.includes(p.id);
                      return (
                        <Pressable key={p.id} onPress={() => setSoloPara((x) => (on ? x.filter((q) => q !== p.id) : [...x, p.id]))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[s.da, { borderColor: '#3A4058' }, on && { backgroundColor: color.lima, borderColor: color.lima }]}>
                          <Text style={[s.daTexto, { color: on ? color.tinta : color.grisClaro }]}>{p.nombre}</Text>
                        </Pressable>
                      );
                    })}
                  </Animated.View>
                )}
              </View>
              <Boton variante="lima" fondo={color.tinta} onPress={() => crear()} disabled={!grupos.length || !docentes.length || (encajar && !soloPara.length)} style={{ alignSelf: 'flex-start', marginTop: 24 }}>
                Crear horario
              </Boton>
            </View>
          )}

          {fase >= 0 && (
            <Animated.View entering={asoma()} style={[s.lanzar, cortado(26)]}>
              <Mono style={{ color: color.lima }}>Creando el horario</Mono>
              <Text style={[s.lanzarTitulo, { marginTop: 10 }]}>{FASES[fase]}</Text>
              <RejillaCreando />
              <View style={{ marginTop: 18 }}>
                <Barra key={fase} alto={6} vacio="#232838" total={FASES.length} tramos={[{ valor: fase + 1, color: color.lima }]} />
              </View>
            </Animated.View>
          )}

          {resultado && (
            <View>
              <Animated.View entering={asoma()} style={[s.lanzar, cortado(26)]}>
                <Mono style={{ color: color.lima }}>{resultado.colocadas === resultado.total ? 'Horario completo' : 'Horario con huecos por resolver'}</Mono>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <Contador valor={resultado.colocadas} anima style={s.resN} />
                  <Text style={s.resDe}>de {resultado.total} clases colocadas</Text>
                </View>
                <View style={s.resDatos}>
                  <Dato n="0" l="choques" />
                  <Dato n={String(resultado.huecos)} l="horas sueltas entre clases" />
                  <Dato n={String(resultado.combinaciones)} l="combinaciones probadas" />
                  <Dato n={`${(resultado.ms / 1000).toFixed(1).replace('.', ',')} s`} l="de cálculo" />
                </View>
                {resultado.avisos.map((a, i) => (
                  <View key={i} style={s.avisoRes}>
                    <Text style={s.avisoResTexto}>{a.texto}</Text>
                  </View>
                ))}
                <View style={[s.pie, { justifyContent: 'flex-start', marginTop: 22 }]}>
                  <Boton variante="lima" fondo={color.tinta} onPress={publicar}>
                    Publicar y avisar al profesorado
                  </Boton>
                  <Boton variante="blanco" fondo={color.tinta} onPress={() => crear(true)}>
                    Probar otra combinación
                  </Boton>
                </View>
              </Animated.View>

              <View style={{ marginTop: 28 }}>
                <Text style={s.cab}>Así queda</Text>
                <Visor semana={{ ...cfg.semana, ...resultado.semana }} ola version={semilla} />
              </View>

              <View style={{ marginTop: 28 }}>
                <Text style={s.cab}>Reparto de horas</Text>
                {Object.entries(resultado.porProfe).map(([id, x]) => (
                  <View key={id} style={s.reparto}>
                    <Avatar id={id} tam={28} />
                    <Text style={[s.docenteNombre, { width: 90 }]}>{persona(id)?.nombre}</Text>
                    <View style={{ flex: 1 }}>
                      <Barra alto={6} total={Math.max(x.maximo, x.lectivas, 1)} tramos={[{ valor: x.lectivas, color: color.cobalto }]} />
                    </View>
                    <Text style={s.repartoDato}>
                      {x.lectivas}/{x.maximo} h · {x.guardias} g{x.huecos ? ` · ${x.huecos} ${x.huecos === 1 ? 'hueco' : 'huecos'}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// Mientras VELT calcula, una semana en pequeño se va llenando de clases
const TONOS_REJILLA = [color.cobalto, color.lima, '#3A4058', color.crema, color.cobalto, '#7A8CFF'];
function RejillaCreando() {
  return (
    <View style={s.rejillaCreando} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 6 }, (_, f) => (
        <View key={f} style={{ flexDirection: 'row', gap: 5 }}>
          {Array.from({ length: 5 }, (_, d) => {
            // Orden revuelto pero fijo: parece que las clases van encontrando su hueco
            const orden = (d * 7 + f * 11) % 30;
            return (
              <View key={d} style={s.celdaCreando}>
                <Animated.View entering={FadeIn.delay(120 + orden * 48).duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: TONOS_REJILLA[(d * 3 + f * 5) % TONOS_REJILLA.length] }]} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Horas que hacen falta de cada materia frente a quién puede darlas
function Cobertura() {
  const cfg = useCentro();
  const { plan } = cfg;
  const grupos = gruposDe(cfg.espacios).length;
  const filas = useMemo(
    () =>
      plan.materias
        .filter((m) => m.horas > 0)
        .map((m) => {
          const quienes = m.profes.map((id) => cfg.personal.find((p) => p.id === id && !p.baja)).filter((p) => !!p);
          const tope = quienes.reduce((n, p) => n + horasDe(p!, plan), 0);
          return { m, hacen: m.horas * grupos, quienes: quienes.length, falta: quienes.length === 0 || tope < m.horas * grupos };
        }),
    [plan, cfg.personal, grupos],
  );
  const mal = filas.filter((f) => f.falta);
  return (
    <View style={[s.cobertura, mal.length ? { borderColor: color.rojo } : null]}>
      <Text style={s.coberturaTitulo}>
        {mal.length ? `${mal.length} ${mal.length === 1 ? 'materia no tiene' : 'materias no tienen'} profesorado suficiente` : 'Todas las materias tienen quien las dé'}
      </Text>
      {mal.map(({ m, hacen, quienes }) => (
        <Text key={m.id} style={s.coberturaTexto}>
          {m.nombre}: hacen falta {hacen} h a la semana y {quienes === 0 ? 'nadie puede darla' : `${quienes === 1 ? 'la persona que la da no llega' : `las ${quienes} personas que la dan no llegan`}`}.
        </Text>
      ))}
    </View>
  );
}

function Dato({ n, l }: { n: string; l: string }) {
  return (
    <View>
      <Text style={s.datoN}>{n}</Text>
      <Text style={s.datoL}>{l}</Text>
    </View>
  );
}

function Ajuste({ texto, valor, min, max, onCambia }: { texto: string; valor: number; min: number; max: number; onCambia: (n: number) => void }) {
  return (
    <View style={s.ajuste}>
      <Text style={s.ajusteTexto}>{texto}</Text>
      <Contar valor={valor} min={min} max={max} onCambia={onCambia} />
    </View>
  );
}

// − 4 +
function Contar({ valor, min, max, sufijo, onCambia }: { valor: number; min: number; max: number; sufijo?: string; onCambia: (n: number) => void }) {
  const boton = (delta: number, signo: string, etiqueta: string) => {
    const fuera = valor + delta < min || valor + delta > max;
    return (
      <Pressable onPress={() => onCambia(valor + delta)} disabled={fuera} accessibilityRole="button" accessibilityLabel={etiqueta} style={[s.contarBoton, fuera && { opacity: 0.3 }]}>
        <Text style={s.contarSigno}>{signo}</Text>
      </Pressable>
    );
  };
  return (
    <View style={s.contar}>
      {boton(-1, '−', 'Quitar una')}
      <Text style={s.contarN}>
        {valor}
        {sufijo ? ` ${sufijo}` : ''}
      </Text>
      {boton(1, '+', 'Añadir una')}
    </View>
  );
}

// Texto que se guarda al salir del campo, no en cada tecla
function Campo({ valor, alGuardar, estilo }: { valor: string; alGuardar: (t: string) => void; estilo?: object }) {
  const [texto, setTexto] = useState(valor);
  const [previo, setPrevio] = useState(valor);
  if (valor !== previo) {
    setPrevio(valor);
    setTexto(valor);
  }
  return <TextInput value={texto} onChangeText={setTexto} onBlur={() => texto.trim() && texto !== valor && alGuardar(texto.trim())} style={[s.campo, estilo]} />;
}

const s = StyleSheet.create({
  pestanas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  pestana: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#E7E3D8' },
  pestanaOn: { backgroundColor: color.tinta },
  pestanaTexto: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  segmentos: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 2, borderColor: color.tinta },
  segmento: { paddingVertical: 8, paddingHorizontal: 14 },
  segmentoOn: { backgroundColor: color.tinta },
  segmentoTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  quienNombre: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta, textTransform: 'uppercase', letterSpacing: -0.3 },
  quienDato: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 2 },
  enlace: { fontFamily: font.uiBold, fontSize: 13, color: color.cobalto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  chipOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  chipTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
  ayuda: { fontFamily: font.ui, fontSize: 14, lineHeight: 21, color: color.gris, marginTop: 8, maxWidth: 640 },
  pasos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: '#C9C3B4' },
  pasoOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  pasoHecho: { borderColor: color.tinta },
  pasoN: { fontFamily: font.monoBold, fontSize: 13, color: color.gris },
  pasoTexto: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  bloque: { marginTop: 26 },
  pregunta: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 27, letterSpacing: -0.5, color: color.tinta, textTransform: 'uppercase', maxWidth: 640 },
  grupo: { backgroundColor: color.blanco, paddingVertical: 12, paddingHorizontal: 16, minWidth: 120 },
  grupoNombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  grupoTurno: { fontFamily: font.uiMedium, fontSize: 12, color: color.gris, marginTop: 2 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 26 },
  materia: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.borde },
  campo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, outlineStyle: 'none' } as never,
  aula: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: color.borde, minWidth: 130, alignItems: 'center' },
  aulaTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.gris },
  quitar: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  quitarTexto: { fontFamily: font.uiBold, fontSize: 20, color: color.gris },
  suma: { backgroundColor: color.tinta, padding: 20, marginTop: 20, gap: 12, maxWidth: 560 },
  sumaN: { fontFamily: font.display, fontSize: 44, letterSpacing: -1.5, color: color.crema },
  sumaTexto: { fontFamily: font.uiMedium, fontSize: 15, color: color.grisClaro },
  sumaNota: { fontFamily: font.ui, fontSize: 13, color: color.grisClaro },
  ajustes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18, marginBottom: 10 },
  ajuste: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, paddingVertical: 8, paddingLeft: 14, paddingRight: 8 },
  ajusteTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
  contar: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  contarBoton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7E3D8' },
  contarSigno: { fontFamily: font.uiBold, fontSize: 16, color: color.tinta },
  contarN: { fontFamily: font.monoBold, fontSize: 13, color: color.tinta, minWidth: 44, textAlign: 'center' },
  docente: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.borde },
  docenteNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  docenteRol: { fontFamily: font.ui, fontSize: 12, color: color.gris },
  da: { paddingVertical: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: color.borde },
  daOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  daTexto: { fontFamily: font.uiMedium, fontSize: 12, color: color.gris },
  cobertura: { marginTop: 18, borderLeftWidth: 4, borderColor: color.lima, paddingLeft: 14, paddingVertical: 4, gap: 4 },
  coberturaTitulo: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  coberturaTexto: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.gris },
  rejillaCreando: { gap: 5, marginTop: 22, maxWidth: 420 },
  celdaCreando: { flex: 1, height: 22, backgroundColor: '#1A1D27' },
  lanzar: { backgroundColor: color.tinta, padding: 30, marginTop: 26 },
  lanzarTitulo: { fontFamily: font.display, fontSize: 30, lineHeight: 31, letterSpacing: -0.8, color: color.crema, textTransform: 'uppercase' },
  lanzarTexto: { fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.grisClaro, marginTop: 14, maxWidth: 560 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  opcionTexto: { fontFamily: font.uiMedium, fontSize: 14, color: color.crema, flexShrink: 1 },
  casilla: { width: 22, height: 22, borderWidth: 2, borderColor: color.grisClaro, alignItems: 'center', justifyContent: 'center' },
  casillaMarca: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  resN: { fontFamily: font.display, fontSize: 96, lineHeight: 96, letterSpacing: -4, color: color.crema },
  resDe: { fontFamily: font.uiMedium, fontSize: 18, color: color.crema },
  resDatos: { flexDirection: 'row', flexWrap: 'wrap', gap: 28, marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#262B3C' },
  datoN: { fontFamily: font.display, fontSize: 26, color: color.lima, letterSpacing: -0.5 },
  datoL: { fontFamily: font.ui, fontSize: 13, color: color.grisClaro, marginTop: 2 },
  avisoRes: { marginTop: 14, borderLeftWidth: 3, borderLeftColor: '#FF8A8A', paddingLeft: 12 },
  avisoResTexto: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.crema, maxWidth: 640 },
  cab: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta, borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 14 },
  reparto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.borde },
  repartoDato: { fontFamily: font.mono, fontSize: 12, color: color.gris, minWidth: 150, textAlign: 'right' },
});
