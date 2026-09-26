// Biblioteca educativa (español). Fuentes de referencia: OMS, FIGO (2018), NHS, ACOG, SEGO,
// FSRH y guías NICE. Tono informativo, sin juicios y sin diagnósticos.
// Los ids de artículos y categorías son comunes a todos los idiomas (tests de integridad).

/** @type {import('../views/learn.js').Library} */
export default {
  categories: [
    { id: 'ciclo', title: 'Tu ciclo', icon: 'calendar', desc: 'Fases, ovulación y qué es normal' },
    { id: 'dolor', title: 'Dolor y síntomas', icon: 'activity', desc: 'Dolor menstrual, sangrado abundante y afecciones frecuentes' },
    { id: 'productos', title: 'Productos e higiene', icon: 'droplets', desc: 'Compresas, tampones, copas y cuidados' },
    { id: 'fertilidad', title: 'Fertilidad', icon: 'sprout', desc: 'Buscar embarazo, señales de fertilidad y tests' },
    { id: 'anticoncepcion', title: 'Anticoncepción', icon: 'shield', desc: 'Métodos, olvidos y anticoncepción de urgencia' },
    { id: 'embarazo', title: 'Embarazo y posparto', icon: 'baby', desc: 'Señales de alarma, pérdidas y recuperación' },
    { id: 'menopausia', title: 'Menopausia', icon: 'leaf', desc: 'Perimenopausia, síntomas y salud a largo plazo' },
    { id: 'bienestar', title: 'Bienestar', icon: 'heart-pulse', desc: 'Ánimo, alimentación, ejercicio y sueño' },
    { id: 'mitos', title: 'Mitos y realidades', icon: 'badge-check', desc: 'Lo que se dice y lo que sabemos' },
  ],

  articles: [
    // ---------------------------------------------------------------- Tu ciclo
    {
      id: 'ciclo-menstrual',
      category: 'ciclo',
      title: 'Las fases de tu ciclo',
      summary: 'Qué pasa en tu cuerpo desde que empieza una regla hasta la siguiente.',
      keywords: ['ciclo', 'fases', 'folicular', 'lutea', 'hormonas', 'estrogeno', 'progesterona', 'dia 1'],
      modes: ['track', 'conceive', 'avoid'],
      body: [
        {
          p: 'El ciclo menstrual va desde el primer día de sangrado (día 1) hasta el día anterior a la siguiente regla. En personas adultas suele durar entre 24 y 38 días, y es normal que varíe un poco de un mes a otro.',
        },
        { h: '1. Menstruación' },
        {
          p: 'El endometrio (la capa interna del útero) se desprende y sale como sangrado, normalmente durante 2 a 8 días. Las hormonas están bajas, por eso es frecuente sentir cansancio.',
        },
        { h: '2. Fase folicular' },
        {
          p: 'Los ovarios preparan varios folículos y uno madura. Sube el estrógeno, el endometrio se engrosa y muchas personas notan más energía y mejor ánimo. Es la fase cuya duración más varía.',
        },
        { h: '3. Ovulación' },
        {
          p: 'Un pico de la hormona LH hace que el óvulo salga del ovario. El óvulo vive 12–24 horas y los espermatozoides hasta 5 días, por eso los días fértiles son los 5 anteriores a la ovulación y el propio día.',
        },
        { h: '4. Fase lútea' },
        {
          p: 'El folículo vacío (cuerpo lúteo) produce progesterona, que sube la temperatura basal y prepara el útero. Si no hay embarazo, las hormonas bajan y llega la regla. Dura unos 11–17 días, bastante estable en cada persona.',
        },
        {
          ul: [
            'Con anticonceptivos hormonales no hay ovulación ni fases naturales: el sangrado del descanso es un «sangrado por privación».',
            'Tus registros permiten a la app estimar tus propias fases, no las de una media.',
          ],
        },
      ],
      related: ['ovulacion', 'ciclos-irregulares', 'sindrome-premenstrual'],
    },
    {
      id: 'ciclos-irregulares',
      category: 'ciclo',
      title: 'Ciclos irregulares: qué es normal',
      summary: 'Los rangos normales, las causas más frecuentes de irregularidad y cuándo consultar.',
      keywords: ['irregular', 'retraso', 'no me baja', 'amenorrea', 'ciclo corto', 'ciclo largo', 'normal', 'variacion'],
      modes: ['track', 'conceive', 'perimenopause'],
      body: [
        {
          p: 'Según la Federación Internacional de Ginecología y Obstetricia (FIGO), en personas adultas un ciclo normal dura entre 24 y 38 días, la regla hasta 8 días, y la diferencia entre el ciclo más corto y el más largo no supera 7–9 días.',
        },
        { p: 'En los primeros años tras la primera regla y en la perimenopausia es habitual que los ciclos sean más variables (21–45 días en la adolescencia).' },
        { h: 'Causas frecuentes' },
        {
          ul: [
            'Estrés, viajes, cambios de horario o enfermedad.',
            'Pérdida o ganancia de peso, dietas restrictivas o ejercicio muy intenso.',
            'Lactancia y los meses tras un parto.',
            'Síndrome de ovario poliquístico (SOP) o alteraciones del tiroides o de la prolactina.',
            'Cambios o inicio de anticonceptivos hormonales.',
            'Embarazo: si hay posibilidad, haz un test.',
          ],
        },
        { p: 'Un ciclo irregular aislado no suele ser preocupante. Lo importante es el patrón: por eso ayuda registrar varios meses.' },
      ],
      consult: [
        'Pasas 3 meses o más sin regla sin estar embarazada ni en lactancia.',
        'Tus ciclos duran menos de 24 días o más de 38 de forma habitual.',
        'Tienes sangrados entre reglas o después de las relaciones sexuales.',
        'Además tienes acné intenso, exceso de vello o cambios de peso sin explicación.',
      ],
      related: ['sop', 'test-embarazo', 'primera-regla'],
    },
    {
      id: 'colores-flujo',
      category: 'ciclo',
      title: 'El color de la regla: qué significa',
      summary: 'Del rojo vivo al marrón: la mayoría de colores son normales. Te contamos cuáles vigilar.',
      keywords: ['color', 'marron', 'negro', 'rosa', 'oscuro', 'coagulos', 'gris', 'naranja'],
      body: [
        { p: 'El color de la sangre menstrual depende sobre todo de cuánto tiempo ha pasado desde que se desprendió: cuanto más tarda en salir, más se oxida y más oscura se ve.' },
        {
          ul: [
            'Rojo vivo: sangrado reciente, típico de los días de más flujo.',
            'Rojo oscuro o granate: sangre que ha estado un poco más en el útero, frecuente al despertar.',
            'Marrón o casi negro: sangre antigua, habitual al principio y al final de la regla.',
            'Rosado: sangre mezclada con flujo; frecuente en reglas ligeras o en el manchado de ovulación.',
            'Anaranjado o grisáceo: puede deberse a una infección (como la vaginosis), sobre todo si hay mal olor o picor.',
          ],
        },
        { h: 'Coágulos' },
        {
          p: 'Los coágulos pequeños son normales en los días abundantes. Si son grandes (más que una moneda de 2 cm) y frecuentes, puede tratarse de un sangrado abundante que conviene consultar.',
        },
      ],
      consult: [
        'Flujo gris, verdoso o con mal olor, picor o fiebre.',
        'Coágulos grandes y repetidos, o sangrado que empapa una compresa cada hora.',
        'Cualquier sangrado durante el embarazo o tras la menopausia.',
      ],
      related: ['sangrado-abundante', 'flujo-vaginal'],
    },
    {
      id: 'flujo-vaginal',
      category: 'ciclo',
      title: 'El flujo vaginal a lo largo del ciclo',
      summary: 'El flujo cambia con tus hormonas y es una señal útil de fertilidad y de salud.',
      keywords: ['flujo', 'moco cervical', 'clara de huevo', 'secrecion', 'picor', 'mal olor', 'candidiasis', 'hongos'],
      modes: ['conceive', 'avoid', 'track'],
      body: [
        { p: 'El flujo vaginal mantiene la vagina limpia y protegida. Su cantidad y textura cambian con el ciclo:' },
        {
          ul: [
            'Tras la regla: poco flujo o sensación seca.',
            'Fase folicular: flujo pegajoso o cremoso, blanquecino.',
            'Cerca de la ovulación: abundante, transparente y elástico como la clara de huevo. Es el más fértil.',
            'Fase lútea: vuelve a ser más espeso y escaso.',
          ],
        },
        { h: 'Cuándo puede ser una infección' },
        {
          ul: [
            'Blanco y grumoso con picor intenso: suele ser candidiasis (hongos).',
            'Gris o blanquecino, fino y con olor a pescado: vaginosis bacteriana.',
            'Amarillo-verdoso, espumoso o con dolor: puede ser una infección de transmisión sexual.',
          ],
        },
        { p: 'Registrar el tipo de flujo en «Fertilidad» ayuda a identificar tu ventana fértil y a detectar cambios.' },
      ],
      consult: ['Flujo con mal olor, color anormal, picor o escozor.', 'Dolor pélvico, fiebre o dolor en las relaciones.', 'Si estás embarazada y notas pérdida de líquido.'],
      related: ['ovulacion', 'higiene-intima', 'its'],
    },
    {
      id: 'ovulacion',
      category: 'ciclo',
      title: 'Ovulación y ventana fértil',
      summary: 'Cuándo ovulas, cuántos días son fértiles y cómo reconocer las señales.',
      keywords: ['ovulacion', 'fertil', 'dias fertiles', 'ventana fertil', 'ovulo', 'dolor ovulacion', 'lh'],
      modes: ['conceive', 'avoid', 'track'],
      body: [
        {
          p: 'La ovulación ocurre, de media, unos 14 días antes de la siguiente regla, no necesariamente el día 14 del ciclo. En un ciclo de 32 días, por ejemplo, suele ser hacia el día 18.',
        },
        { p: 'La ventana fértil dura unos 6 días: los 5 anteriores a la ovulación y el propio día. Los días de mayor probabilidad son los 2 anteriores y el de la ovulación.' },
        { h: 'Señales que puedes observar' },
        {
          ul: [
            'Flujo transparente y elástico (clara de huevo).',
            'Test de LH positivo: la ovulación suele ocurrir 24–36 horas después.',
            'Subida de la temperatura basal de 0,2–0,5 °C después de ovular (lo confirma a posteriori).',
            'Dolor leve en un lado de la pelvis o aumento de la libido.',
          ],
        },
        {
          p: 'La app estima tu ovulación con tus ciclos anteriores y la confirma si registras temperatura o tests de LH. Aun así, es una estimación: no la uses como método anticonceptivo.',
        },
      ],
      related: ['temperatura-basal', 'test-ovulacion', 'buscar-embarazo'],
    },
    {
      id: 'sindrome-premenstrual',
      category: 'ciclo',
      title: 'Síndrome premenstrual y TDPM',
      summary: 'Por qué aparecen síntomas antes de la regla y qué ayuda de verdad.',
      keywords: ['sindrome premenstrual', 'spm', 'premenstrual', 'tdpm', 'irritable', 'ansiedad', 'hinchazon', 'antes de la regla', 'animo'],
      modes: ['track'],
      body: [
        {
          p: 'Hasta 3 de cada 4 personas que menstrúan notan algún síntoma en los días previos a la regla: hinchazón, pecho sensible, antojos, cansancio, irritabilidad o tristeza. Desaparecen en los primeros días de sangrado.',
        },
        { p: 'Se deben a la sensibilidad de cada cuerpo a los cambios de estrógeno y progesterona, no a un «desajuste hormonal».' },
        { h: 'Qué ayuda' },
        {
          ul: [
            'Ejercicio aeróbico regular y dormir lo suficiente.',
            'Reducir sal, cafeína y alcohol en la segunda mitad del ciclo.',
            'Comidas regulares con hidratos integrales.',
            'Técnicas de manejo del estrés y terapia cognitivo-conductual.',
            'Algunos anticonceptivos y antidepresivos (ISRS) son eficaces en casos intensos.',
          ],
        },
        { h: 'Trastorno disfórico premenstrual (TDPM)' },
        {
          p: 'Afecta a un 3–8 % y causa síntomas emocionales intensos (depresión, ansiedad, ira, desesperanza) que interfieren con la vida diaria. Tiene tratamiento: coméntalo con tu médica o médico.',
        },
      ],
      consult: ['Los síntomas afectan a tus estudios, trabajo o relaciones.', 'Tienes pensamientos de hacerte daño (pide ayuda urgente: 024 o 112).'],
      related: ['animo-ciclo', 'alimentacion-ciclo', 'ejercicio-ciclo'],
    },
    {
      id: 'primera-regla',
      category: 'ciclo',
      title: 'La primera regla',
      summary: 'Cuándo llega, qué esperar los primeros años y cómo prepararte.',
      keywords: ['primera regla', 'menarquia', 'adolescente', 'nina', 'joven', '12 anos', 'pubertad'],
      body: [
        {
          p: 'La primera regla (menarquia) suele llegar entre los 10 y los 15 años, unos 2–3 años después de que empiece a crecer el pecho. Un flujo blanquecino unos meses antes es una pista de que se acerca.',
        },
        { p: 'Los primeros años los ciclos suelen ser irregulares (de 21 a 45 días) porque la ovulación aún no es constante. Es normal.' },
        { h: 'Para estar preparada' },
        {
          ul: [
            'Lleva una compresa o braga menstrual en la mochila.',
            'Empieza con el producto que te resulte más cómodo; puedes probar otros más adelante.',
            'Si duele, el calor y el ibuprofeno (con la dosis adecuada a tu peso) suelen ayudar.',
            'Hablar con alguien de confianza lo hace todo más fácil.',
          ],
        },
        { p: 'Tener la regla significa que puede haber embarazo si hay relaciones sexuales sin protección, incluso antes de que los ciclos sean regulares.' },
      ],
      consult: [
        'No ha llegado la regla a los 15 años, o 3 años después de empezar a crecer el pecho.',
        'El dolor te obliga a faltar a clase a menudo.',
        'La regla dura más de 8 días o empapa la protección cada 1–2 horas.',
      ],
      related: ['productos-menstruales', 'dolor-menstrual', 'ciclos-irregulares'],
    },

    // ---------------------------------------------------------------- Dolor y síntomas
    {
      id: 'dolor-menstrual',
      category: 'dolor',
      title: 'Dolor menstrual: cómo aliviarlo',
      summary: 'Los cólicos son frecuentes, pero no tienes que aguantarlos. Esto es lo que funciona.',
      keywords: ['dolor', 'colicos', 'dismenorrea', 'duele', 'regla dolorosa', 'ibuprofeno', 'calor', 'dolor de regla', 'retortijones'],
      modes: ['track', 'avoid', 'conceive'],
      body: [
        {
          p: 'El dolor menstrual (dismenorrea) se debe a las prostaglandinas, sustancias que hacen que el útero se contraiga. Suele empezar poco antes de la regla y durar 1–3 días.',
        },
        { h: 'Lo que más ayuda' },
        {
          ul: [
            'Antiinflamatorios como el ibuprofeno o el naproxeno, tomados al empezar el dolor (o el día antes) siguiendo el prospecto.',
            'Calor local: una esterilla o bolsa de agua caliente en el abdomen o la zona lumbar.',
            'Movimiento suave: caminar, estiramientos o yoga.',
            'Los anticonceptivos hormonales reducen mucho el dolor en muchas personas.',
            'La estimulación eléctrica (TENS) puede servir como complemento.',
          ],
        },
        { p: 'Si tienes asma, úlcera, problemas de riñón o estás embarazada, consulta antes de tomar antiinflamatorios.' },
        { h: 'Cuando el dolor no es «normal»' },
        {
          p: 'Un dolor que no mejora con tratamiento, que empeora con los años, que aparece fuera de la regla o en las relaciones sexuales puede deberse a endometriosis, adenomiosis u otras causas que tienen tratamiento.',
        },
      ],
      consult: [
        'El dolor no mejora con antiinflamatorios o te impide hacer vida normal.',
        'Dolor en las relaciones, al orinar o al defecar durante la regla.',
        'Dolor intenso y repentino, con fiebre o si podrías estar embarazada: urgencias.',
      ],
      related: ['endometriosis', 'sangrado-abundante', 'ejercicio-ciclo'],
    },
    {
      id: 'sangrado-abundante',
      category: 'dolor',
      title: 'Sangrado abundante',
      summary: 'Cómo saber si tu regla es demasiado abundante y por qué merece la pena consultarlo.',
      keywords: ['abundante', 'mucho sangrado', 'sangro mucho', 'hemorragia', 'coagulos', 'empapo', 'menorragia', 'regla larga'],
      modes: ['track', 'perimenopause'],
      body: [
        { p: 'Se considera sangrado abundante el que interfiere en tu vida física, social o emocional. Es muy frecuente y tiene tratamiento, pero a menudo se normaliza.' },
        { h: 'Señales' },
        {
          ul: [
            'Cambias la compresa o el tampón cada 1–2 horas.',
            'Necesitas doble protección o te levantas por la noche a cambiarte.',
            'Expulsas coágulos más grandes que una moneda.',
            'La regla dura más de 8 días.',
            'Te sientes muy cansada, mareada o con falta de aire (posible anemia).',
          ],
        },
        { h: 'Causas posibles' },
        {
          p: 'Miomas, pólipos, adenomiosis, trastornos de la coagulación (como la enfermedad de von Willebrand), problemas de tiroides, el DIU de cobre o cambios hormonales de la adolescencia y la perimenopausia.',
        },
        { h: 'Tratamientos' },
        { p: 'Ácido tranexámico, antiinflamatorios, DIU hormonal, anticonceptivos u otros tratamientos según la causa. Un análisis de sangre puede detectar anemia.' },
      ],
      consult: [
        'Si empapas una compresa o tampón cada hora durante 2 horas o más, o te mareas o desmayas: urgencias.',
        'Si la regla es abundante de forma habitual o dura más de 8 días: consulta programada.',
      ],
      related: ['anemia', 'colores-flujo', 'dolor-menstrual'],
    },
    {
      id: 'endometriosis',
      category: 'dolor',
      title: 'Endometriosis',
      summary: 'Una enfermedad frecuente e infradiagnosticada que causa dolor. Conocerla ayuda a detectarla antes.',
      keywords: ['endometriosis', 'adenomiosis', 'dolor pelvico', 'dolor en las relaciones', 'infertilidad', 'dolor cronico'],
      body: [
        {
          p: 'En la endometriosis, un tejido parecido al endometrio crece fuera del útero (ovarios, peritoneo, intestino…), causando inflamación y dolor. Afecta a alrededor de 1 de cada 10 mujeres y personas con útero en edad reproductiva.',
        },
        { h: 'Síntomas frecuentes' },
        {
          ul: [
            'Reglas muy dolorosas que no mejoran con analgésicos habituales.',
            'Dolor pélvico fuera de la regla.',
            'Dolor durante o después de las relaciones sexuales.',
            'Dolor al orinar o defecar durante la regla.',
            'Cansancio y dificultad para conseguir embarazo.',
          ],
        },
        { p: 'El diagnóstico se retrasa de media varios años porque el dolor se normaliza. Registrar tus síntomas y llevar un informe a consulta ayuda mucho.' },
        {
          p: 'El tratamiento combina control del dolor, tratamiento hormonal y, en algunos casos, cirugía. Unidades especializadas y asociaciones de pacientes pueden orientarte.',
        },
      ],
      consult: ['El dolor menstrual te impide estudiar, trabajar o hacer vida normal.', 'Tienes dolor en las relaciones o dolor pélvico persistente.'],
      related: ['dolor-menstrual', 'buscar-embarazo'],
    },
    {
      id: 'sop',
      category: 'dolor',
      title: 'Síndrome de ovario poliquístico (SOP)',
      summary: 'La alteración hormonal más frecuente en edad reproductiva: síntomas, diagnóstico y cuidados.',
      keywords: ['sop', 'ovario poliquistico', 'ovarios poliquisticos', 'hirsutismo', 'vello', 'acne', 'resistencia a la insulina', 'androgenos'],
      modes: ['track', 'conceive'],
      body: [
        { p: 'El SOP afecta a alrededor de 1 de cada 10 personas con ovarios. Se diagnostica cuando se cumplen al menos 2 de estos 3 criterios, descartando otras causas:' },
        {
          ul: [
            'Ciclos irregulares o ausencia de ovulación.',
            'Signos de exceso de andrógenos: acné, exceso de vello, caída de pelo, o andrógenos altos en análisis.',
            'Ovarios con muchos folículos en la ecografía.',
          ],
        },
        { p: 'Tener «quistes» en la ecografía no basta para diagnosticarlo, y no todas las personas con SOP tienen sobrepeso.' },
        { h: 'Por qué importa' },
        {
          p: 'Se asocia a resistencia a la insulina, mayor riesgo de diabetes tipo 2 y colesterol alto, y puede dificultar el embarazo. Con seguimiento, la mayoría de estos riesgos se controlan bien.',
        },
        { h: 'Qué ayuda' },
        {
          ul: [
            'Ejercicio regular y alimentación equilibrada (sin dietas extremas).',
            'Anticonceptivos hormonales para regular los ciclos y mejorar acné y vello.',
            'Metformina u otros fármacos en algunos casos.',
            'Inducción de la ovulación si buscas embarazo.',
          ],
        },
      ],
      consult: ['Ciclos muy irregulares o ausencia de regla.', 'Acné intenso, exceso de vello o caída del pelo.', 'Dificultad para conseguir embarazo.'],
      related: ['ciclos-irregulares', 'buscar-embarazo'],
    },
    {
      id: 'anemia',
      category: 'dolor',
      title: 'Anemia por falta de hierro',
      summary: 'Las reglas abundantes son una de las causas más frecuentes. Cómo reconocerla y prevenirla.',
      keywords: ['anemia', 'hierro', 'cansancio', 'ferritina', 'palidez', 'mareo', 'caida del pelo'],
      body: [
        { p: 'Cada regla supone una pérdida de hierro. Si el sangrado es abundante o la alimentación aporta poco hierro, las reservas bajan y puede aparecer anemia ferropénica.' },
        { h: 'Síntomas' },
        {
          ul: [
            'Cansancio persistente y falta de energía.',
            'Palidez, uñas frágiles o caída del pelo.',
            'Mareo, dolor de cabeza o falta de aire con el esfuerzo.',
            'Palpitaciones o dificultad para concentrarte.',
          ],
        },
        { h: 'Prevención' },
        {
          ul: [
            'Alimentos ricos en hierro: carne, pescado, huevos, legumbres, tofu, frutos secos y verduras de hoja verde.',
            'Acompáñalos de vitamina C (cítricos, pimiento, tomate) para absorber mejor el hierro vegetal.',
            'Evita el té y el café justo con las comidas.',
            'Toma suplementos solo si te los indican: el exceso de hierro también es perjudicial.',
          ],
        },
      ],
      consult: ['Cansancio o mareo persistentes, sobre todo con reglas abundantes.', 'Falta de aire o palpitaciones.'],
      related: ['sangrado-abundante', 'alimentacion-ciclo'],
    },
    {
      id: 'migrana-menstrual',
      category: 'dolor',
      title: 'Migraña y dolor de cabeza menstrual',
      summary: 'La bajada de estrógeno puede desencadenar migrañas. Cómo anticiparte.',
      keywords: ['migrana', 'dolor de cabeza', 'cefalea', 'jaqueca', 'aura'],
      body: [
        { p: 'Muchas personas con migraña notan que las crisis aparecen entre 2 días antes y 3 días después del inicio de la regla, por la caída del estrógeno.' },
        {
          ul: [
            'Registrar tus dolores de cabeza en la app ayuda a ver si siguen tu ciclo.',
            'Mantén horarios regulares de sueño y comidas, e hidrátate bien.',
            'Tu médica o médico puede pautar tratamiento preventivo para esos días.',
            'Si tienes migraña con aura, consulta antes de usar anticonceptivos con estrógeno.',
          ],
        },
      ],
      consult: [
        'Dolor de cabeza muy intenso y repentino, con fiebre, rigidez de cuello, confusión o pérdida de fuerza: urgencias.',
        'Migraña con aura si usas o vas a usar anticonceptivos combinados.',
      ],
      related: ['metodos-anticonceptivos', 'sueno'],
    },

    // ---------------------------------------------------------------- Productos e higiene
    {
      id: 'productos-menstruales',
      category: 'productos',
      title: 'Elige tu producto menstrual',
      summary: 'Compresas, tampones, copa, disco y bragas menstruales: ventajas y cómo usarlos con seguridad.',
      keywords: ['compresa', 'tampon', 'copa', 'copa menstrual', 'disco', 'braga menstrual', 'producto', 'higiene menstrual'],
      body: [
        {
          ul: [
            'Compresas: fáciles de usar; cámbialas cada 4–6 horas o antes si están llenas.',
            'Tampones: usa la menor absorción que necesites y cámbialos cada 4–8 horas. Nunca más de 8 horas.',
            'Copa menstrual: reutilizable, hasta 8–12 horas según el fabricante. Hiérvela entre ciclos.',
            'Disco menstrual: se coloca en el fondo vaginal; útil si la copa te resulta incómoda.',
            'Bragas menstruales: cómodas y reutilizables; lávalas en frío y sin suavizante.',
          ],
        },
        { p: 'No hay una opción mejor para todas: elige según tu flujo, tu comodidad y tu estilo de vida. Puedes combinarlas.' },
        { h: 'Si llevas DIU' },
        { p: 'Con copa o disco, rompe el vacío antes de retirarlos para no desplazar el DIU. Coméntalo con quien te lo colocó.' },
      ],
      related: ['shock-toxico', 'higiene-intima', 'primera-regla'],
    },
    {
      id: 'shock-toxico',
      category: 'productos',
      title: 'Síndrome del shock tóxico',
      summary: 'Una complicación muy rara pero grave. Reconocerla a tiempo salva vidas.',
      keywords: ['shock toxico', 'sst', 'tampon', 'fiebre', 'copa', 'infeccion'],
      body: [
        {
          p: 'El síndrome del shock tóxico es una reacción grave a toxinas de ciertas bacterias. Es muy poco frecuente y se ha relacionado con el uso prolongado de tampones de alta absorción, aunque también puede ocurrir con copas u otras causas.',
        },
        { h: 'Síntomas de alarma' },
        { ul: ['Fiebre alta repentina.', 'Vómitos o diarrea.', 'Erupción parecida a una quemadura solar.', 'Mareo, desmayo o confusión.', 'Dolor muscular intenso.'] },
        { p: 'Si tienes estos síntomas mientras usas un tampón o copa, retíralo y acude a urgencias de inmediato.' },
        { h: 'Prevención' },
        {
          ul: [
            'Usa la absorción más baja que necesites.',
            'Cambia el tampón cada 4–8 horas y alterna con compresas por la noche si lo prefieres.',
            'Lávate las manos antes y después de colocarlos.',
          ],
        },
      ],
      consult: ['Fiebre alta con tampón o copa y cualquier otro síntoma de la lista: urgencias (112).'],
      related: ['productos-menstruales'],
    },
    {
      id: 'higiene-intima',
      category: 'productos',
      title: 'Higiene íntima: menos es más',
      summary: 'La vagina se limpia sola. Cuidados sencillos para evitar irritaciones e infecciones.',
      keywords: ['higiene', 'lavado', 'duchas vaginales', 'jabon', 'olor', 'irritacion', 'candidiasis', 'vaginosis'],
      body: [
        {
          ul: [
            'Lava solo la vulva (la parte externa) con agua o un jabón suave sin perfume.',
            'Evita las duchas vaginales: alteran la flora protectora y favorecen infecciones.',
            'Seca bien la zona y usa ropa interior transpirable.',
            'Límpiate de delante hacia atrás tras ir al baño.',
            'Orina después de las relaciones sexuales para reducir infecciones de orina.',
          ],
        },
        { p: 'Un olor suave es normal y cambia a lo largo del ciclo. Un olor fuerte a pescado, picor intenso o flujo de color extraño merecen consulta.' },
      ],
      consult: ['Picor, escozor, olor fuerte o flujo anormal que no mejora en unos días.', 'Dolor o escozor al orinar, sobre todo con fiebre o dolor lumbar.'],
      related: ['flujo-vaginal', 'its'],
    },

    // ---------------------------------------------------------------- Fertilidad
    {
      id: 'buscar-embarazo',
      category: 'fertilidad',
      title: 'Buscar embarazo: guía práctica',
      summary: 'Cómo aumentar las probabilidades, cuánto suele tardar y cuándo pedir ayuda.',
      keywords: ['buscar embarazo', 'quedarme embarazada', 'concebir', 'fertilidad', 'no me quedo', 'infertilidad', 'acido folico'],
      modes: ['conceive'],
      body: [
        { p: 'Cada ciclo, una pareja sin problemas de fertilidad tiene alrededor de un 20–25 % de probabilidad de embarazo. Aproximadamente 8 de cada 10 lo consiguen en un año.' },
        { h: 'Qué ayuda' },
        {
          ul: [
            'Mantener relaciones cada 2–3 días durante todo el ciclo, o a diario en la ventana fértil.',
            'Tomar ácido fólico (400 microgramos al día) desde al menos un mes antes del embarazo.',
            'Dejar el tabaco y el alcohol, y moderar la cafeína.',
            'Mantener un peso saludable y hacer ejercicio moderado.',
            'Revisar medicación y vacunas con tu profesional sanitario antes de concebir.',
          ],
        },
        {
          p: 'No hace falta hacer el amor «a la hora exacta»: el estrés de programarlo todo no ayuda. Los tests de LH y la temperatura basal pueden orientarte si tus ciclos son irregulares.',
        },
        { h: 'Cuándo consultar' },
        {
          p: 'Tras 12 meses de relaciones regulares sin protección, o tras 6 meses si tienes 35 años o más. Antes si tienes ciclos muy irregulares, endometriosis, SOP o antecedentes conocidos.',
        },
      ],
      consult: ['Más de 12 meses buscando embarazo (6 meses si tienes 35 años o más).', 'Ciclos muy irregulares, ausencia de regla o dolor pélvico importante.'],
      related: ['ovulacion', 'test-ovulacion', 'temperatura-basal', 'test-embarazo'],
    },
    {
      id: 'temperatura-basal',
      category: 'fertilidad',
      title: 'Temperatura basal',
      summary: 'Cómo medirla y cómo confirma la ovulación (a posteriori).',
      keywords: ['temperatura basal', 'tb', 'termometro', 'bbt', 'subida de temperatura', 'grafica'],
      modes: ['conceive', 'avoid'],
      body: [
        {
          p: 'Tras la ovulación, la progesterona sube tu temperatura en reposo entre 0,2 y 0,5 °C hasta la siguiente regla. Por eso la temperatura basal confirma que ya has ovulado, pero no avisa antes.',
        },
        { h: 'Cómo medirla bien' },
        {
          ul: [
            'Usa un termómetro basal (con dos decimales).',
            'Mídela nada más despertar, antes de levantarte o hablar, a la misma hora.',
            'Necesitas al menos 3 horas seguidas de sueño.',
            'Marca «medición alterada» si has dormido poco, bebido alcohol, tienes fiebre o la mides a otra hora.',
          ],
        },
        { p: 'La app confirma la ovulación con la regla «3 sobre 6»: tres temperaturas seguidas al menos 0,2 °C por encima de las seis anteriores.' },
        { p: 'Si la temperatura sigue alta más de 18 días tras la ovulación, puede indicar embarazo: haz un test.' },
      ],
      related: ['ovulacion', 'test-ovulacion', 'buscar-embarazo'],
    },
    {
      id: 'test-ovulacion',
      category: 'fertilidad',
      title: 'Tests de ovulación (LH)',
      summary: 'Qué detectan, cuándo empezar a usarlos y cómo interpretar el resultado.',
      keywords: ['test de ovulacion', 'lh', 'pico de lh', 'tira', 'positivo ovulacion'],
      modes: ['conceive'],
      body: [
        { p: 'Los tests de ovulación detectan en la orina el pico de hormona luteinizante (LH), que ocurre 24–36 horas antes de la ovulación.' },
        {
          ul: [
            'Empieza unos 17 días antes de tu próxima regla prevista (por ejemplo, el día 11 en un ciclo de 28).',
            'Hazlo a la misma hora, preferiblemente por la tarde, y sin beber mucho líquido antes.',
            'Un positivo significa que tus días más fértiles son hoy y los dos siguientes.',
          ],
        },
        { p: 'Con SOP pueden salir varios positivos sin ovulación, y algunos medicamentos de fertilidad alteran el resultado.' },
      ],
      related: ['ovulacion', 'temperatura-basal', 'buscar-embarazo'],
    },
    {
      id: 'test-embarazo',
      category: 'fertilidad',
      title: 'Test de embarazo: cuándo y cómo',
      summary: 'Cuándo es fiable, cómo evitar falsos negativos y qué hacer con el resultado.',
      keywords: ['test de embarazo', 'prueba de embarazo', 'retraso', 'embarazada', 'positivo', 'negativo', 'hcg', 'falta'],
      modes: ['track', 'avoid', 'conceive'],
      body: [
        {
          p: 'Los tests de orina detectan la hormona hCG, que empieza a producirse tras la implantación. Son fiables desde el primer día de retraso de la regla; algunos detectan antes, pero con más falsos negativos.',
        },
        {
          ul: [
            'Usa la primera orina de la mañana si lo haces muy pronto.',
            'Lee el resultado en el tiempo que indica el prospecto.',
            'Una línea tenue suele ser un positivo: repítelo en 48 horas.',
            'Si da negativo y la regla no llega, repítelo en 3–5 días.',
          ],
        },
        { p: 'Si tus ciclos son irregulares, cuenta 3 semanas desde la relación sin protección para que el resultado sea fiable.' },
        { h: 'Si da positivo' },
        { p: 'Pide cita en tu centro de salud. Si no deseas continuar el embarazo, también puedes informarte allí sobre la interrupción voluntaria y sus plazos.' },
      ],
      consult: ['Test positivo con dolor abdominal intenso, sangrado o mareo: urgencias (posible embarazo ectópico).', 'Tests negativos repetidos y más de 3 meses sin regla.'],
      related: ['anticoncepcion-emergencia', 'embarazo-inicio', 'ciclos-irregulares'],
    },

    // ---------------------------------------------------------------- Anticoncepción
    {
      id: 'metodos-anticonceptivos',
      category: 'anticoncepcion',
      title: 'Métodos anticonceptivos comparados',
      summary: 'Eficacia real, ventajas e inconvenientes de cada método para que elijas con información.',
      keywords: ['anticonceptivo', 'anticoncepcion', 'metodos', 'pildora', 'diu', 'implante', 'preservativo', 'anillo', 'parche', 'inyeccion'],
      modes: ['avoid', 'track'],
      body: [
        { p: 'La eficacia depende del método y de cómo se usa en la vida real. Estas cifras son embarazos por cada 100 personas en el primer año de uso habitual:' },
        {
          ul: [
            'Implante: menos de 1. Dura 3–5 años.',
            'DIU hormonal: menos de 1. Dura 3–8 años según el modelo y suele reducir el sangrado.',
            'DIU de cobre: menos de 1. Sin hormonas, dura 5–10 años; puede aumentar el sangrado.',
            'Inyección trimestral: unos 4.',
            'Píldora, parche y anillo: unos 7 (menos de 1 con uso perfecto).',
            'Preservativo externo: unos 13. Es el único que protege de las ITS.',
            'Métodos de conocimiento de la fertilidad: de 2 a 23, según el método y la constancia.',
            'Marcha atrás: unos 20. No se considera fiable.',
          ],
        },
        { p: 'Las predicciones de una app no son un método anticonceptivo por sí solas.' },
        {
          p: 'Los métodos con estrógenos no se recomiendan en algunas situaciones (migraña con aura, fumar con 35 años o más, riesgo de trombosis o las primeras semanas tras el parto). Tu profesional sanitario te ayudará a elegir.',
        },
      ],
      related: ['olvido-pildora', 'anticoncepcion-emergencia', 'its'],
    },
    {
      id: 'olvido-pildora',
      category: 'anticoncepcion',
      title: 'Me he olvidado la píldora',
      summary: 'Qué hacer según cuántas píldoras olvidaste y en qué semana. Revisa siempre tu prospecto.',
      keywords: ['olvido pildora', 'olvide la pildora', 'me olvide', 'pildora olvidada', 'vomito pildora', 'diarrea pildora', 'retraso toma'],
      modes: ['avoid'],
      body: [
        { h: 'Píldora combinada' },
        {
          ul: [
            'Olvido de 1 píldora (menos de 48 h desde la toma anterior): tómala en cuanto te acuerdes, aunque sean dos a la vez, y sigue como siempre. No necesitas protección extra.',
            'Olvido de 2 o más: toma la última olvidada, sigue con el resto y usa preservativo 7 días.',
            'Si el olvido fue en la 3.ª semana: empieza el siguiente blíster sin hacer descanso.',
            'Si fue en la 1.ª semana y hubo relaciones sin protección en los 7 días anteriores: valora la anticoncepción de urgencia.',
          ],
        },
        { h: 'Minipíldora (solo gestágeno)' },
        { p: 'Si pasan más de 12 horas (desogestrel) o más de 3 horas (otras) desde tu hora habitual, tómala cuanto antes, sigue normalmente y usa preservativo 48 horas.' },
        { h: 'Vómitos o diarrea' },
        { p: 'Si vomitas en las 3 horas siguientes a la toma o tienes diarrea intensa, puede no absorberse: sigue las instrucciones de olvido.' },
        { p: 'Las pautas varían según la marca: lo que indique tu prospecto o tu farmacéutica prevalece.' },
      ],
      related: ['anticoncepcion-emergencia', 'metodos-anticonceptivos'],
    },
    {
      id: 'anticoncepcion-emergencia',
      category: 'anticoncepcion',
      title: 'Anticoncepción de urgencia',
      summary: 'Qué opciones hay, hasta cuándo funcionan y dónde conseguirlas.',
      keywords: ['pildora del dia despues', 'pildora de emergencia', 'anticoncepcion de urgencia', 'se rompio el preservativo', 'sin proteccion', 'poscoital', 'emergencia'],
      modes: ['avoid', 'track'],
      body: [
        { p: 'Si has tenido una relación sin protección o ha fallado tu método, la anticoncepción de urgencia reduce mucho la probabilidad de embarazo. Cuanto antes, mejor.' },
        {
          ul: [
            'Píldora de levonorgestrel: hasta 72 horas (3 días) después. Sin receta en farmacias en muchos países, incluida España.',
            'Píldora de acetato de ulipristal: hasta 120 horas (5 días), más eficaz que el levonorgestrel en los últimos días.',
            'DIU de cobre: hasta 5 días después. Es el método más eficaz y sirve después como anticonceptivo.',
          ],
        },
        { p: 'No provoca un aborto ni afecta a un embarazo ya existente. Actúa retrasando la ovulación. Puede alterar la fecha de tu siguiente regla.' },
        { p: 'El peso corporal elevado puede reducir la eficacia de las píldoras: coméntalo en la farmacia. Si vomitas en las 3 horas siguientes, necesitas otra dosis.' },
        { p: 'Haz un test de embarazo si la regla se retrasa más de 7 días o es diferente de lo habitual.' },
      ],
      consult: [
        'Acude cuanto antes a una farmacia, centro de salud o servicio de urgencias.',
        'Si la relación no fue consentida, busca atención urgente: te ofrecerán anticoncepción, prevención de ITS y apoyo (en España, 016).',
      ],
      related: ['olvido-pildora', 'test-embarazo', 'its'],
    },
    {
      id: 'its',
      category: 'anticoncepcion',
      title: 'Infecciones de transmisión sexual y revisiones',
      summary: 'Muchas no dan síntomas. Cómo prevenirlas y cuándo hacerte pruebas.',
      keywords: ['its', 'ets', 'clamidia', 'gonorrea', 'vph', 'herpes', 'sifilis', 'vih', 'citologia', 'preservativo'],
      body: [
        {
          p: 'Las infecciones de transmisión sexual (clamidia, gonorrea, sífilis, VIH, herpes, VPH…) son frecuentes y muchas no causan síntomas, pero pueden afectar a la fertilidad si no se tratan.',
        },
        {
          ul: [
            'El preservativo externo o interno protege frente a la mayoría.',
            'Hazte pruebas si tienes una nueva pareja o varias parejas, aunque no tengas síntomas.',
            'La vacuna del VPH previene la mayoría de cánceres de cuello de útero.',
            'Participa en el cribado de cuello de útero de tu país (en España, citología cada 3 años de 25 a 34 y prueba de VPH cada 5 años de 35 a 65).',
          ],
        },
      ],
      consult: [
        'Flujo anormal, llagas, verrugas, dolor al orinar o en las relaciones.',
        'Sangrado después de las relaciones sexuales.',
        'Si tu pareja tiene una ITS o tras una relación de riesgo (la profilaxis del VIH debe iniciarse en 72 h).',
      ],
      related: ['metodos-anticonceptivos', 'flujo-vaginal'],
    },

    // ---------------------------------------------------------------- Embarazo y posparto
    {
      id: 'embarazo-inicio',
      category: 'embarazo',
      title: 'Primeras semanas de embarazo',
      summary: 'Cómo se cuentan las semanas, primeros cuidados y molestias habituales.',
      keywords: ['embarazo', 'embarazada', 'semanas', 'primer trimestre', 'nauseas', 'acido folico', 'fpp', 'fecha probable de parto'],
      modes: ['pregnant'],
      body: [
        {
          p: 'Las semanas de embarazo se cuentan desde el primer día de la última regla, no desde la concepción. Por eso, al tener el primer retraso ya estás de unas 4 semanas. Un embarazo dura unas 40 semanas.',
        },
        { h: 'Primeros pasos' },
        {
          ul: [
            'Pide cita con tu centro de salud o matrona.',
            'Toma ácido fólico hasta la semana 12 (y yodo si te lo indican).',
            'Evita alcohol y tabaco, y consulta cualquier medicación.',
            'Evita carne cruda, embutidos crudos y lácteos sin pasteurizar si no tienes inmunidad frente a la toxoplasmosis.',
          ],
        },
        { h: 'Molestias frecuentes' },
        {
          p: 'Náuseas, cansancio, pecho sensible y ganas de orinar a menudo son habituales. Las náuseas mejoran con comidas pequeñas, frecuentes y secas; si no retienes líquidos, consulta.',
        },
      ],
      consult: ['Vómitos que impiden beber o comer (hiperémesis).', 'Sangrado o dolor abdominal: consulta sin esperar.'],
      related: ['embarazo-alarma', 'perdida-gestacional'],
    },
    {
      id: 'embarazo-alarma',
      category: 'embarazo',
      title: 'Señales de alarma en el embarazo',
      summary: 'Síntomas que requieren atención sin esperar a tu próxima cita.',
      keywords: ['alarma embarazo', 'sangrado embarazo', 'dolor embarazo', 'preeclampsia', 'rotura de bolsa', 'movimientos del bebe', 'contracciones'],
      modes: ['pregnant'],
      body: [
        { p: 'Acude a urgencias o llama a tu maternidad si notas:' },
        {
          ul: [
            'Sangrado vaginal, sobre todo si es abundante o con dolor.',
            'Dolor abdominal intenso o persistente.',
            'Dolor de cabeza fuerte, visión borrosa o destellos, o hinchazón brusca de cara y manos (posible preeclampsia).',
            'Pérdida de líquido por la vagina.',
            'Fiebre de 38 °C o más.',
            'Que tu bebé se mueva menos o de forma diferente (a partir de la semana 24 aproximadamente).',
            'Contracciones regulares antes de la semana 37.',
            'Picor intenso en manos y pies, sobre todo por la noche.',
            'Vómitos que no te dejan retener líquidos.',
            'Pensamientos de hacerte daño o sensación de no poder más.',
          ],
        },
        { p: 'Ante la duda, consulta: nadie te juzgará por preguntar.' },
      ],
      consult: ['Cualquiera de los síntomas anteriores: urgencias obstétricas o 112.'],
      related: ['embarazo-inicio', 'salud-mental-perinatal'],
    },
    {
      id: 'perdida-gestacional',
      category: 'embarazo',
      title: 'Pérdida gestacional',
      summary: 'Información y acompañamiento tras un aborto espontáneo u otra pérdida.',
      keywords: ['aborto espontaneo', 'perdida', 'perdi el embarazo', 'duelo', 'perdida gestacional', 'ectopico'],
      body: [
        {
          p: 'Perder un embarazo es más frecuente de lo que se cree: alrededor de 1 de cada 8 embarazos conocidos termina en un aborto espontáneo, casi siempre en el primer trimestre y por causas cromosómicas.',
        },
        { p: 'No se debe al ejercicio, al estrés, a las relaciones sexuales ni a algo que hicieras o dejaras de hacer.' },
        { h: 'Después' },
        {
          ul: [
            'El sangrado puede durar hasta 2 semanas.',
            'La regla suele volver en 4–6 semanas.',
            'Puedes volver a ovular antes de tu primera regla.',
            'El duelo es distinto para cada persona; date tiempo y pide apoyo si lo necesitas.',
          ],
        },
      ],
      consult: [
        'Sangrado muy abundante, fiebre, flujo con mal olor o dolor intenso tras la pérdida: urgencias.',
        'Si la tristeza o la ansiedad no mejoran con las semanas, pide ayuda profesional.',
      ],
      related: ['salud-mental-perinatal', 'buscar-embarazo'],
    },
    {
      id: 'posparto',
      category: 'embarazo',
      title: 'Recuperación tras el parto',
      summary: 'Qué es normal en las primeras semanas y qué señales requieren atención.',
      keywords: ['posparto', 'puerperio', 'loquios', 'cuarentena', 'despues del parto', 'suelo pelvico', 'cesarea'],
      modes: ['postpartum'],
      body: [
        { p: 'El puerperio dura unas 6 semanas. El sangrado (loquios) empieza rojo y abundante y se va aclarando a rosado, marrón y amarillento.' },
        {
          ul: [
            'Descansa todo lo que puedas y acepta ayuda.',
            'Los ejercicios de suelo pélvico ayudan a prevenir pérdidas de orina.',
            'Si has tenido una cesárea, evita cargar peso las primeras semanas.',
            'La regla puede volver a las 6–8 semanas sin lactancia, o meses después con lactancia.',
            'Puedes quedarte embarazada antes de la primera regla: habla con tu matrona sobre anticoncepción.',
          ],
        },
      ],
      consult: [
        'Empapar una compresa en una hora o menos, o coágulos grandes: urgencias.',
        'Fiebre, loquios con mal olor o dolor abdominal que aumenta.',
        'Dolor en el pecho, falta de aire, o dolor e hinchazón en una pierna: urgencias.',
        'Dolor de cabeza intenso o alteraciones de la vista.',
        'Tristeza o ansiedad intensas, o pensamientos de hacerte daño a ti o al bebé.',
      ],
      related: ['lactancia-fertilidad', 'salud-mental-perinatal'],
    },
    {
      id: 'lactancia-fertilidad',
      category: 'embarazo',
      title: 'Lactancia, regla y fertilidad',
      summary: 'Cuándo protege la lactancia y cuándo necesitas otro método.',
      keywords: ['lactancia', 'mela', 'amamantar', 'lactancia y regla', 'fertilidad posparto', 'pecho'],
      modes: ['postpartum'],
      body: [
        { p: 'La lactancia retrasa la ovulación, pero solo protege del embarazo si se cumplen las tres condiciones del método MELA:' },
        { ul: ['Tu bebé tiene menos de 6 meses.', 'Toma solo pecho, a demanda, de día y de noche (sin tomas separadas más de 4–6 horas).', 'No te ha vuelto la regla.'] },
        { p: 'Si falla alguna, puedes ovular sin saberlo. Los métodos sin estrógenos (minipíldora, DIU, implante, preservativo) son compatibles con la lactancia.' },
        { p: 'Durante la lactancia es normal tener sequedad vaginal y ciclos irregulares al principio.' },
      ],
      related: ['posparto', 'metodos-anticonceptivos'],
    },
    {
      id: 'salud-mental-perinatal',
      category: 'embarazo',
      title: 'Tristeza posparto y depresión perinatal',
      summary: 'Cómo distinguir la tristeza pasajera de la depresión, y dónde pedir ayuda.',
      keywords: ['depresion posparto', 'tristeza posparto', 'baby blues', 'ansiedad embarazo', 'salud mental', 'no puedo mas'],
      modes: ['postpartum', 'pregnant'],
      body: [
        { p: 'Hasta 8 de cada 10 personas sienten llanto fácil, irritabilidad y altibajos en los primeros días tras el parto («baby blues»). Mejora sola en unas 2 semanas.' },
        {
          p: 'La depresión perinatal afecta a más de 1 de cada 10, durante el embarazo o el primer año. Puede aparecer como tristeza, ansiedad intensa, falta de ilusión, culpa, problemas de sueño o pensamientos que asustan.',
        },
        { p: 'No es culpa tuya ni significa que seas mala madre. Tiene tratamiento eficaz, compatible con la lactancia en la mayoría de casos.' },
      ],
      consult: ['Síntomas que duran más de 2 semanas o te impiden cuidarte.', 'Pensamientos de hacerte daño a ti o a tu bebé: pide ayuda urgente (024 o 112).'],
      related: ['posparto', 'animo-ciclo'],
    },

    // ---------------------------------------------------------------- Menopausia
    {
      id: 'menopausia',
      category: 'menopausia',
      title: 'Perimenopausia y menopausia',
      summary: 'Qué cambia, cuánto dura y qué opciones hay para sentirte bien.',
      keywords: ['menopausia', 'perimenopausia', 'climaterio', 'ultima regla', 'sin regla', 'terapia hormonal', 'thm'],
      modes: ['perimenopause'],
      body: [
        { p: 'La menopausia es la última regla. Se confirma tras 12 meses seguidos sin menstruación y llega de media hacia los 51 años (entre los 45 y los 55).' },
        {
          p: 'La perimenopausia son los años previos (a menudo desde los 40 y pico) en los que las hormonas fluctúan: los ciclos se acortan o alargan, las reglas cambian y pueden aparecer sofocos, insomnio, cambios de ánimo, niebla mental o dolores articulares.',
        },
        { h: 'Opciones' },
        {
          ul: [
            'Terapia hormonal: el tratamiento más eficaz para los sofocos; para muchas personas los beneficios superan los riesgos. Valóralo con tu médica o médico.',
            'Tratamientos sin hormonas para quien no puede o no quiere usarlas.',
            'Ejercicio de fuerza, alimentación rica en calcio y no fumar para proteger huesos y corazón.',
          ],
        },
        { p: 'Sigue usando anticoncepción hasta 12 meses después de la última regla (24 meses si ocurre antes de los 50).' },
      ],
      consult: ['Sangrado tras 12 meses sin regla.', 'Síntomas que afectan a tu calidad de vida.', 'Menopausia antes de los 40 años (insuficiencia ovárica prematura).'],
      related: ['sofocos', 'salud-vaginal-menopausia', 'huesos-corazon'],
    },
    {
      id: 'sofocos',
      category: 'menopausia',
      title: 'Sofocos y sudores nocturnos',
      summary: 'Por qué ocurren y qué los alivia.',
      keywords: ['sofocos', 'calores', 'sudores nocturnos', 'sudor', 'bochorno'],
      modes: ['perimenopause'],
      body: [
        {
          p: 'Los sofocos afectan a la mayoría de personas en la transición menopáusica. Son una sensación repentina de calor en cara, cuello y pecho, a veces con sudor y palpitaciones, que dura unos minutos.',
        },
        {
          ul: [
            'Viste por capas y ten agua fresca cerca.',
            'Mantén el dormitorio fresco y usa ropa de cama transpirable.',
            'Identifica desencadenantes: alcohol, picante, cafeína, estrés.',
            'La respiración lenta y la terapia cognitivo-conductual reducen su impacto.',
            'La terapia hormonal y algunos fármacos sin hormonas son eficaces.',
          ],
        },
        { p: 'Registrar tus sofocos ayuda a ver su frecuencia y a valorar el tratamiento en consulta.' },
      ],
      related: ['menopausia', 'sueno'],
    },
    {
      id: 'salud-vaginal-menopausia',
      category: 'menopausia',
      title: 'Sequedad vaginal y salud urinaria',
      summary: 'Un problema frecuente que tiene tratamiento sencillo y seguro.',
      keywords: ['sequedad vaginal', 'dolor en las relaciones', 'atrofia', 'sindrome genitourinario', 'infeccion de orina', 'lubricante'],
      modes: ['perimenopause', 'postpartum'],
      body: [
        {
          p: 'La bajada de estrógenos adelgaza y reseca los tejidos de la vulva, la vagina y la vejiga. Puede causar sequedad, picor, dolor en las relaciones, urgencia para orinar o infecciones de orina repetidas.',
        },
        {
          ul: [
            'Hidratantes vaginales de uso regular y lubricantes en las relaciones.',
            'Estrógenos vaginales a dosis bajas: muy eficaces y seguros para la mayoría.',
            'Ejercicios de suelo pélvico y fisioterapia especializada.',
          ],
        },
        { p: 'A diferencia de los sofocos, no suele mejorar con el tiempo sin tratamiento. No tienes por qué aguantarlo.' },
      ],
      related: ['menopausia', 'higiene-intima'],
    },
    {
      id: 'huesos-corazon',
      category: 'menopausia',
      title: 'Huesos y corazón después de la menopausia',
      summary: 'Pequeños hábitos con un gran impacto a largo plazo.',
      keywords: ['osteoporosis', 'huesos', 'calcio', 'vitamina d', 'corazon', 'colesterol', 'tension'],
      modes: ['perimenopause'],
      body: [
        { p: 'Sin estrógenos, la densidad de los huesos disminuye más deprisa y aumenta el riesgo cardiovascular.' },
        {
          ul: [
            'Ejercicio de fuerza y de impacto (caminar rápido, subir escaleras) varias veces por semana.',
            'Calcio suficiente (lácteos, bebidas vegetales enriquecidas, sardinas, almendras) y vitamina D.',
            'No fumar y moderar el alcohol.',
            'Controla tensión arterial, colesterol y azúcar según te indiquen.',
          ],
        },
      ],
      related: ['menopausia', 'ejercicio-ciclo'],
    },

    // ---------------------------------------------------------------- Bienestar
    {
      id: 'animo-ciclo',
      category: 'bienestar',
      title: 'Ánimo y ciclo menstrual',
      summary: 'Por qué tu ánimo puede cambiar a lo largo del mes y cómo cuidarte.',
      keywords: ['animo', 'estado de animo', 'tristeza', 'ansiedad', 'llorar', 'cambios de humor', 'emociones', 'estres'],
      modes: ['track', 'perimenopause'],
      body: [
        {
          p: 'Las hormonas del ciclo influyen en neurotransmisores como la serotonina. Muchas personas se sienten con más energía en la fase folicular y más sensibles en los días previos a la regla.',
        },
        {
          ul: [
            'Registrar tu ánimo en la app te ayuda a ver tus patrones y a planificar.',
            'Dormir bien, moverte y comer con regularidad estabiliza el ánimo.',
            'Date permiso para bajar el ritmo en los días difíciles.',
            'Hablar con alguien de confianza ayuda.',
          ],
        },
        { p: 'Si la tristeza o la ansiedad duran semanas, no dependen del ciclo o te impiden hacer tu vida, pide ayuda profesional.' },
      ],
      consult: ['Tristeza, ansiedad o irritabilidad que afectan a tu vida diaria.', 'Pensamientos de hacerte daño: pide ayuda urgente (024 o 112).'],
      related: ['sindrome-premenstrual', 'sueno'],
    },
    {
      id: 'alimentacion-ciclo',
      category: 'bienestar',
      title: 'Alimentación a lo largo del ciclo',
      summary: 'Sin dietas milagro: pautas sencillas que ayudan con la energía y los síntomas.',
      keywords: ['alimentacion', 'comida', 'dieta', 'antojos', 'hambre', 'nutricion', 'magnesio'],
      body: [
        {
          ul: [
            'Durante la regla, prioriza alimentos ricos en hierro y acompáñalos de vitamina C.',
            'Antes de la regla es normal tener más hambre: elige hidratos integrales, legumbres y frutos secos.',
            'Reducir sal, azúcar y alcohol puede aliviar la hinchazón.',
            'El pescado azul, las semillas y los frutos secos aportan grasas saludables.',
            'Bebe agua con regularidad.',
          ],
        },
        { p: 'Las dietas muy restrictivas pueden hacer que desaparezca la regla. Tu cuerpo necesita energía suficiente para ovular.' },
      ],
      related: ['anemia', 'sindrome-premenstrual'],
    },
    {
      id: 'ejercicio-ciclo',
      category: 'bienestar',
      title: 'Ejercicio y regla',
      summary: 'Puedes (y a menudo conviene) moverte con la regla. Adapta la intensidad a cómo te sientas.',
      keywords: ['ejercicio', 'deporte', 'entrenar', 'correr', 'yoga', 'nadar con la regla'],
      body: [
        { p: 'El ejercicio mejora el dolor menstrual, el ánimo y el sueño. No hay ninguna fase en la que esté contraindicado.' },
        {
          ul: [
            'Con la regla: actividad suave o moderada si te encuentras cansada; nadar es perfectamente posible con tampón o copa.',
            'Fase folicular: buen momento para entrenamientos intensos.',
            'Fase lútea: puede costar más recuperarse; escucha a tu cuerpo.',
          ],
        },
        { p: 'Si entrenas mucho y dejas de tener la regla, puede deberse a falta de energía (déficit energético relativo en el deporte): consulta.' },
      ],
      related: ['dolor-menstrual', 'huesos-corazon'],
    },
    {
      id: 'sueno',
      category: 'bienestar',
      title: 'Dormir mejor',
      summary: 'El sueño cambia con el ciclo, el embarazo y la menopausia. Hábitos que ayudan.',
      keywords: ['sueno', 'insomnio', 'dormir', 'descanso', 'despertar'],
      body: [
        {
          p: 'Los días previos a la regla, la temperatura corporal más alta y los cambios hormonales pueden empeorar el sueño. En la menopausia, los sudores nocturnos lo interrumpen.',
        },
        {
          ul: [
            'Mantén horarios regulares, también el fin de semana.',
            'Dormitorio fresco, oscuro y silencioso.',
            'Evita pantallas, cafeína y alcohol antes de dormir.',
            'Actividad física durante el día, mejor no justo antes de acostarte.',
            'Si llevas semanas durmiendo mal, la terapia cognitivo-conductual para el insomnio es muy eficaz.',
          ],
        },
      ],
      related: ['sofocos', 'animo-ciclo'],
    },
    // ---------------------------------------------------------------- Mitos y realidades
    {
      id: 'mitos-regla',
      category: 'mitos',
      title: 'Mitos sobre la regla',
      summary: 'Lo que se sigue oyendo sobre la menstruación y lo que dice la evidencia.',
      keywords: [
        'mitos',
        'mito',
        'verdad o mentira',
        'es verdad que',
        'banarse con la regla',
        'ducharse con la regla',
        'nadar con la regla',
        'sincronizar reglas',
        'sangre sucia',
        'himen',
        'tampon virginidad',
        'sexo con la regla',
      ],
      body: [
        { h: '«Con la regla no puedes ducharte, bañarte ni lavarte el pelo»' },
        { p: 'Falso. Ducharte o bañarte es seguro, ayuda a sentirte bien y el agua caliente puede aliviar el dolor. También puedes nadar, con tampón, copa o bañador menstrual.' },
        { h: '«Hacer ejercicio con la regla es malo»' },
        { p: 'Falso. El ejercicio suele mejorar el dolor menstrual y el ánimo. Adapta la intensidad a cómo te encuentres.' },
        { h: '«La sangre menstrual es sucia»' },
        { p: 'Falso. Es sangre y tejido del endometrio: no es tóxica ni impura. Es tan natural como cualquier otra función del cuerpo.' },
        { h: '«Lo normal es un ciclo de 28 días exactos»' },
        {
          p: 'Falso. En personas adultas, un ciclo de 24 a 38 días es normal, y es habitual que varíe unos días de un mes a otro. Solo una pequeña parte de los ciclos dura exactamente 28 días.',
        },
        { h: '«El dolor fuerte es normal y hay que aguantarlo»' },
        {
          p: 'Falso. Algo de molestia es frecuente, pero un dolor que no mejora con los analgésicos habituales, que te obliga a faltar a clase o al trabajo o que va a más merece una consulta: puede tener causas tratables, como la endometriosis.',
        },
        { h: '«Las reglas de quienes conviven acaban sincronizándose»' },
        { p: 'No hay pruebas sólidas. Los estudios más amplios no lo confirman: como cada ciclo dura distinto, a veces coinciden y después se separan por pura estadística.' },
        { h: '«Usar tampón o copa tiene que ver con la virginidad»' },
        {
          p: 'Falso. El himen es un tejido flexible que normalmente ya tiene una abertura (por ahí sale la regla). Usar tampón o copa no dice nada de tu vida sexual, y la «virginidad» no es un concepto médico.',
        },
        { h: '«Con la regla no se puede tener sexo»' },
        {
          p: 'Se puede, si todas las personas implicadas quieren. El embarazo es poco probable pero posible, y las infecciones de transmisión sexual se transmiten igual: el preservativo sigue siendo importante.',
        },
      ],
      consult: [
        'Dolor menstrual que no mejora con analgésicos o que te impide hacer tu vida.',
        'Reglas que duran más de 8 días o que te obligan a cambiar de producto cada hora durante varias horas seguidas.',
      ],
      related: ['dolor-menstrual', 'ciclo-menstrual', 'productos-menstruales'],
    },
    {
      id: 'mitos-fertilidad',
      category: 'mitos',
      title: 'Mitos sobre fertilidad y anticoncepción',
      summary: 'Creencias frecuentes que pueden llevar a un embarazo no buscado… o a preocuparse sin motivo.',
      keywords: [
        'mitos anticoncepcion',
        'mitos fertilidad',
        'marcha atras',
        'coitus interruptus',
        'embarazo con la regla',
        'pildora engorda',
        'descansar de la pildora',
        'lactancia embarazo',
        'dia 14',
        'app anticonceptivo',
        'pildora del dia despues abortiva',
      ],
      body: [
        { h: '«Con la regla no te puedes quedar embarazada»' },
        { p: 'Es poco probable, pero posible, sobre todo con ciclos cortos: los espermatozoides pueden sobrevivir hasta 5 días y la ovulación puede adelantarse.' },
        { h: '«La marcha atrás es un método seguro»' },
        {
          p: 'No lo es. Con el uso real, alrededor de 1 de cada 5 personas que la usan como único método se queda embarazada en un año, y no protege de las infecciones de transmisión sexual.',
        },
        { h: '«Todo el mundo ovula el día 14»' },
        { p: 'Falso. El día de la ovulación cambia de una persona a otra y de un ciclo a otro. Por eso las predicciones son estimaciones.' },
        { h: '«Una app de ciclos sirve como anticonceptivo»' },
        {
          p: 'Esta app no es un método anticonceptivo: sus días fértiles son una estimación. Los métodos basados en el conocimiento de la fertilidad exigen aprender reglas concretas (temperatura, moco cervical) y, aun así, fallan más que los métodos de larga duración.',
        },
        { h: '«Hay que descansar de la píldora cada cierto tiempo»' },
        { p: 'No es necesario. Hacer pausas no aporta ningún beneficio y aumenta el riesgo de embarazo al retomarla.' },
        { h: '«La píldora engorda o deja infertilidad»' },
        {
          p: 'Los estudios no muestran un aumento de peso importante con la mayoría de las píldoras, y la fertilidad vuelve pronto al dejar la píldora, el parche, el anillo, el implante o el DIU. Con la inyección trimestral puede tardar unos meses más.',
        },
        { h: '«Dando el pecho no hay embarazo»' },
        {
          p: 'Solo protege si se cumplen las tres condiciones a la vez: han pasado menos de 6 meses desde el parto, la lactancia es exclusiva (también de noche) y no ha vuelto la regla. Si falla una, necesitas otro método.',
        },
        { h: '«La píldora del día después es abortiva»' },
        {
          p: 'Falso. Actúa retrasando la ovulación y no interrumpe un embarazo ya iniciado. Es más eficaz cuanto antes se tome; el DIU de cobre colocado en los 5 días siguientes es la opción más eficaz.',
        },
        { h: '«Si no te quedas embarazada en unos meses, algo va mal»' },
        {
          p: 'Es normal tardar: la mayoría de las parejas lo consigue en un año de relaciones sin protección. Se recomienda consultar tras 12 meses intentándolo (6 meses a partir de los 35 años), o antes si los ciclos son muy irregulares o hay otros motivos.',
        },
      ],
      related: ['metodos-anticonceptivos', 'anticoncepcion-emergencia', 'buscar-embarazo', 'ovulacion'],
    },
    {
      id: 'mitos-salud-intima',
      category: 'mitos',
      title: 'Mitos sobre salud íntima y menopausia',
      summary: 'Higiene, flujo, infecciones, SOP y menopausia: separar lo cierto de lo que no.',
      keywords: [
        'mitos higiene',
        'mitos menopausia',
        'ducha vaginal',
        'lavado vaginal',
        'flujo infeccion',
        'its sin sintomas',
        'sop embarazo',
        'menopausia de golpe',
        'embarazo perimenopausia',
        'sindrome premenstrual real',
      ],
      body: [
        { h: '«Hay que lavar la vagina por dentro»' },
        {
          p: 'Falso. La vagina se limpia sola. Las duchas vaginales alteran su flora y se asocian a más infecciones. Basta con lavar la vulva por fuera con agua o con un jabón suave sin perfume.',
        },
        { h: '«Tener flujo es señal de infección»' },
        { p: 'Falso. El flujo es normal y cambia a lo largo del ciclo. Consulta si cambia de olor o de color (verdoso, grisáceo), o si aparece picor, escozor o dolor.' },
        { h: '«Las infecciones de transmisión sexual siempre dan síntomas»' },
        { p: 'Falso. La clamidia, la gonorrea, el VPH o el VIH pueden no dar ningún síntoma durante mucho tiempo. La única forma de saberlo es hacerse pruebas.' },
        { h: '«El síndrome premenstrual está en tu cabeza»' },
        { p: 'Falso. Es real y tiene base hormonal. Cuando los cambios de ánimo son muy intensos puede tratarse de un trastorno disfórico premenstrual, que tiene tratamiento.' },
        { h: '«Con SOP no te puedes quedar embarazada»' },
        { p: 'Falso. Puede costar más porque la ovulación es irregular, pero muchas personas con SOP se quedan embarazadas, con o sin tratamiento.' },
        { h: '«La menopausia llega de golpe»' },
        {
          p: 'Normalmente no. Antes llega la perimenopausia, que puede durar varios años, con ciclos irregulares y síntomas que van y vienen. Se habla de menopausia tras 12 meses seguidos sin regla.',
        },
        { h: '«En la perimenopausia ya no hay riesgo de embarazo»' },
        { p: 'Falso. Mientras haya ovulaciones, aunque sean irregulares, puede haber embarazo. Consulta cuándo es seguro dejar la anticoncepción.' },
      ],
      consult: ['Flujo con mal olor, de color verdoso o grisáceo, o con picor o escozor.', 'Cualquier sangrado después de 12 meses sin regla.'],
      related: ['flujo-vaginal', 'its', 'sop', 'menopausia'],
    },
  ],

  glossary: [
    { term: 'Adenomiosis', def: 'Presencia de tejido endometrial dentro del músculo del útero. Puede causar reglas dolorosas y abundantes.' },
    { term: 'Amenorrea', def: 'Ausencia de regla durante 3 meses o más (o no haberla tenido a los 15 años) fuera del embarazo, la lactancia o la menopausia.' },
    { term: 'Anovulación', def: 'Ciclo en el que no se produce ovulación. Es frecuente en la adolescencia, la perimenopausia y el SOP.' },
    { term: 'Ciclo menstrual', def: 'Periodo desde el primer día de una regla hasta el día anterior a la siguiente.' },
    { term: 'Coágulo', def: 'Acumulación de sangre espesa. Los pequeños son normales; los grandes y frecuentes pueden indicar sangrado abundante.' },
    { term: 'Cuerpo lúteo', def: 'Estructura que queda en el ovario tras la ovulación y produce progesterona.' },
    { term: 'DIU', def: 'Dispositivo intrauterino. Puede ser hormonal (libera levonorgestrel) o de cobre (sin hormonas).' },
    { term: 'Dismenorrea', def: 'Dolor menstrual. Primaria si no hay otra enfermedad; secundaria si se debe a una causa como la endometriosis.' },
    { term: 'Endometrio', def: 'Capa interna del útero que se engrosa en cada ciclo y se desprende con la regla.' },
    { term: 'Endometriosis', def: 'Enfermedad en la que un tejido parecido al endometrio crece fuera del útero, causando inflamación y dolor.' },
    { term: 'Estrógeno', def: 'Hormona que predomina en la primera mitad del ciclo; engrosa el endometrio y favorece el flujo fértil.' },
    { term: 'Fase folicular', def: 'Primera parte del ciclo, desde la regla hasta la ovulación. Su duración es la que más varía.' },
    { term: 'Fase lútea', def: 'Parte del ciclo entre la ovulación y la siguiente regla. Suele durar 11–17 días.' },
    { term: 'FPP', def: 'Fecha probable de parto: 40 semanas desde el primer día de la última regla.' },
    { term: 'hCG', def: 'Hormona del embarazo que detectan los tests de embarazo.' },
    { term: 'LH', def: 'Hormona luteinizante. Su pico desencadena la ovulación y lo detectan los tests de ovulación.' },
    { term: 'Loquios', def: 'Sangrado y flujo que se expulsan tras el parto, durante unas 6 semanas.' },
    { term: 'Menarquia', def: 'La primera regla.' },
    { term: 'Menopausia', def: 'Última regla, confirmada tras 12 meses sin menstruación.' },
    { term: 'Mioma', def: 'Tumor benigno del músculo del útero. Puede causar reglas abundantes o no dar síntomas.' },
    { term: 'Moco cervical', def: 'Flujo producido por el cuello del útero. Se vuelve transparente y elástico cerca de la ovulación.' },
    { term: 'Ovulación', def: 'Salida del óvulo del ovario, unos 14 días antes de la siguiente regla.' },
    { term: 'Perimenopausia', def: 'Años de transición antes de la menopausia, con ciclos y síntomas cambiantes.' },
    { term: 'Progesterona', def: 'Hormona de la segunda mitad del ciclo; prepara el útero y sube la temperatura basal.' },
    { term: 'Sangrado intermenstrual', def: 'Sangrado entre dos reglas. Si se repite, conviene consultarlo.' },
    { term: 'Semanas de gestación', def: 'Forma de contar el embarazo desde el primer día de la última regla (p. ej., 12+3 son 12 semanas y 3 días).' },
    { term: 'SOP', def: 'Síndrome de ovario poliquístico: alteración hormonal con ciclos irregulares y exceso de andrógenos.' },
    { term: 'SPM', def: 'Síndrome premenstrual: síntomas físicos y emocionales en los días previos a la regla.' },
    { term: 'TDPM', def: 'Trastorno disfórico premenstrual: forma intensa del SPM con síntomas emocionales importantes.' },
    { term: 'Temperatura basal', def: 'Temperatura en reposo al despertar. Sube tras la ovulación.' },
    { term: 'Ventana fértil', def: 'Los días del ciclo en los que puede haber embarazo: unos 5 antes de la ovulación y el propio día.' },
    { term: 'VPH', def: 'Virus del papiloma humano. Infección muy frecuente; algunos tipos pueden causar cáncer de cuello de útero. Hay vacuna.' },
  ],

  faq: [
    {
      q: '¿Mis datos salen de mi móvil?',
      a: [
        'No. Todo se guarda cifrado en tu dispositivo. Solo si activas la sincronización, los recordatorios con la app cerrada o un enlace para compartir se envía algo al servidor, y siempre cifrado de forma que el servidor no pueda leerlo.',
      ],
    },
    {
      q: '¿Qué pasa si olvido mi PIN?',
      a: [
        'Puedes entrar con tu código de recuperación. Si no lo tienes, nadie puede descifrar tus datos (ni siquiera nosotras) y tendrás que borrar el perfil. Por eso es importante guardar el código.',
      ],
    },
    {
      q: '¿Puedo usar las predicciones como método anticonceptivo?',
      a: ['No. Son estimaciones estadísticas que pueden fallar, sobre todo con ciclos irregulares. Usa un método anticonceptivo fiable.'],
    },
    { q: '¿Qué día cuento como el día 1?', a: ['El primer día de sangrado real (flujo ligero, medio o abundante). El manchado previo no cuenta como inicio de la regla.'] },
    {
      q: '¿Por qué ha cambiado la fecha prevista?',
      a: [
        'Porque la app aprende de cada ciclo que registras. Cuantos más ciclos, más precisa. Si registras la regla en un día distinto al previsto, las siguientes predicciones se recalculan.',
      ],
    },
    {
      q: '¿Por qué no veo los días fértiles?',
      a: [
        'En los modos embarazo, posparto y perimenopausia no se muestran. En «Evitar embarazo» puedes activarlos en Ajustes → Modo de uso. Con anticonceptivos hormonales no hay ovulación natural.',
      ],
    },
    {
      q: 'Tomo la píldora, ¿sirve la app?',
      a: ['Sí: registra tus sangrados, síntomas y tomas, y activa el recordatorio de la píldora. Ten en cuenta que el sangrado de la semana de descanso no es una regla natural.'],
    },
    {
      q: '¿Es normal que mi ciclo varíe?',
      a: ['Sí. Variaciones de hasta 7–9 días entre ciclos se consideran normales en personas adultas, y más en la adolescencia y la perimenopausia.'],
    },
    { q: '¿Funciona sin internet?', a: ['Sí. Una vez abierta la primera vez, funciona sin conexión. Instálala en tu pantalla de inicio para usarla como una app.'] },
    {
      q: '¿Puedo usarla en varios dispositivos?',
      a: ['Sí, con la sincronización cifrada de extremo a extremo (Ajustes → Tus datos). También puedes exportar una copia cifrada e importarla en otro dispositivo.'],
    },
    { q: '¿Puede usarla más de una persona en el mismo móvil?', a: ['Sí. Cada perfil tiene su propio bloqueo y sus datos se cifran por separado. Añádelo en Ajustes → Perfil.'] },
    {
      q: '¿Qué hace Luna con mis preguntas?',
      a: ['Nada fuera de tu dispositivo: Luna responde con una base de conocimiento local y tus propios datos. La conversación se borra al bloquear la app.'],
    },
  ],

  consult: {
    urgent: [
      'Sangrado que empapa una compresa o tampón cada hora durante 2 horas o más, o con mareo o desmayo.',
      'Dolor abdominal o pélvico intenso y repentino, sobre todo si podrías estar embarazada (posible embarazo ectópico).',
      'Fiebre alta con tampón o copa junto con vómitos, erupción o mareo (posible shock tóxico).',
      'En el embarazo: sangrado, dolor fuerte, pérdida de líquido, dolor de cabeza intenso con visión borrosa o menos movimientos del bebé.',
      'Tras el parto: sangrado abundante, fiebre, dolor en el pecho, falta de aire o dolor e hinchazón en una pierna.',
      'Pensamientos de quitarte la vida o hacerte daño: llama al 024 (España) o al 112.',
      'Si has sufrido una agresión sexual: acude a urgencias. En España puedes llamar al 016 (no deja rastro en la factura).',
    ],
    soon: [
      'Test de embarazo positivo, para iniciar el seguimiento (o si no deseas continuarlo).',
      'Relación sin protección en los últimos 5 días: anticoncepción de urgencia cuanto antes.',
      'Sangrado entre reglas o después de las relaciones sexuales.',
      'Flujo con mal olor, picor intenso, llagas o dolor al orinar.',
      'Dolor en las relaciones sexuales.',
      'Cualquier sangrado después de la menopausia.',
      'Tristeza, ansiedad o irritabilidad que afectan a tu vida, sobre todo en el embarazo o tras el parto.',
    ],
    routine: [
      'Reglas muy dolorosas que te hacen faltar a clase o al trabajo.',
      'Reglas abundantes o de más de 8 días.',
      'Ciclos habitualmente de menos de 24 días o más de 38 (21–45 en la adolescencia).',
      '3 meses o más sin regla sin estar embarazada ni en lactancia.',
      'No haber tenido la regla a los 15 años.',
      'Acné intenso, exceso de vello o ciclos irregulares (posible SOP).',
      'Más de 12 meses buscando embarazo (6 si tienes 35 años o más).',
      'Síntomas de la menopausia que afectan a tu día a día.',
      'Tu cribado de cáncer de cuello de útero según el programa de tu país.',
    ],
  },

  help: [
    {
      id: 'install',
      title: 'Instalar la app en tu móvil',
      steps: [
        'Android (Chrome): pulsa «Instalar» en la tarjeta de inicio o abre el menú ⋮ y elige «Instalar aplicación».',
        'iPhone (Safari): pulsa Compartir y después «Añadir a pantalla de inicio».',
        'Ordenador: pulsa el icono de instalar en la barra de direcciones.',
        'Una vez instalada se abre a pantalla completa y funciona sin conexión.',
      ],
    },
    {
      id: 'notifications',
      title: 'Activar los recordatorios',
      steps: [
        'Ve a Ajustes → Recordatorios y pulsa «Permitir notificaciones».',
        'Activa los recordatorios que quieras y elige la hora.',
        'En iPhone, primero instala la app en la pantalla de inicio (iOS 16.4 o superior).',
        'Para recibirlos con la app cerrada, activa «Avisos puntuales con la app cerrada» si está disponible.',
        'Si quieres que no revelen nada, activa las notificaciones discretas en Privacidad.',
      ],
    },
    {
      id: 'backup',
      title: 'Hacer una copia de seguridad',
      steps: [
        'Ve a Ajustes → Tus datos → Exportar.',
        'Elige «Copia de seguridad cifrada» y escribe una contraseña.',
        'Guarda el archivo fuera del móvil (nube, ordenador, correo a ti misma).',
        'Para restaurarla: Ajustes → Tus datos → Importar.',
      ],
    },
    {
      id: 'sync',
      title: 'Usar la app en dos dispositivos',
      steps: [
        'En el primer dispositivo: Ajustes → Tus datos → Sincronización → Activar.',
        'Guarda el código de sincronización que aparece.',
        'En el segundo dispositivo, crea tu perfil, ve a la misma pantalla e introduce el código en «¿Ya tienes un código?».',
        'Los cambios se sincronizan cifrados al abrir la app y al registrar.',
      ],
    },
    {
      id: 'forgot',
      title: 'He olvidado mi PIN o contraseña',
      steps: [
        'En la pantalla de bloqueo, pulsa «He olvidado mi PIN».',
        'Introduce tu código de recuperación.',
        'Crea un nuevo PIN o contraseña.',
        'Si no tienes el código, tendrás que borrar el perfil: tus datos no pueden descifrarse sin él.',
      ],
    },
    {
      id: 'profiles',
      title: 'Varios perfiles en un dispositivo',
      steps: [
        'Ve a Ajustes → Perfil → Añadir perfil.',
        'Cada perfil tiene su propio bloqueo y datos cifrados por separado.',
        'Para cambiar de perfil, bloquea la app y elige el perfil en la pantalla de bloqueo.',
      ],
    },
    {
      id: 'safe',
      title: 'Pantalla segura y modo invitada',
      steps: [
        'Activa la pantalla segura en Ajustes → Privacidad.',
        'Toca el escudo de la barra superior para mostrar al instante una calculadora que funciona.',
        'Para volver tendrás que desbloquear.',
        'El modo invitada muestra solo lo que elijas (por ejemplo, la próxima regla) a otra persona.',
      ],
    },
    {
      id: 'delete',
      title: 'Borrar tus datos',
      steps: [
        'Para borrar un perfil: Ajustes → Perfil → Eliminar este perfil.',
        'Para borrarlo todo: Ajustes → Tus datos → Borrar todo.',
        'También se borran los datos cifrados de sincronización y los enlaces compartidos del servidor.',
        'Si quieres conservarlos, exporta antes una copia.',
      ],
    },
  ],
};
