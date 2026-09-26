// Base de conocimiento de Luna (español). Todo se evalúa en el dispositivo.
// - redFlags: se comprueban siempre primero y se muestran arriba (urgencias, crisis, violencia).
//   Saltan con una frase de `patterns` o con una combinación (`combos`) cuando aparece al menos
//   una palabra de cada grupo en cualquier parte del mensaje ("fiebre" + "tampón"). "@pregnant"
//   y "@postpartum" remiten a `contexts` y también se cumplen por el modo de uso de la usuaria.
//   Una negación justo antes ("no tengo fiebre") desactiva la regla, salvo en las marcadas con
//   `alwaysFlag` (suicidio, autolesiones, violencia...).
//   Solo se añade después la información relacionada (`related`, o `follow` si no hay otra).
// - contextual: preguntas personales que se responden con los datos de la usuaria (views/luna.js).
// - intents: respuestas informativas; `topic` es la pregunta que se ofrece como sugerencia.
// Las palabras clave se normalizan (minúsculas, sin tildes) y coinciden como palabras completas;
// un "*" final marca una raíz ("sangr*") y "#" un número. En las respuestas informativas se admite
// además el plural (s/es) de la última palabra. Pesos: 2 = pista débil, 4 = tema claro, 6 = frase exacta.

// Grupos de palabras de las reglas combinadas.
const SANGRADO = [
  'sangro', 'sangra', 'sangran', 'sangrando', 'sangrado', 'sangrados', 'sangrar', 'he sangrado', 'sangre en la', 'sangre en el',
  'sangre en las', 'sangre en los', 'con sangre', 'mucha sangre', 'pierdo sangre', 'perdiendo sangre', 'perdida de sangre',
  'perdidas de sangre', 'manchas de sangre', 'restos de sangre', 'hemorragia*', 'desangr*', 'mancho', 'manchando', 'manchado',
  'manchar', 'manche', 'coagulo*',
];
const MAREO = ['mare*', 'desmay*', 'debil', 'muy debil', 'sin fuerzas', 'aturdida', 'aturdido', 'se me va la cabeza', 'veo negro'];
const EMPAPAR = ['empap*'];
const PRODUCTO = [
  'compresa*', 'tampon*', 'copa menstrual', 'la copa', 'mi copa', 'disco menstrual', 'braga*', 'salvaslip*', 'protegeslip*',
  'panal*', 'toalla higienica', 'toallas higienicas',
];
const FIEBRE = ['fiebre', 'febril', 'febricula', 'calentura', 'temperatura alta', 'tengo temperatura', 'mucha temperatura'];
const TAMPON_COPA = ['tampon*', 'copa menstrual', 'la copa', 'mi copa', 'con copa', 'disco menstrual'];
const DOLOR_FUERTE = [
  'me duele mucho', 'me duele muchisimo', 'me duela mucho', 'duele mucho', 'duele muchisimo', 'mucho dolor', 'muchisimo dolor',
  'dolor fuerte', 'dolor muy fuerte', 'dolores fuertes', 'dolor intenso', 'dolor muy intenso', 'dolor agudo', 'dolor horrible',
  'dolor insoportable', 'no aguanto el dolor', 'colicos fuertes', 'colicos muy fuertes', 'retortijones fuertes', 'pinchazo fuerte',
  'pinchazos fuertes',
];
const SANGRADO_ABUNDANTE = [
  'sangro mucho', 'sangro muchisimo', 'sangrando mucho', 'sangrando muchisimo', 'mucha sangre', 'mucho sangrado',
  'sangrado abundante', 'sangrado muy abundante', 'coagulos grandes', 'coagulo grande', 'coagulos enormes', 'coagulos muy grandes',
  'sangro mas', 'sangrando mas', 'vuelvo a sangrar', 'he vuelto a sangrar', 'aumenta el sangrado', 'el sangrado aumenta',
];
const GOLPES = [
  'me pega', 'me pego', 'me pegaba', 'me pegan', 'me pegaron', 'me ha pegado', 'me han pegado', 'me golpea', 'me golpeo',
  'me golpeaba', 'me golpean', 'me ha golpeado', 'me da golpes', 'me empuja', 'me empujo', 'me ha empujado', 'me agrede',
  'me agredio', 'me ha agredido', 'me zarandea',
];
const PERSONA = [
  'pareja', 'expareja', 'novio', 'novia', 'exnovio', 'marido', 'esposo', 'esposa', 'mi mujer', 'mi ex', 'mi padre', 'mi madre',
  'mi padrastro', 'mi madrastra', 'mi hermano', 'mi hermana', 'mi tio', 'mi familia', 'mis padres', 'alguien', 'un chico',
  'un hombre', 'el me', 'ella me', 'en casa',
];

/** @type {import('../domain/luna.js').KnowledgeBase} */
export default {
  // Situaciones que activan los grupos "@..." de las reglas: frases afirmativas (no "si estoy
  // embarazada") o el modo de uso (embarazo; posparto durante las primeras 12 semanas).
  contexts: {
    pregnant: [
      'estoy embarazada', 'estando embarazada', 'sigo embarazada', 'embarazada de # semanas', 'embarazada de # meses',
      'embarazada de gemelos', 'estoy de # semanas', 'estoy de # meses', 'semanas de embarazo', 'meses de embarazo',
      'semanas de gestacion', 'en el embarazo', 'durante el embarazo', 'en mi embarazo', 'mi embarazo', 'al principio del embarazo',
      'primer trimestre', 'segundo trimestre', 'tercer trimestre', 'estoy encinta',
    ],
    postpartum: [
      'tras el parto', 'despues del parto', 'tras dar a luz', 'despues de dar a luz', 'he dado a luz', 'di a luz', 'acabo de dar a luz',
      'posparto', 'postparto', 'puerperio', 'cesarea', 'loquios',
    ],
  },

  redFlags: [
    {
      id: 'heavyBleeding',
      patterns: [
        'empapo una compresa', 'empapa una compresa', 'empapa la compresa', 'hemorragia*', 'sangro muchisimo', 'sangrando muchisimo',
        'no para de sangrar', 'no deja de sangrar', 'no me para de sangrar', 'no puedo parar de sangrar', 'coagulos enormes',
        'coagulos muy grandes', 'me estoy desangrando', 'charco de sangre', 'sangro a chorros', 'sangrando a chorros',
      ],
      combos: [
        [EMPAPAR, PRODUCTO],
        [SANGRADO, MAREO],
      ],
      answer: ['⚠️ Si empapas una compresa o un tampón cada hora durante 2 horas o más, expulsas coágulos muy grandes o te sientes mareada o débil, busca atención médica urgente ahora: acude a urgencias o llama al 112.'],
      related: ['heavyBleeding', 'anemia', 'postpartumBleeding', 'miscarriage'],
    },
    {
      id: 'severePain',
      patterns: ['dolor insoportable', 'dolor muy fuerte', 'dolor horrible', 'dolor terrible', 'muero de dolor', 'no aguanto el dolor', 'dolor muy intenso', 'dolor repentino'],
      combos: [[['@postpartum'], DOLOR_FUERTE]],
      answer: ['⚠️ Si el dolor es muy intenso o repentino, no mejora con analgésicos, o viene con fiebre, vómitos, mareo o sangrado —sobre todo si podrías estar embarazada—, acude a urgencias o llama al 112.'],
      related: ['cramps', 'endometriosis', 'ovarianCyst', 'postpartumBleeding'],
    },
    {
      id: 'fainting',
      patterns: ['desmay*', 'perdi el conocimiento', 'he perdido el conocimiento', 'perder el conocimiento'],
      answer: ['⚠️ Si te has desmayado o sientes que vas a desmayarte, túmbate con las piernas en alto y pide ayuda. Si sangras mucho, podrías estar embarazada o no te recuperas enseguida, llama al 112.'],
      related: ['heavyBleeding', 'anemia'],
    },
    {
      id: 'pregnancyBleeding',
      patterns: ['embarazada y sangro', 'embarazada y estoy sangrando', 'embarazada y tengo sangrado', 'embarazada y mancho', 'sangrado en el embarazo', 'sangrado durante el embarazo', 'sangro y estoy embarazada', 'estoy sangrando y estoy embarazada'],
      combos: [[['@pregnant'], SANGRADO]],
      // Sangrados frecuentes en el embarazo que no son vaginales.
      unless: ['encia*', 'nariz', 'nasal', 'hemorroide*', 'almorrana*'],
      answer: ['⚠️ Cualquier sangrado en el embarazo debe valorarlo un profesional. Si es abundante, con coágulos, dolor fuerte o mareo, acude a urgencias ahora o llama al 112. Si es un manchado leve, llama hoy a tu matrona o centro de salud.'],
      related: ['pregnancyWarning', 'miscarriage'],
      follow: 'pregnancyWarning',
    },
    {
      id: 'pregnancyPain',
      combos: [[['@pregnant'], DOLOR_FUERTE]],
      answer: ['⚠️ En el embarazo, un dolor fuerte que no se calma —sobre todo si es de un solo lado o viene con sangrado, fiebre, mareo o pérdida de líquido— necesita valoración urgente: acude ahora a urgencias o llama al 112.'],
      related: ['pregnancyWarning', 'miscarriage', 'contractions'],
      follow: 'pregnancyWarning',
    },
    {
      id: 'postpartumHaemorrhage',
      combos: [[['@postpartum'], SANGRADO_ABUNDANTE]],
      answer: ['⚠️ Tras el parto, empapar una compresa en una hora o menos, expulsar coágulos grandes o que el sangrado aumente en vez de disminuir —sobre todo con mareo, fiebre o mal olor— puede ser una hemorragia o una infección: acude a urgencias ahora o llama al 112.'],
      related: ['postpartumBleeding'],
      follow: 'postpartumBleeding',
    },
    {
      id: 'toxicShock',
      patterns: ['fiebre y tampon', 'tampon y fiebre', 'fiebre con tampon', 'fiebre con el tampon', 'fiebre y la copa', 'copa y fiebre', 'fiebre con la copa'],
      combos: [[FIEBRE, TAMPON_COPA]],
      answer: ['⚠️ Una fiebre alta repentina mientras usas tampón o copa, con vómitos, diarrea, erupción o mareo, puede ser un síndrome de shock tóxico: retíralo y acude a urgencias ahora.'],
      related: ['tss'],
      follow: 'tss',
    },
    {
      id: 'preeclampsia',
      patterns: ['vision borrosa', 'veo borroso', 'veo destellos', 'veo lucecitas', 'veo puntitos'],
      answer: ['⚠️ La visión borrosa o con destellos, sobre todo con dolor de cabeza intenso o hinchazón brusca, puede ser un signo de preeclampsia si estás embarazada o has dado a luz hace poco. Contacta hoy mismo con urgencias o llama al 112.'],
      related: ['pregnancyWarning', 'headache'],
    },
    {
      id: 'fetalMovement',
      patterns: ['no noto al bebe', 'no noto a mi bebe', 'el bebe no se mueve', 'mi bebe no se mueve', 'se mueve menos', 'no siento al bebe', 'no siento a mi bebe', 'no noto movimientos'],
      alwaysFlag: true,
      answer: ['⚠️ Si notas que tu bebé se mueve menos o de forma diferente, no esperes a mañana: llama hoy mismo a tu maternidad o acude a urgencias obstétricas.'],
      related: ['pregnancyWarning', 'contractions'],
    },
    {
      id: 'waterBreak',
      patterns: ['rompi aguas', 'he roto aguas', 'rompi la bolsa', 'he roto la bolsa', 'rompi la fuente', 'he roto la fuente', 'se me ha roto la bolsa', 'se rompio la bolsa', 'pierdo liquido', 'estoy perdiendo liquido'],
      answer: ['⚠️ Si crees que has roto aguas, anota la hora y el color del líquido y contacta con tu maternidad. Si el líquido es verdoso, marrón o con sangre, si notas menos movimientos o estás de menos de 37 semanas, acude sin esperar.'],
      related: ['contractions', 'pregnancyWarning'],
    },
    {
      id: 'chest',
      patterns: ['dolor en el centro del pecho', 'opresion en el pecho', 'me oprime el pecho', 'me falta el aire', 'falta de aire', 'no puedo respirar', 'me ahogo', 'pierna hinchada', 'pantorrilla hinchada', 'dolor en la pantorrilla'],
      // "Pecho" también es la mama: el dolor de pecho premenstrual o de la lactancia no es una urgencia.
      combos: [[['dolor en el pecho', 'dolor de pecho', 'me duele el pecho']]],
      unless: ['regla', 'lactancia', 'mamar', 'dar el pecho', 'pezon*', 'bulto', 'sujetador', 'premenstrual'],
      answer: ['⚠️ Un dolor opresivo en el centro del pecho, la falta de aire repentina o el dolor e hinchazón en una pierna pueden ser graves, sobre todo en el embarazo, tras el parto o si tomas anticonceptivos con estrógenos. Llama al 112 ahora.'],
    },
    {
      id: 'selfHarm',
      patterns: [
        'suicid*', 'quitarme la vida', 'no quiero vivir', 'quiero morir', 'quiero morirme', 'me quiero morir', 'me quiero matar',
        'me voy a matar', 'quiero matarme', 'voy a matarme', 'pienso en matarme', 'ganas de matarme', 'quiero hacerme dano',
        'hacerme dano a mi misma', 'me hago dano a mi misma', 'me hago dano a proposito', 'pienso en hacerme dano',
        'ganas de hacerme dano', 'autolesion*', 'me autolesiono', 'autolesionarme', 'me corto los brazos', 'me corto el brazo',
        'me corto las munecas', 'me corto la muneca', 'me corto los muslos', 'me corto las venas', 'cortarme las venas',
        'cortarme los brazos', 'me hago cortes', 'hacerme cortes', 'me quemo a proposito', 'acabar con mi vida',
        'no quiero seguir viviendo', 'desaparecer para siempre', 'no quiero estar viva',
      ],
      alwaysFlag: true,
      answer: [
        'Siento mucho que estés pasando por esto. No estás sola y mereces ayuda ahora mismo. 💜',
        'En España puedes llamar al 024 (atención a la conducta suicida: gratuito, confidencial y 24 horas) o al 112 si estás en peligro. Si eres menor, también a la Fundación ANAR: 900 20 20 10. En otros países: 988 (EE. UU.), 116 123 (Samaritans, Reino Unido e Irlanda) o tu número de emergencias.',
        'Si puedes, habla ahora con alguien de confianza y no te quedes sola.',
      ],
      related: ['mood', 'postpartumMood', 'pms'],
    },
    {
      id: 'violence',
      patterns: [
        'me maltrata', 'maltrato', 'malos tratos', 'violencia de genero', 'violencia machista', 'violencia domestica', 'me han violado',
        'me violo', 'me violaron', 'violacion', 'abuso sexual', 'abusaron de mi', 'abusa de mi', 'agresion sexual', 'me forzo',
        'me forzaron', 'me obligo a tener relaciones', 'me obliga a tener relaciones', 'tengo miedo de mi pareja',
        'mi pareja me controla', 'me dio una paliza', 'me da palizas', 'me ha dado una paliza', 'me dio una bofetada',
        'me da bofetadas',
      ],
      // "Me pega" solo es violencia si hay una persona: "la regla me pega fuerte" no lo es.
      combos: [[GOLPES, PERSONA]],
      alwaysFlag: true,
      answer: [
        'Lo que cuentas es muy serio y no es culpa tuya. Mereces estar segura. 💜',
        'Si estás en peligro, llama al 112. En España, el 016 atiende 24 horas a víctimas de violencia machista y sexual; es gratuito, no deja rastro en la factura y también funciona por WhatsApp (600 000 016). Si eres menor: Fundación ANAR, 900 20 20 10.',
        'Si has sufrido una agresión sexual, acude a urgencias: pueden atenderte, recoger pruebas si tú quieres y ofrecerte anticoncepción de urgencia y prevención de infecciones.',
      ],
    },
  ],

  contextual: {
    nextPeriod: { 'cuando me viene': 5, 'cuando me baja': 5, 'cuando me toca': 5, 'proxima regla': 5, 'siguiente regla': 5, 'cuando llega mi regla': 6, 'cuando me va a venir': 6, 'cuando me va a bajar': 6, 'mi proxima menstruacion': 6, 'cuando tendre la regla': 6 },
    fertileNow: { 'estoy fertil': 6, 'estoy en dias fertiles': 6, 'estoy en mis dias fertiles': 6, 'soy fertil': 5, 'fertil hoy': 5, 'hoy fertil': 5, 'mis dias fertiles': 5, 'mi ventana fertil': 5, 'cuando son mis dias fertiles': 6, 'puedo quedarme embarazada hoy': 6 },
    ovulation: { 'cuando ovulo': 6, 'cuando voy a ovular': 6, 'que dia ovulo': 6, 'mi ovulacion': 5, 'cuando es mi ovulacion': 6, 'ya he ovulado': 6, 'he ovulado': 5 },
    cycleDay: { 'en que dia del ciclo': 6, 'dia del ciclo estoy': 6, 'en que fase estoy': 6, 'que fase del ciclo': 5, 'mi fase': 4, 'en que dia estoy': 5 },
    cycleNormal: { 'es normal mi ciclo': 6, 'mi ciclo es normal': 6, 'mi ciclo es regular': 6, 'soy regular': 5, 'mis ciclos son normales': 6, 'cuanto dura mi ciclo': 6, 'mi ciclo medio': 5, 'ciclo normal': 3 },
    periodLength: { 'cuanto dura mi regla': 6, 'cuantos dias dura mi regla': 6, 'duracion de mi regla': 6, 'mi regla dura': 5 },
    pregnancyWeek: { 'de cuantas semanas estoy': 6, 'cuantas semanas estoy': 6, 'cuantas semanas llevo': 6, 'de cuanto estoy': 5, 'semana de embarazo estoy': 6, 'cuando salgo de cuentas': 6, 'fecha probable de parto': 5, 'mi fecha de parto': 5 },
    pregnancyChance: { 'puedo estar embarazada': 6, 'podria estar embarazada': 6, 'estare embarazada': 6, 'me habre quedado embarazada': 6, 'riesgo de embarazo': 5, 'posibilidad de embarazo': 5, 'probabilidad de embarazo': 5, 'me puedo haber quedado': 6 },
  },

  intents: [
    // ------------------------------------------------------------ Dolor y síntomas
    {
      id: 'cramps',
      topic: '¿Cómo alivio los cólicos?',
      keywords: { colico: 3, 'me duele': 2, dolor: 1, 'dolor de regla': 4, 'dolor menstrual': 4, 'me duele la regla': 4, 'dolor de ovarios': 3, retortijon: 3, dismenorrea: 4, 'duele la tripa': 2, 'me duele la barriga': 2, 'aliviar el dolor': 2, 'regla dolorosa': 4 },
      answer: [
        'Los cólicos se deben a las prostaglandinas, que hacen contraerse al útero. Lo que mejor funciona: un antiinflamatorio como el ibuprofeno al empezar el dolor (siguiendo el prospecto), calor local en el abdomen o la zona lumbar y movimiento suave como caminar o estirar.',
        'Si el dolor no mejora con esto, te hace faltar a clase o al trabajo, aparece en las relaciones sexuales o fuera de la regla, coméntalo con tu médica o médico: puede haber una causa tratable como la endometriosis.',
      ],
      article: 'dolor-menstrual',
      followUps: ['endometriosis', 'heavyBleeding'],
      // En el embarazo no se aconsejan antiinflamatorios: se responde con la información del embarazo.
      insteadIn: { pregnant: 'pregnancyCramps' },
    },
    {
      id: 'heavyBleeding',
      topic: '¿Mi regla es demasiado abundante?',
      keywords: { 'sangrado abundante': 4, 'regla abundante': 4, 'demasiado abundante': 5, 'muy abundante': 4, 'sangro mucho': 4, 'mucha sangre': 3, coagulo: 3, 'regla muy fuerte': 3, 'cambio la compresa': 2, menorragia: 4, mioma: 3, 'regla larga': 3 },
      answer: [
        'Se considera abundante si cambias la compresa o el tampón cada 1–2 horas, necesitas doble protección, expulsas coágulos más grandes que una moneda, la regla dura más de 8 días o te deja muy cansada.',
        'Es frecuente y tiene tratamiento (ácido tranexámico, DIU hormonal, anticonceptivos…). Pide cita para valorarlo y descartar anemia. Si empapas una compresa cada hora durante 2 horas o te mareas, ve a urgencias.',
      ],
      article: 'sangrado-abundante',
      followUps: ['anemia', 'colors'],
    },
    {
      id: 'endometriosis',
      topic: '¿Qué es la endometriosis?',
      keywords: { endometriosis: 5, adenomiosis: 4, 'dolor pelvico': 3, 'dolor cronico': 2 },
      answer: [
        'La endometriosis es una enfermedad en la que un tejido parecido al endometrio crece fuera del útero y causa inflamación y dolor. Afecta a alrededor de 1 de cada 10 mujeres y personas con útero.',
        'Sus señales típicas son reglas muy dolorosas que no mejoran con analgésicos, dolor en las relaciones, dolor al orinar o defecar durante la regla y dolor pélvico fuera de ella. Si te identificas, registra tus síntomas y llévalos a consulta: el diagnóstico suele retrasarse porque el dolor se normaliza.',
      ],
      article: 'endometriosis',
      followUps: ['cramps'],
    },
    {
      id: 'pcos',
      topic: '¿Qué es el SOP?',
      keywords: { sop: 4, 'ovario poliquistico': 5, 'ovarios poliquisticos': 5, hirsutismo: 4, 'mucho vello': 3, 'exceso de vello': 3, 'resistencia a la insulina': 4 },
      answer: [
        'El síndrome de ovario poliquístico (SOP) afecta a 1 de cada 10 personas con ovarios. Se diagnostica si hay al menos dos de estas tres cosas: ciclos irregulares, signos de exceso de andrógenos (acné, vello, caída de pelo) y ovarios con muchos folículos en la ecografía.',
        'Tiene tratamiento para regular los ciclos, mejorar la piel y ayudar si buscas embarazo, y conviene vigilar el azúcar y el colesterol. Si sospechas que lo tienes, coméntalo con tu médica o médico.',
      ],
      article: 'sop',
      followUps: ['irregular', 'ttc'],
    },
    {
      id: 'anemia',
      topic: '¿Puedo tener anemia?',
      keywords: { anemia: 5, hierro: 4, ferritina: 5, cansancio: 2, cansada: 2, 'sin energia': 2, 'me canso': 2 },
      answer: [
        'Las reglas abundantes son una causa muy frecuente de falta de hierro. Los síntomas son cansancio persistente, palidez, caída del pelo, mareo o falta de aire con el esfuerzo.',
        'Para prevenirla, incluye legumbres, carne, pescado, huevos y verduras de hoja verde con alimentos ricos en vitamina C. Si tienes síntomas, pide un análisis antes de tomar suplementos por tu cuenta.',
      ],
      article: 'anemia',
      followUps: ['heavyBleeding', 'food'],
    },
    {
      id: 'headache',
      topic: '¿Por qué me duele la cabeza con la regla?',
      keywords: { 'dolor de cabeza': 4, migrana: 5, jaqueca: 5, cefalea: 5, 'me duele la cabeza': 4 },
      answer: [
        'La bajada de estrógeno antes de la regla puede desencadenar dolores de cabeza y migrañas. Registra tus dolores en la app para ver si siguen tu ciclo.',
        'Ayudan los horarios regulares de sueño y comidas y beber agua. Si son frecuentes, hay tratamientos preventivos. Si tienes migraña con aura, consulta antes de usar anticonceptivos con estrógeno. Un dolor de cabeza brusco y muy intenso es motivo de urgencias.',
      ],
      article: 'migrana-menstrual',
    },
    {
      id: 'bloating',
      topic: '¿Cómo reduzco la hinchazón?',
      keywords: { hinchazon: 5, hinchada: 4, 'retencion de liquidos': 5, gases: 3, 'barriga hinchada': 5, 'tripa hinchada': 5 },
      answer: [
        'La hinchazón antes y durante la regla es muy común por los cambios hormonales. Suele ayudar reducir la sal y el alcohol, beber agua, comer más fibra poco a poco y moverte a diario.',
        'Si la hinchazón es persistente, no depende del ciclo o viene con saciedad rápida o pérdida de peso, consúltalo.',
      ],
      article: 'alimentacion-ciclo',
    },
    {
      id: 'acne',
      topic: '¿Por qué me salen granos antes de la regla?',
      keywords: { acne: 5, granos: 4, espinillas: 4, 'piel grasa': 3 },
      answer: [
        'Los andrógenos influyen en la grasa de la piel y muchas personas notan brotes antes de la regla. Una limpieza suave, no manipular los granos y usar productos no comedogénicos ayuda.',
        'Si el acné es intenso o viene con ciclos irregulares o exceso de vello, puede tener relación con el SOP: coméntalo. Algunos anticonceptivos también lo mejoran.',
      ],
      article: 'sop',
    },
    {
      id: 'breastPain',
      topic: '¿Por qué me duelen los pechos?',
      keywords: { pechos: 3, senos: 3, 'me duelen las mamas': 6, 'dolor en las mamas': 5, 'mamas sensibles': 5, 'mamas hinchadas': 5, 'pecho sensible': 5, 'me duelen los pechos': 6, 'bulto en el pecho': 6, 'bulto en la mama': 6 },
      answer: [
        'Es frecuente notar los pechos hinchados o sensibles en los días previos a la regla por la progesterona; mejora al empezar el sangrado. Un sujetador cómodo y reducir la cafeína pueden ayudar.',
        'Si notas un bulto, cambios en la piel o el pezón, secreción con sangre o un dolor que no sigue tu ciclo, pide cita para que te exploren.',
      ],
      article: 'sindrome-premenstrual',
    },
    {
      id: 'colors',
      topic: '¿Qué significa el color de mi regla?',
      keywords: { 'color de mi regla': 6, color: 2, 'color de la regla': 5, 'regla marron': 5, 'sangre marron': 5, 'regla negra': 5, 'sangre oscura': 4, 'color de la sangre': 5, 'regla rosa': 4, marron: 3 },
      answer: [
        'El color depende sobre todo del tiempo que la sangre tarda en salir: rojo vivo en los días de más flujo, y marrón u oscuro al principio y al final, porque es sangre más antigua. El rosado suele ser sangre mezclada con flujo.',
        'Consulta si es grisáceo o anaranjado con mal olor o picor (posible infección), o si hay coágulos grandes y frecuentes.',
      ],
      article: 'colores-flujo',
    },
    {
      id: 'spotting',
      topic: '¿Es normal manchar entre reglas?',
      keywords: { manchado: 4, manchar: 4, manchando: 4, 'sangrado entre reglas': 5, 'sangro entre reglas': 5, 'sangrado despues de las relaciones': 5, 'sangrado de implantacion': 5, 'sangrado intermenstrual': 5 },
      answer: [
        'Un manchado leve puede aparecer en la ovulación, en los primeros meses de un anticonceptivo hormonal o tras olvidar alguna toma.',
        'Si se repite, aparece después de las relaciones sexuales, tras la menopausia o no sabes por qué ocurre, conviene consultarlo. Si hay posibilidad de embarazo, haz un test.',
      ],
      article: 'ciclos-irregulares',
      followUps: ['pregnancyTest'],
    },

    // ------------------------------------------------------------ Ciclo
    {
      id: 'cycleBasics',
      topic: '¿Cuáles son las fases del ciclo?',
      keywords: { 'fases del ciclo': 5, 'fase lutea': 4, 'fase folicular': 4, 'ciclo menstrual': 3, 'que es la regla': 4, 'por que tengo la regla': 4, 'como funciona el ciclo': 5 },
      answer: [
        'El ciclo tiene cuatro fases: la menstruación, la fase folicular (sube el estrógeno y madura un óvulo), la ovulación y la fase lútea (la progesterona prepara el útero). Si no hay embarazo, las hormonas bajan y empieza una nueva regla.',
        'La fase lútea suele ser bastante estable (unos 11–17 días); lo que más cambia de un ciclo a otro es la fase folicular. Por eso la ovulación no siempre cae en el día 14.',
      ],
      article: 'ciclo-menstrual',
      followUps: ['fertileWindow'],
    },
    {
      id: 'irregular',
      topic: '¿Por qué tengo ciclos irregulares?',
      keywords: { irregular: 4, irregularidad: 4, 'ciclos irregulares': 4, 'regla irregular': 4, 'cada mes cambia': 2, 'no me viene cuando toca': 4 },
      answer: [
        'En personas adultas, un ciclo normal dura entre 24 y 38 días y puede variar hasta 7–9 días de un mes a otro. En la adolescencia y la perimenopausia es normal que varíe más.',
        'El estrés, los viajes, los cambios de peso, el ejercicio intenso, la lactancia, el SOP o el tiroides pueden alterarlo. Consulta si pasas 3 meses sin regla, si tus ciclos son habitualmente más cortos de 24 días o más largos de 38, o si sangras entre reglas.',
      ],
      article: 'ciclos-irregulares',
      followUps: ['late', 'pcos'],
    },
    {
      id: 'late',
      topic: 'Tengo un retraso, ¿qué hago?',
      keywords: { retraso: 4, 'no me baja': 4, 'no me viene': 4, 'se me ha retrasado': 4, 'no me ha bajado': 4, 'no me ha venido': 4, 'regla atrasada': 4, 'falta la regla': 3 },
      answer: [
        'Si ha habido relaciones sin protección o ha podido fallar tu método, haz un test de embarazo: es fiable desde el primer día de retraso. Si da negativo y la regla no llega, repítelo en 3–5 días.',
        'Los retrasos puntuales también se deben a estrés, viajes, enfermedad o cambios de peso o de ejercicio. Si pasas 3 meses sin regla sin estar embarazada, consúltalo.',
      ],
      article: 'test-embarazo',
      followUps: ['pregnancyTest', 'irregular'],
    },
    {
      id: 'normalPeriod',
      topic: '¿Cuánto dura una regla normal?',
      keywords: { 'regla puede durar': 5, 'puede durar la regla': 5, 'cuanto dura la regla': 5, 'cuantos dias dura la regla': 5, 'regla normal': 4, 'duracion de la regla': 4, 'cuanto sangrado es normal': 5 },
      answer: [
        'Una regla normal dura hasta 8 días; lo más habitual son 3–7. En total se pierden unos 30–80 ml de sangre, aunque parezca más.',
        'Si dura más de 8 días o es tan abundante que interfiere con tu vida, coméntalo con un profesional.',
      ],
      article: 'ciclos-irregulares',
      followUps: ['heavyBleeding'],
    },
    {
      id: 'firstPeriod',
      topic: '¿Cuándo llega la primera regla?',
      keywords: { 'primera regla': 5, menarquia: 5, 'primera menstruacion': 5, 'aun no me ha venido nunca': 5, 'no me ha venido nunca': 5, 'cuando me vendra la regla': 4 },
      answer: [
        'La primera regla suele llegar entre los 10 y los 15 años, unos 2–3 años después de que empiece a crecer el pecho. Un flujo blanquecino unos meses antes es una pista de que se acerca.',
        'Los primeros años es normal que los ciclos sean irregulares. Consulta si a los 15 años no ha llegado, o si el dolor o el sangrado te impiden hacer vida normal.',
      ],
      article: 'primera-regla',
      followUps: ['products'],
    },
    {
      id: 'discharge',
      topic: '¿Es normal mi flujo vaginal?',
      keywords: { flujo: 3, 'flujo vaginal': 4, 'moco cervical': 5, 'clara de huevo': 4, secrecion: 3, 'flujo blanco': 3, 'flujo amarillo': 3, 'flujo transparente': 4 },
      answer: [
        'El flujo cambia a lo largo del ciclo: escaso tras la regla, cremoso después, transparente y elástico como la clara de huevo cerca de la ovulación, y más espeso en la fase lútea. Todo eso es normal.',
        'Consulta si tiene mal olor, un color gris, amarillo verdoso o grumoso con picor, o si viene con dolor o fiebre.',
      ],
      article: 'flujo-vaginal',
      followUps: ['infection', 'fertileWindow'],
    },
    {
      id: 'infection',
      topic: '¿Tengo una infección vaginal o de orina?',
      keywords: { picor: 5, 'picor y flujo': 6, 'flujo con picor': 6, 'flujo y picor': 6, 'me pica': 4, escozor: 4, candidiasis: 5, hongos: 4, 'mal olor': 4, 'olor a pescado': 5, vaginosis: 5, 'infeccion vaginal': 5, 'infeccion de orina': 5, cistitis: 5, 'me escuece al orinar': 5 },
      answer: [
        'El picor con flujo blanco y grumoso suele ser candidiasis; un flujo grisáceo con olor a pescado, vaginosis bacteriana; y el escozor al orinar con ganas frecuentes, una infección de orina.',
        'Todas tienen tratamiento sencillo, pero conviene confirmarlo: pide cita, sobre todo si es la primera vez, estás embarazada, tienes fiebre o dolor lumbar, o se repite. Evita las duchas vaginales.',
      ],
      article: 'higiene-intima',
      followUps: ['sti'],
    },

    // ------------------------------------------------------------ Fertilidad
    {
      id: 'fertileWindow',
      topic: '¿Qué son los días fértiles?',
      keywords: { 'dias fertiles': 2, 'ventana fertil': 3, 'que son los dias fertiles': 6, 'cuantos dias fertiles': 6, fertilidad: 2 },
      answer: [
        'Los días fértiles son los 5 días anteriores a la ovulación y el propio día de la ovulación, porque los espermatozoides pueden vivir hasta 5 días y el óvulo unas 12–24 horas.',
        'Las señales son el flujo transparente y elástico, un test de LH positivo y, después de ovular, la subida de la temperatura basal. Recuerda que las estimaciones no sirven como método anticonceptivo.',
      ],
      article: 'ovulacion',
      followUps: ['ovulationInfo', 'lhTest'],
    },
    {
      id: 'ovulationInfo',
      topic: '¿Cómo sé si estoy ovulando?',
      keywords: { ovulacion: 2, 'que es la ovulacion': 5, 'dolor de ovulacion': 5, 'dolor al ovular': 5, 'sintomas de ovulacion': 5, ovular: 2, 'como se si ovulo': 6, 'como se si estoy ovulando': 6 },
      answer: [
        'La ovulación ocurre unos 14 días antes de la siguiente regla. Algunas señales: flujo como clara de huevo, un leve dolor en un lado de la pelvis, más libido y un test de LH positivo 24–36 horas antes.',
        'La temperatura basal sube tras ovular y lo confirma a posteriori. Si registras temperatura o tests de LH, la app usará esos datos para confirmar tu ovulación.',
      ],
      article: 'ovulacion',
      followUps: ['bbt', 'lhTest'],
    },
    {
      id: 'bbt',
      topic: '¿Cómo mido la temperatura basal?',
      keywords: { 'temperatura basal': 5, termometro: 3, 'tomar la temperatura': 3, bbt: 4, 'subida de temperatura': 4 },
      answer: [
        'Mídela nada más despertar, antes de levantarte, a la misma hora y tras al menos 3 horas de sueño, con un termómetro de dos decimales.',
        'Tras la ovulación sube 0,2–0,5 °C. La app la confirma cuando ve 3 temperaturas seguidas por encima de las 6 anteriores. Marca como «alterada» cualquier medición tras poco sueño, alcohol o fiebre.',
      ],
      article: 'temperatura-basal',
    },
    {
      id: 'lhTest',
      topic: '¿Cómo uso los tests de ovulación?',
      keywords: { 'test de ovulacion': 5, 'tests de ovulacion': 5, 'prueba de ovulacion': 5, lh: 3, 'pico de lh': 5, 'tira de ovulacion': 4 },
      answer: [
        'Detectan el pico de LH, que ocurre 24–36 horas antes de ovular. Empieza unos 17 días antes de tu próxima regla prevista y hazlo cada día a la misma hora, mejor por la tarde.',
        'Un positivo significa que hoy y los dos días siguientes son los más fértiles. Con SOP puede haber falsos positivos.',
      ],
      article: 'test-ovulacion',
    },
    {
      id: 'ttc',
      topic: 'Consejos para buscar embarazo',
      keywords: { 'buscar embarazo': 5, 'buscando embarazo': 5, 'quedarme embarazada': 4, 'quiero quedarme embarazada': 5, 'no me quedo embarazada': 5, concebir: 4, 'consejos para quedarme': 5, infertilidad: 4, 'tratamiento de fertilidad': 4 },
      answer: [
        'Lo más eficaz es tener relaciones cada 2–3 días durante el ciclo, o a diario en la ventana fértil, sin obsesionarse con la hora exacta. Toma ácido fólico desde antes del embarazo, evita tabaco y alcohol y mantén hábitos saludables.',
        'Cada ciclo hay un 20–25 % de probabilidad, y unas 8 de cada 10 parejas lo consiguen en un año. Consulta tras 12 meses (6 si tienes 35 años o más), o antes si tus ciclos son muy irregulares.',
      ],
      article: 'buscar-embarazo',
      followUps: ['folicAcid', 'lhTest'],
    },
    {
      id: 'folicAcid',
      topic: '¿Cuándo tomar ácido fólico?',
      keywords: { 'acido folico': 5, folato: 4, vitaminas: 2, yodo: 3 },
      answer: [
        'Se recomienda tomar 400 microgramos de ácido fólico al día desde al menos un mes antes de buscar embarazo y hasta la semana 12, para prevenir defectos del tubo neural. En algunos casos se indica una dosis mayor.',
        'Consulta a tu profesional sanitario sobre el yodo y otras vitaminas según tu situación.',
      ],
      article: 'buscar-embarazo',
    },
    {
      id: 'pregnancyTest',
      topic: '¿Cuándo hago un test de embarazo?',
      keywords: { 'test de embarazo': 5, 'prueba de embarazo': 5, predictor: 4, 'test positivo': 3, 'test negativo': 3, 'dos rayas': 3, 'linea tenue': 4, 'raya muy clara': 4 },
      answer: [
        'Los tests de orina son fiables desde el primer día de retraso. Si lo haces antes, usa la primera orina de la mañana. Una línea tenue suele ser un positivo: repítelo en 48 horas.',
        'Si da negativo y la regla no llega, repítelo en 3–5 días. Si tus ciclos son irregulares, espera 3 semanas desde la relación de riesgo.',
      ],
      article: 'test-embarazo',
      followUps: ['pregnancyEarly', 'abortion'],
    },
    {
      id: 'sexDuringPeriod',
      topic: '¿Puedo quedarme embarazada con la regla?',
      keywords: { 'relaciones con la regla': 5, 'sexo con la regla': 5, 'embarazada con la regla': 6, 'quedarme embarazada con la regla': 6 },
      answer: [
        'Es poco probable, pero no imposible: si tus ciclos son cortos, podrías ovular pocos días después de la regla, y los espermatozoides sobreviven hasta 5 días.',
        'Tener relaciones con la regla es seguro si ambos queréis. Recuerda que las ITS se transmiten igual, así que el preservativo sigue siendo importante.',
      ],
      article: 'ovulacion',
    },

    // ------------------------------------------------------------ Anticoncepción
    {
      id: 'emergencyContraception',
      topic: '¿Cómo funciona la píldora del día después?',
      keywords: { 'pildora del dia despues': 6, 'dia despues': 4, 'anticoncepcion de urgencia': 5, 'anticoncepcion de emergencia': 5, 'pildora de emergencia': 5, 'se rompio el condon': 5, 'se rompio el preservativo': 5, 'sin proteccion': 3, 'sin condon': 3, poscoital: 4, postcoital: 4 },
      answer: [
        'Tómala cuanto antes: no esperes. La píldora de ulipristal sigue siendo eficaz hasta 5 días (120 horas) después y la de levonorgestrel, hasta 3 días (72 horas). El DIU de cobre, colocado en los 5 días siguientes, es la opción más eficaz.',
        'En España la píldora se vende sin receta en farmacias. No provoca un aborto: retrasa la ovulación. Si vomitas en las 3 horas siguientes necesitas otra dosis, y haz un test si la regla se retrasa más de 7 días.',
      ],
      article: 'anticoncepcion-emergencia',
      followUps: ['missedPill', 'contraceptionMethods'],
    },
    {
      id: 'missedPill',
      topic: 'Me olvidé la píldora, ¿qué hago?',
      keywords: { 'olvide la pastilla': 5, 'olvide la pildora': 5, 'olvido de la pildora': 5, 'olvidado la pildora': 5, 'olvidado la pastilla': 5, 'me salte la pastilla': 5, 'se me olvido la': 4, 'vomite la pastilla': 5, 'vomite la pildora': 5, 'tome tarde la pildora': 5 },
      answer: [
        'Con la píldora combinada: si solo es una (menos de 48 h), tómala en cuanto te acuerdes, aunque sean dos a la vez, y sigue igual. Si son dos o más, toma la última, usa preservativo 7 días y, si fue en la tercera semana, empalma el siguiente blíster sin descanso.',
        'Si el olvido fue en la primera semana y hubo relaciones sin protección, valora la anticoncepción de urgencia. Con la minipíldora el margen es de 12 horas (desogestrel) o 3 horas (otras). Revisa siempre tu prospecto.',
      ],
      article: 'olvido-pildora',
      followUps: ['emergencyContraception'],
    },
    {
      id: 'contraceptionMethods',
      topic: '¿Qué método anticonceptivo me conviene?',
      keywords: { anticonceptivo: 3, 'metodo anticonceptivo': 4, 'metodos anticonceptivos': 4, diu: 4, implante: 3, 'anillo vaginal': 4, parche: 3, 'inyeccion anticonceptiva': 4, preservativo: 2, condon: 2, 'que metodo': 2 },
      answer: [
        'Los más eficaces son el implante y los DIU (menos de 1 embarazo por cada 100 personas al año). La píldora, el parche y el anillo rondan 7 de cada 100 con el uso habitual, y el preservativo unos 13, aunque es el único que protege de las ITS.',
        'La mejor opción depende de tu salud, tus preferencias y si quieres evitar hormonas o estrógenos. Tu centro de salud o de planificación familiar te ayudará a elegir.',
      ],
      article: 'metodos-anticonceptivos',
      followUps: ['pillBleeding', 'sti'],
    },
    {
      id: 'pillBleeding',
      topic: '¿Es normal sangrar con la píldora?',
      keywords: { 'sangrar con la pildora': 6, 'sangro con la pildora': 6, 'sangrado con la pildora': 5, 'manchado con la pildora': 5, 'sangrado por privacion': 5, 'regla con la pildora': 4, 'semana de descanso': 4, 'saltarme el descanso': 4, 'sin descanso': 3 },
      answer: [
        'Con la píldora no hay una regla natural: el sangrado de la semana de descanso es un sangrado por privación. Los primeros 3 meses es frecuente tener manchados entre tomas; suelen mejorar.',
        'Muchas pautas permiten saltarse el descanso de forma segura. Si el manchado persiste, aparece de repente tras meses sin él o hay dolor, consulta y descarta olvidos, interacciones o una infección.',
      ],
      article: 'metodos-anticonceptivos',
    },
    {
      id: 'sti',
      topic: '¿Cómo sé si tengo una ITS?',
      keywords: { its: 4, ets: 4, 'enfermedad de transmision sexual': 5, 'infeccion de transmision sexual': 5, clamidia: 5, gonorrea: 5, vph: 5, papiloma: 4, herpes: 4, sifilis: 5, vih: 5, sida: 5, citologia: 4 },
      answer: [
        'Muchas infecciones de transmisión sexual no dan síntomas, así que la única forma de saberlo es hacerse pruebas, sobre todo con una pareja nueva. Pueden dar flujo anormal, llagas, verrugas, dolor al orinar o sangrado tras las relaciones.',
        'El preservativo protege de la mayoría, la vacuna del VPH previene la mayoría de cánceres de cuello de útero, y si hubo un riesgo de VIH existe una profilaxis que debe empezar en las primeras 72 horas.',
      ],
      article: 'its',
    },

    // ------------------------------------------------------------ Productos
    {
      id: 'products',
      topic: '¿Qué producto menstrual me conviene?',
      keywords: { tampon: 3, tampones: 3, compresa: 3, compresas: 3, copa: 4, 'copa menstrual': 5, 'braga menstrual': 5, 'bragas menstruales': 5, 'disco menstrual': 5, 'producto menstrual': 4 },
      answer: [
        'No hay uno mejor para todas: las compresas son las más sencillas; los tampones, cómodos para hacer deporte (cámbialos cada 4–8 horas); la copa y el disco, reutilizables y de larga duración; y las bragas menstruales, muy cómodas.',
        'Usa la menor absorción que necesites y, si llevas DIU, rompe el vacío antes de retirar la copa.',
      ],
      article: 'productos-menstruales',
      followUps: ['tss'],
    },
    {
      id: 'tss',
      topic: '¿Qué es el síndrome del shock tóxico?',
      keywords: { 'shock toxico': 6, 'choque toxico': 6, 'sindrome de shock': 5 },
      answer: [
        'Es una reacción muy rara pero grave a toxinas bacterianas, relacionada con el uso prolongado de tampones. Da fiebre alta repentina, vómitos, diarrea, erupción parecida a una quemadura solar y mareo.',
        'Para prevenirlo, usa la absorción más baja que necesites y cambia el tampón cada 4–8 horas. Si tienes esos síntomas, retíralo y ve a urgencias.',
      ],
      article: 'shock-toxico',
    },

    // ------------------------------------------------------------ Ánimo y bienestar
    {
      id: 'pms',
      topic: '¿Por qué cambia mi ánimo antes de la regla?',
      keywords: { 'sindrome premenstrual': 5, spm: 4, premenstrual: 4, 'antes de la regla': 3, 'antes de que me baje': 3, tdpm: 5, 'cambios de humor': 3, irritable: 2, 'me pongo triste': 3, animo: 2 },
      answer: [
        'En la fase lútea algunas personas son más sensibles a los cambios de estrógeno y progesterona: irritabilidad, tristeza, ansiedad, hinchazón o antojos que desaparecen al llegar la regla.',
        'Ayudan el ejercicio regular, dormir bien, reducir cafeína, sal y alcohol, y técnicas para el estrés. Si los síntomas afectan mucho a tu vida, puede ser un trastorno disfórico premenstrual (TDPM), que tiene tratamiento eficaz.',
      ],
      article: 'sindrome-premenstrual',
      followUps: ['mood'],
    },
    {
      id: 'mood',
      topic: 'Me siento triste o ansiosa',
      keywords: { 'estado de animo': 3, triste: 3, ansiedad: 3, ansiosa: 3, deprimida: 4, depresion: 4, estres: 2, estresada: 3, 'sin ganas de nada': 3 },
      answer: [
        'Siento que te sientas así. 💜 El ciclo puede influir en el ánimo, y registrar cómo te sientes te ayudará a ver si hay un patrón.',
        'Cuidarte con sueño, movimiento y apoyo de personas de confianza ayuda. Si la tristeza o la ansiedad duran más de dos semanas o te impiden hacer tu vida, pide ayuda profesional; no tienes que pasarlo sola.',
      ],
      article: 'animo-ciclo',
      followUps: ['pms', 'sleep'],
    },
    {
      id: 'libido',
      topic: 'Tengo poco deseo sexual, ¿es normal?',
      keywords: { libido: 5, 'deseo sexual': 5, 'ganas de sexo': 4, 'sin ganas de sexo': 5, 'no tengo ganas': 3 },
      answer: [
        'El deseo varía a lo largo del ciclo (suele subir cerca de la ovulación) y también con el estrés, el cansancio, algunos anticonceptivos o antidepresivos, el posparto y la menopausia.',
        'Si te preocupa o hay dolor en las relaciones, coméntalo: la sequedad y el dolor tienen tratamiento.',
      ],
      article: 'animo-ciclo',
    },
    {
      id: 'sleep',
      topic: 'Duermo mal, ¿qué puedo hacer?',
      keywords: { insomnio: 5, 'duermo mal': 5, 'no puedo dormir': 5, dormir: 3, sueno: 3, 'me despierto': 3 },
      answer: [
        'Antes de la regla y en la menopausia es frecuente dormir peor. Ayudan los horarios regulares, un dormitorio fresco y oscuro, evitar pantallas, cafeína y alcohol por la noche y moverte durante el día.',
        'Si llevas semanas durmiendo mal, la terapia cognitivo-conductual para el insomnio es muy eficaz. Consulta también si roncas mucho o te despiertas sin aire.',
      ],
      article: 'sueno',
    },
    {
      id: 'food',
      topic: '¿Qué comer durante la regla?',
      keywords: { 'que comer': 4, alimentacion: 4, dieta: 3, antojos: 4, chocolate: 3, nutricion: 4 },
      answer: [
        'Durante la regla ayudan los alimentos ricos en hierro (legumbres, carne, pescado, huevos, verduras de hoja verde) con vitamina C. Antes de la regla es normal tener más hambre: elige hidratos integrales y frutos secos.',
        'Evita las dietas muy restrictivas: la falta de energía puede hacer que desaparezca la regla.',
      ],
      article: 'alimentacion-ciclo',
    },
    {
      id: 'exercise',
      topic: '¿Puedo hacer deporte con la regla?',
      keywords: { 'deporte con la regla': 5, 'ejercicio con la regla': 5, 'nadar con la regla': 5, 'piscina con la regla': 5, 'banarme con la regla': 5, ejercicio: 2, deporte: 2 },
      answer: [
        '¡Sí! El ejercicio suele aliviar el dolor y mejorar el ánimo. Adapta la intensidad a cómo te sientas. Puedes nadar sin problema con tampón o copa.',
        'Si entrenas mucho y se te retira la regla, consulta: puede deberse a falta de energía.',
      ],
      article: 'ejercicio-ciclo',
    },
    {
      id: 'pelvicFloor',
      topic: '¿Cómo fortalezco el suelo pélvico?',
      keywords: { 'suelo pelvico': 5, 'perdidas de orina': 5, incontinencia: 5, kegel: 5, 'se me escapa el pis': 5 },
      answer: [
        'Contrae los músculos que usarías para cortar el pis y retener un gas, mantén 5–10 segundos y relaja otros tantos. Haz 10 repeticiones, 3 veces al día, sin contener la respiración.',
        'Tras el parto o en la menopausia, una fisioterapeuta de suelo pélvico puede ayudarte mucho. Las pérdidas de orina son frecuentes, pero no son normales ni tienes que aguantarlas.',
      ],
      article: 'posparto',
    },
    {
      id: 'ovarianCyst',
      topic: '¿Qué es un quiste de ovario?',
      keywords: { quiste: 4, 'quiste de ovario': 6, 'quistes en los ovarios': 6 },
      answer: [
        'La mayoría de los quistes de ovario son funcionales: se forman con la ovulación y desaparecen solos en uno o dos ciclos. Suelen descubrirse por casualidad en una ecografía.',
        'Consulta con urgencia ante un dolor pélvico intenso y repentino, sobre todo con náuseas o vómitos, porque un quiste puede romperse o torsionar el ovario.',
      ],
    },

    // ------------------------------------------------------------ Embarazo y posparto
    {
      id: 'pregnancyEarly',
      topic: '¿Qué hago al saber que estoy embarazada?',
      keywords: { 'estoy embarazada': 3, 'primeras semanas de embarazo': 5, 'recien embarazada': 5, 'primer trimestre': 4, 'acabo de saber que estoy embarazada': 6 },
      answer: [
        'Las semanas se cuentan desde el primer día de tu última regla. Pide cita con tu centro de salud o matrona, toma ácido fólico y evita alcohol, tabaco y cualquier medicamento sin consultarlo.',
        'Si quieres, activa el modo embarazo en Ajustes → Modo de uso para seguir tu embarazo semana a semana. Si no deseas continuar el embarazo, también puedes informarte en tu centro de salud.',
      ],
      article: 'embarazo-inicio',
      followUps: ['pregnancyWarning', 'nausea'],
    },
    {
      id: 'nausea',
      topic: '¿Cómo alivio las náuseas del embarazo?',
      keywords: { nauseas: 4, vomitos: 3, 'mareos del embarazo': 5, 'nauseas del embarazo': 6, hiperemesis: 5, 'no retengo nada': 5, 'ganas de vomitar': 4 },
      answer: [
        'Suelen mejorar con comidas pequeñas y frecuentes, alimentos secos (galletas, tostadas) al despertar, evitar olores fuertes y beber a sorbos entre comidas. El jengibre puede ayudar.',
        'Consulta si no retienes líquidos, orinas muy poco, pierdes peso o te mareas al levantarte: puede ser una hiperémesis y tiene tratamiento.',
      ],
      article: 'embarazo-inicio',
    },
    {
      id: 'pregnancyCramps',
      topic: '¿Es normal tener dolor en el embarazo?',
      keywords: { 'dolor en el embarazo': 6, 'dolores en el embarazo': 6, 'colicos en el embarazo': 6, 'molestias en el embarazo': 5, 'dolor de tripa en el embarazo': 6, 'dolor abdominal en el embarazo': 6, 'tirantez en la tripa': 4 },
      answer: [
        'Al principio del embarazo son frecuentes unas molestias leves, como tirantez o pinchazos suaves en la parte baja de la tripa, mientras el útero crece. Descansar, cambiar de postura o un baño templado (no caliente) pueden aliviarlas.',
        'Si necesitas un analgésico, pregunta antes a tu matrona, médica o farmacéutica: en el embarazo se suele usar paracetamol y no se recomiendan el ibuprofeno ni otros antiinflamatorios salvo indicación médica. Acude a urgencias si el dolor es fuerte, no se calma, es de un solo lado o viene con sangrado, fiebre, mareo o pérdida de líquido.',
      ],
      article: 'embarazo-alarma',
      followUps: ['pregnancyWarning'],
    },
    {
      id: 'pregnancyWarning',
      topic: 'Señales de alarma en el embarazo',
      keywords: { 'embarazada y sangro': 6, 'embarazada y tengo sangrado': 6, 'sangrado en el embarazo': 6, 'sangrado embarazada': 5, 'senales de alarma': 5, 'sintomas de alarma': 5, preeclampsia: 5, 'urgencias embarazo': 5, 'cuando ir a urgencias': 5, 'hinchazon de manos': 4, 'movimientos del bebe': 4, 'bebe se mueve': 4 },
      answer: [
        'Acude a urgencias ante sangrado, dolor abdominal intenso, pérdida de líquido, fiebre, dolor de cabeza fuerte con visión borrosa o hinchazón brusca, contracciones regulares antes de la semana 37 o si tu bebé se mueve menos.',
        'También si tienes picor intenso en manos y pies, vómitos que no te dejan beber o pensamientos de hacerte daño. Ante la duda, consulta.',
      ],
      article: 'embarazo-alarma',
      followUps: ['contractions'],
    },
    {
      id: 'contractions',
      topic: '¿Cómo sé si estoy de parto?',
      keywords: { contracciones: 4, 'contar contracciones': 5, patadas: 4, pataditas: 4, braxton: 5, 'trabajo de parto': 5, 'estoy de parto': 5 },
      answer: [
        'Las contracciones de parto se vuelven regulares, más largas e intensas y no ceden con el reposo. Una orientación habitual: cada 5 minutos, de 1 minuto, durante 1 hora. Sigue las indicaciones de tu maternidad.',
        'En Herramientas de embarazo tienes un contador de contracciones y de movimientos del bebé.',
      ],
      article: 'embarazo-alarma',
    },
    {
      id: 'miscarriage',
      topic: 'He tenido una pérdida gestacional',
      keywords: { 'aborto espontaneo': 6, 'perdida gestacional': 6, 'perdi el embarazo': 6, 'perdi al bebe': 6, 'he tenido un aborto': 5, 'embarazo ectopico': 5, ectopico: 4 },
      answer: [
        'Lo siento muchísimo. 💜 Perder un embarazo es muy duro, y no es culpa tuya: casi siempre se debe a causas cromosómicas, no a algo que hicieras.',
        'Después, el sangrado puede durar hasta 2 semanas y la regla suele volver en 4–6. Acude a urgencias si el sangrado es muy abundante, tienes fiebre o dolor intenso. Date tiempo, y pide apoyo si lo necesitas.',
      ],
      article: 'perdida-gestacional',
    },
    {
      id: 'abortion',
      topic: '¿Dónde me informo sobre la interrupción del embarazo?',
      keywords: { 'interrupcion del embarazo': 6, 'interrumpir el embarazo': 6, 'interrupcion voluntaria': 6, ive: 4, 'no quiero estar embarazada': 5, 'no quiero seguir con el embarazo': 6, abortar: 5 },
      answer: [
        'Es una decisión tuya y puedes informarte sin compromiso. En España la interrupción voluntaria del embarazo es legal a petición hasta la semana 14 y se ofrece en la sanidad pública; los plazos y requisitos varían en otros países.',
        'Pide información en tu centro de salud, en un centro de salud sexual o de planificación familiar. Cuanto antes consultes, más opciones tendrás.',
      ],
      article: 'test-embarazo',
    },
    {
      id: 'postpartumBleeding',
      topic: '¿Cuánto dura el sangrado tras el parto?',
      // "Cuarentena" sola es una pista débil (también se usa por enfermedades): necesita otra palabra.
      keywords: { loquios: 5, 'sangrado tras el parto': 6, 'sangrado despues del parto': 6, 'sangrado en la cuarentena': 6, 'sangrar en la cuarentena': 6, 'sangro en la cuarentena': 6, 'cuarentena del parto': 5, 'cuarentena posparto': 5, cuarentena: 1, puerperio: 5, posparto: 3, postparto: 3 },
      answer: [
        'Los loquios duran hasta unas 6 semanas: empiezan rojos y abundantes y se van aclarando a rosado, marrón y amarillento.',
        'Acude a urgencias si empapas una compresa en una hora o menos, expulsas coágulos grandes, el sangrado aumenta de nuevo o tienes fiebre o mal olor.',
      ],
      article: 'posparto',
      followUps: ['breastfeedingFertility', 'postpartumMood'],
    },
    {
      id: 'breastfeedingFertility',
      topic: '¿Me puedo quedar embarazada con lactancia?',
      keywords: { lactancia: 4, 'dando el pecho': 4, amamantar: 4, mela: 5, 'lactancia materna': 4, 'embarazada con lactancia': 6 },
      answer: [
        'Sí, puedes. La lactancia solo protege si tu bebé tiene menos de 6 meses, toma solo pecho día y noche y no te ha vuelto la regla. Si falla algo, podrías ovular antes de la primera regla.',
        'La minipíldora, el DIU, el implante y el preservativo son compatibles con la lactancia.',
      ],
      article: 'lactancia-fertilidad',
    },
    {
      id: 'postpartumMood',
      topic: 'Me siento mal tras el parto',
      keywords: { 'mal tras el parto': 5, 'mal despues del parto': 5, 'triste tras el parto': 6, 'depresion posparto': 6, 'depresion postparto': 6, 'baby blues': 5, 'tristeza posparto': 6, 'no quiero a mi bebe': 5, 'me siento mala madre': 5 },
      answer: [
        'Es muy frecuente sentir altibajos y llanto fácil las primeras 2 semanas. Si la tristeza, la ansiedad o la falta de ilusión duran más, podría ser una depresión posparto, que afecta a más de 1 de cada 10 personas.',
        'No es culpa tuya ni te hace peor madre, y tiene tratamiento. Habla con tu matrona o médica. Si tienes pensamientos de hacerte daño a ti o a tu bebé, pide ayuda urgente (024 o 112).',
      ],
      article: 'salud-mental-perinatal',
    },

    // ------------------------------------------------------------ Menopausia
    {
      id: 'menopause',
      topic: '¿Qué es la perimenopausia?',
      keywords: { menopausia: 4, perimenopausia: 5, climaterio: 5, 'ultima regla': 3, 'terapia hormonal': 4, thm: 4, 'reemplazo hormonal': 4 },
      answer: [
        'La perimenopausia son los años previos a la última regla, con ciclos cambiantes, sofocos, peor sueño o cambios de ánimo. La menopausia se confirma tras 12 meses sin regla y llega de media hacia los 51 años.',
        'La terapia hormonal es el tratamiento más eficaz para los síntomas y, para muchas personas, sus beneficios superan los riesgos; también hay opciones sin hormonas. Sigue usando anticoncepción hasta 2 años después de la última regla si ocurre antes de los 50, o hasta 1 año después si ocurre a partir de los 50 (si usas un método hormonal, pregunta a tu médica cuándo dejarlo).',
      ],
      article: 'menopausia',
      followUps: ['hotFlashes', 'dryness'],
    },
    {
      id: 'hotFlashes',
      topic: '¿Cómo alivio los sofocos?',
      keywords: { sofocos: 5, sofoco: 5, calores: 4, 'sudores nocturnos': 5, bochornos: 5 },
      answer: [
        'Viste por capas, mantén el dormitorio fresco, ten agua fría cerca y detecta tus desencadenantes (alcohol, picante, cafeína, estrés). La respiración lenta y la terapia cognitivo-conductual reducen su impacto.',
        'Si afectan a tu vida, la terapia hormonal y algunos fármacos sin hormonas son eficaces: coméntalo con tu médica o médico.',
      ],
      article: 'sofocos',
      followUps: ['sleep'],
    },
    {
      id: 'dryness',
      topic: 'Tengo sequedad vaginal',
      keywords: { 'sequedad vaginal': 6, sequedad: 4, 'me duele al tener relaciones': 4, 'dolor en las relaciones': 4, dispareunia: 5, lubricante: 4 },
      answer: [
        'La sequedad vaginal es muy común en la menopausia, la lactancia y con algunos tratamientos. Los hidratantes vaginales regulares y los lubricantes ayudan.',
        'Los estrógenos vaginales a dosis bajas son muy eficaces y seguros para la mayoría. El dolor en las relaciones siempre merece consulta: tiene solución.',
      ],
      article: 'salud-vaginal-menopausia',
    },
    {
      id: 'bones',
      topic: '¿Cómo cuido mis huesos?',
      keywords: { osteoporosis: 5, huesos: 3, calcio: 3, 'vitamina d': 4 },
      answer: [
        'Tras la menopausia los huesos pierden densidad más deprisa. Ayudan el ejercicio de fuerza e impacto, suficiente calcio y vitamina D, no fumar y moderar el alcohol.',
        'Pregunta en tu centro de salud si te conviene una densitometría según tus factores de riesgo.',
      ],
      article: 'huesos-corazon',
    },

    // ------------------------------------------------------------ Sobre la app
    {
      id: 'appPrivacy',
      topic: '¿Quién puede ver mis datos?',
      keywords: { privacidad: 4, 'mis datos': 3, 'quien ve': 3, cifrado: 4, 'es segura': 3, 'vendeis datos': 5, 'venden mis datos': 5 },
      answer: [
        'Solo tú. Tus datos se cifran con AES-256 en tu dispositivo y se desbloquean con tu PIN, contraseña o biometría. No hay cuentas, anuncios ni rastreadores, y nunca vendemos datos.',
        'La sincronización, los recordatorios en la nube y los enlaces para compartir son opcionales y van cifrados de extremo a extremo. Puedes exportarlo o borrarlo todo en Ajustes → Tus datos.',
      ],
    },
    {
      id: 'appHowTo',
      topic: '¿Cómo registro mi regla?',
      keywords: { 'como registro': 5, 'como apunto': 5, 'registrar la regla': 5, 'marcar la regla': 5, 'como uso la app': 5, 'como funciona la app': 5 },
      answer: [
        'En Hoy pulsa «Me ha venido la regla», o toca el botón + para abrir el registro completo del día. En el Calendario puedes pulsar «Editar regla» y marcar varios días seguidos.',
        'Cuantos más días registres (flujo, síntomas, ánimo), mejores serán tus predicciones y tus patrones.',
      ],
    },
    {
      id: 'predictions',
      topic: '¿Son fiables las predicciones?',
      keywords: { prediccion: 4, predicciones: 4, fiable: 3, 'se equivoca': 4, 'por que cambia la fecha': 5 },
      answer: [
        'La app calcula tus predicciones con tus propios ciclos, dando más peso a los recientes, y te muestra un margen y un nivel de confianza. Con 3–4 ciclos registrados suelen ser bastante precisas si eres regular.',
        'Aun así, son estimaciones: el estrés o una enfermedad pueden adelantar o retrasar la regla. Y nunca deben usarse como método anticonceptivo.',
      ],
    },
  ],

  smalltalk: {
    hello: { keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey', 'holi'], answer: ['¡Hola {name}! 🌙 ¿En qué puedo ayudarte hoy?'] },
    thanks: { keywords: ['gracias', 'muchas gracias', 'genial', 'perfecto', 'vale gracias'], answer: ['¡De nada! Aquí estoy para lo que necesites. 💜'] },
    bye: { keywords: ['adios', 'hasta luego', 'chao', 'nos vemos', 'buenas noches'], answer: ['¡Hasta pronto! Cuídate mucho. 🌙'] },
    howAreYou: { keywords: ['como estas', 'que tal estas'], answer: ['¡Muy bien, gracias por preguntar! ¿Y tú? Si quieres, cuéntame cómo te sientes hoy o pregúntame lo que necesites.'] },
    who: { keywords: ['quien eres', 'que eres', 'eres una persona', 'eres real', 'que puedes hacer', 'como funcionas'], answer: ['Soy Luna, una asistente que funciona dentro de la app, sin conexión y sin enviar nada. Respondo con información de salud revisada y con tus propios datos, pero no soy una persona ni una médica.', 'Pregúntame por tu próxima regla, tus días fértiles, síntomas, anticoncepción, embarazo o menopausia.'] },
    love: { keywords: ['te quiero', 'eres genial', 'me encantas', 'eres la mejor'], answer: ['¡Qué bonito! 💜 Me alegra poder acompañarte.'] },
  },

  fallback: [
    'No estoy segura de haberte entendido. ¿Puedes decirlo con otras palabras?',
    'Puedo ayudarte con tu próxima regla, días fértiles, cólicos, retrasos, anticoncepción, embarazo, posparto o menopausia. También puedes buscar en la sección Aprende.',
  ],

  disclaimer: 'ℹ️ Información orientativa: no sustituye la valoración de un profesional sanitario.',
};
