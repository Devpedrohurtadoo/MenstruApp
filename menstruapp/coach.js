/**
 * @fileoverview Motor de IA local — Luna, consejera de salud
 */
(function () {
  'use strict';

  const DISCLAIMER = 'Recuerda: si los síntomas persisten, consulta siempre a tu ginecólogo/a de confianza.';

  /**
   * @description Construye respuesta larga desde párrafos
   * @param {string[]} paragraphs - Párrafos del mensaje
   * @returns {string}
   */
  const buildResponse = (paragraphs) => paragraphs.join('\n\n') + '\n\n' + DISCLAIMER;

  const RESPONSES = {
    dolor_menstrual: buildResponse([
      'Entiendo perfectamente lo agotador que puede ser vivir con dolor menstrual intenso. Los cólicos ocurren porque el útero contrae sus fibras musculares para expulsar el endometrio, liberando prostaglandinas que intensifican las contracciones. Cuando estos niveles son elevados, el dolor puede irradiarse a la espalda baja, muslos e incluso causar náuseas o diarrea, lo cual es fisiológicamente normal pero no significa que debas tolerarlo en silencio.',
      'Para aliviar el malestar de forma inmediata, prueba aplicar calor local con una bolsa de agua tibia o una compresa térmica sobre el bajo vientre durante quince o veinte minutos. El calor relaja la musculatura uterina y mejora la circulación pélvica. El ibuprofeno o el naproxeno, si no tienes contraindicaciones, son más efectivos cuando los tomas al inicio del dolor o incluso un día antes de la menstruación prevista, ya que inhiben la síntesis de prostaglandinas. Complementa con estiramientos suaves de espalda, respiración diafragmática y masajes circulares en la zona lumbar.',
      'A medio plazo, observar tu ciclo con Menstruapp te ayudará a anticipar los días de mayor dolor y prepararte con descanso, hidratación abundante y alimentos antiinflamatorios ricos en omega-3, magnesio y hierro. Reduce cafeína, alcohol y alimentos muy procesados durante la fase premenstrual. El ejercicio regular de intensidad moderada, como caminar, nadar o yoga, ha demostrado reducir la intensidad del dolor a lo largo de varios ciclos. Si el dolor incapacita tus actividades más de dos o tres días al mes, si empeora progresivamente o no responde a analgésicos habituales, podría tratarse de endometriosis, adenomiosis o miomas y merece una evaluación especializada con ecografía o resonancia.'
    ]),
    anticonceptivos: buildResponse([
      'Los métodos anticonceptivos son herramientas fundamentales para planificar tu vida reproductiva con autonomía y seguridad. Existen múltiples opciones y la ideal depende de tu salud, estilo de vida, preferencias y antecedentes médicos. La píldora combinada contiene estrógenos y progestágenos que inhiben la ovulación y espesan el moco cervical; la píldora solo de progestágeno es adecuada para quienes no pueden tomar estrógenos. El DIU hormonal libera levonorgestrel localmente con alta eficacia y puede reducir el sangrado; el DIU de cobre es hormonofree y dura hasta diez años. Implantes subdérmicos, parches, anillos vaginales e inyectables mensuales o trimestrales amplían el abanico de elección.',
      'Los métodos de barrera como preservativos masculinos o femeninos son los únicos que protegen simultáneamente contra infecciones de transmisión sexual, por lo que su uso combinado con otro método es recomendable en relaciones no monógamas o nuevas parejas. La lactancia amenorrea, el coito interrumpido y el método del calendario tienen mayor margen de error y requieren formación y disciplina. Antes de iniciar hormonales, valora tu presión arterial, historial de migraña con aura, trombosis previa, tabaquismo en mayores de treinta y cinco años y antecedentes familiares de cáncer de mama.',
      'Es normal experimentar spotting inicial, cambios de humor o sensibilidad mamaria las primeras tres a seis ciclos mientras tu cuerpo se adapta. Lleva un registro de efectos secundarios en tu calendario para comentarlos en consulta. Si buscas anticonceptivos no solo para prevenir embarazo sino también para regular ciclos irregulares, reducir acné o controlar síntomas de SOP, tu ginecólogo puede personalizar la formulación. Nunca interrumpas un tratamiento hormonal sin supervisión médica, ya que pueden aparecer sangrados irregulares o recuperarse la fertilidad antes de lo esperado.'
    ]),
    fertilidad: buildResponse([
      'Comprender tu ventana fértil es uno de los pasos más empoderadores cuando deseas concebir. La fertilidad se concentra aproximadamente en cinco días previos a la ovulación y el día de la ovulación misma, porque el espermatozoide puede sobrevivir en el tracto reproductivo femenino entre tres y cinco días, mientras que el óvulo vive alrededor de doce a veinticuatro horas tras ser liberado. En un ciclo de veintiocho días, la ovulación suele ocurrir cerca del día catorce, pero si tus ciclos duran treinta y cinco días, será más tardía; si duran veinticuatro, será más temprana.',
      'Señales de ovulación incluyen moco cervical transparente y elástico similar a clara de huevo, ligero aumento de temperatura basal tras la ovulación, sensibilidad mamaria unilateral, libido elevada y, en algunas mujeres, dolor pélvico breve llamado mittelschmerz. Registrar temperatura basal cada mañana antes de levantarte, observar moco cervical y utilizar tests de LH de farmacia aumenta la precisión. Mantén un peso saludable, limita alcohol y cafeína, deja de fumar y asegura adecuado descanso, ya que el estrés crónico eleva el cortisol y puede alterar la ovulación.',
      'Si llevas más de doce meses intentando embarazo sin éxito (o seis meses si tienes más de treinta y cinco años), conviene una evaluación de pareja con espermograma, análisis hormonales, ecografía folicular y, si procede, estudio de trompas. No te culpes: la infertilidad tiene múltiples causas y tratamientos efectivos desde inducción de ovulación hasta fecundación in vitro. Mientras tanto, disfruta de la intimidad sin convertir cada relación en una obligación, porque la presión emocional también impacta la fertilidad.'
    ]),
    embarazo: buildResponse([
      'Sospechar un embarazo genera una mezcla natural de ilusión, nerviosismo y muchas preguntas. El primer indicio suele ser la ausencia de menstruación, aunque también puede retrasarse por estrés, viajes, cambios de peso o enfermedad. Los tests caseros de orina detectan la hormona hCG y son fiables a partir del primer día de retraso menstrual, preferiblemente con la primera orina de la mañana. Un resultado positivo debe confirmarse con analítica sanguínea y ecografía obstétrica para datar la gestación y descartar embarazo ectópico.',
      'Los primeros trimestres implican adaptaciones importantes: ácido fólico cuatrocientos microgramos diarios reduce riesgo de defectos del tubo neural; evita alcohol, tabaco y drogas; limita pescados altos en mercurio; informa a tu médico de cualquier medicación habitual. Náuseas matutinas, fatiga extrema, sensibilidad a olores, aumento de frecuencia urinaria y tensión mamaria son comunes y no siempre indican patología. Sangrado leve puede ocurrir en la implantación, pero sangrado abundante con dolor intenso requiere valoración urgente.',
      'Calcula tu fecha probable de parto sumando dos hundred ochenta días a la fecha de tu última menstruación si conoces el inicio del ciclo, o basándote en medición ecográfica del largo cefalocaudal. Programa controles prenatales según protocolo de tu país, mantén actividad física moderada salvo contraindicación y construye una red de apoyo emocional. Cada embarazo es único: confía en tu intuición pero valida tus dudas con profesionales que te respeten y escuchen.'
    ]),
    primera_vez: buildResponse([
      'La primera experiencia sexual es un hito personal que merece respeto, información y cero presión externa. No existe una edad correcta universal: lo importante es que sea una decisión autónoma, consensuada y en un contexto de seguridad emocional y física. El deseo, la curiosidad y la abstinencia son igualmente válidos mientras sean elecciones informadas. Comunica abiertamente con tu pareja sobre límites, expectativas y métodos de protección antes de iniciar cualquier contacto íntimo.',
      'Es frecuente que la primera penetración no incluya rompimiento visible del himen ni sangrado, ya que el himen es un tejido elástico con variaciones anatómicas. Más relevante es la lubricación: dedica tiempo a la excitación previa, usa lubricante a base de agua si es necesario y adopta posiciones cómodas donde controles profundidad y ritmo. El preservativo protege contra embarazos no deseados e infecciones; combínalo con métodos adicionales si usas medicación que interactúe con anticonceptivos hormonales.',
      'Es normal sentir nervios, risa, incomodidad momentánea o incluso no alcanzar orgasmo las primeras veces. El placer sexual se aprende con paciencia y exploración sin juicios. Si experimentas dolor persistente más allá de una leve molestia inicial, podría haber vaginismo, sequedad por ansiedad o infección y conviene consultar. Recuerda que la virginidad es un concepto social, no médico: tu valor no depende de tu historial sexual.'
    ]),
    salud_mental: buildResponse([
      'Lo que sientes es válido y no estás sola. Las fluctuaciones hormonales a lo largo del ciclo menstrual influyen directamente en neurotransmisores como serotonina y dopamina, lo que explica cambios de humor, ansiedad o llanto en fase premenstrual y lútea. Si la tristeza es constante, interfiere con tu trabajo, relaciones o sueño durante más de dos semanas, podría superponerse una depresión que requiere atención especializada independientemente del ciclo.',
      'Estrategias de autocuidado inmediato incluyen respiración cuatro-siete-ocho, caminatas al aire libre, limitar noticias y redes en momentos de agobio, escribir en un diario emocional como el de bienestar de Menstruapp y mantener rutinas de sueño regulares. Hablar con una amiga de confianza, grupo de apoyo o psicóloga puede aliviar la carga. Técnicas de mindfulness y terapia cognitivo-conductual tienen evidencia sólida para ansiedad y trastorno disfórico premenstrual.',
      'Si tienes pensamientos de hacerte daño o de que la vida no vale la pena, busca ayuda urgente en servicios de emergencia o líneas de crisis de tu país. No esperes a sentirte peor para pedir apoyo: la salud mental es tan importante como la física. Combinar seguimiento ginecológico con apoyo psicológico ofrece la mejor perspectiva cuando síntomas físicos y emocionales se entrelazan cíclicamente.'
    ]),
    menopausia: buildResponse([
      'La menopausia marca el cese permanente de la menstruación tras doce meses consecutivos sin periodo, generalmente entre los cuarenta y cinco y cincuenta y cinco años, aunque la perimenopausia puede iniciarse años antes con ciclos irregulares, sofocos, sudores nocturnos, sequedad vaginal, alteraciones del sueño y cambios de humor. Estos síntomas responden a la disminución progresiva de estrógenos y progesterona ovaricos.',
      'El manejo incluye desde cambios de estilo de vida —ropa en capas, ambientes frescos, ejercicio de carga para salud ósea, cesación del tabaco— hasta terapia hormonal de la menopausia cuando no existen contraindicaciones y los síntomas afectan la calidad de vida. Lubrificantes y hidratantes vaginales no hormonales ayudan con la atrofia genitourinaria. Suplementos como isoflavonas de soja tienen evidencia moderada; evita productos sin regulación que prometan milagros.',
      'La menopausia también reduce el riesgo de ciertos tumores hormonodependientes pero incrementa el de osteoporosis y enfermedad cardiovascular, por lo que controles de densidad ósea, perfil lipídico y presión arterial son esenciales. Mantén relaciones sociales activas y proyectos personales: la menopausia no es un fin sino una transición hacia una etapa con nuevas libertades y sabiduría corporal.'
    ]),
    endometriosis: buildResponse([
      'La endometriosis ocurre cuando tejido similar al endometrio crece fuera del útero, frecuentemente en ovarios, ligamentos uterinos, intestino o vejiga. Afecta aproximadamente a una de cada diez mujeres en edad reproductiva y se caracteriza por dolor pélvico crónico, dismenorrea progresiva, dolor durante o después de relaciones sexuales, dolor al defecar o orinar en menstruación, sangrado abundante e infertilidad en algunos casos.',
      'El diagnóstico suele retrasarse años porque se normaliza el dolor menstrual. La ecografía especializada y la resonancia pueden detectar endometriomas, pero la laparoscopia diagnóstica y terapéutica sigue siendo el estándar de oro. El tratamiento combina analgesia antiinflamatoria, hormonas que suprimen la actividad endometrial, fisioterapia pélvica y cirugía conservadora cuando procede. La endometriosis profunda requiere equipos multidisciplinares.',
      'Registrar tus síntomas diariamente fortalece la comunicación con tu especialista y documenta patrones. Únete a asociaciones de pacientes para apoyo emocional y actualización científica. Aunque es crónica, existen estrategias efectivas para recuperar calidad de vida, preservar fertilidad cuando lo desees y reducir recurrencias postquirúrgicas con seguimiento continuado.'
    ]),
    sop: buildResponse([
      'El síndrome de ovario poliquístico es una condición endocrina frecuente que combina ciclos irregulares o ausentes, signos de hiperandrogenismo como acné, hirsutismo o caída capilar en patrón masculino, y ovarios poliquísticos en ecografía. También se asocia con resistencia a la insulina, dificultad para perder peso, riesgo de diabetes tipo dos y alteraciones metabólicas que benefician de estilo de vida activo y alimentación con bajo índice glucémico.',
      'El diagnóstico sigue criterios de consenso internacional y requiere descartar otras causas de hiperandrogenismo. El tratamiento se personaliza: anticonceptivos orales para regular ciclos y mejorar piel, metformina si hay resistencia insulínica, inductores de ovulación como letrozol si buscas embarazo, y tratamientos cosméticos locales para vello. La pérdida del cinco al diez por ciento del peso corporal puede restaurar ovulación espontánea en muchos casos.',
      'El SOP no define tu feminidad ni tu capacidad de ser madre, aunque puede requerir más tiempo y apoyo médico. El seguimiento anual con perfil metabólico, ecografía y evaluación dermatológica previene complicaciones a largo plazo. Usa el test de riesgo en bienestar y comparte resultados con tu endocrinóloga o ginecóloga para un plan integral.'
    ]),
    flujo_vaginal: buildResponse([
      'El flujo vaginal fisiológico varía a lo largo del ciclo: seco tras la menstruación, cremoso en fase folicular, abundante y elástico en ovulación, y más espeso en fase lútea. Estas variaciones protegen y lubrican. Sin embargo, cambios bruscos de color, olor fuerte a pescado, textura de requesón, picor intenso, ardor o dolor al orinar sugieren infección o desequilibrio del microbioma vaginal.',
      'La candidiasis presenta picor intenso y flujo blanco grumoso; la vaginosis bacteriana produce olor y flujo grisáceo; la tricomoniasis puede causar espuma y enrojecimiento. No te automediques con duchas internas, perfumes o antibióticos sin diagnóstico porque empeoran la situación. Usa ropa interior de algodón, evita ropa muy ajustada húmeda y limpia genitales solo con agua o jabones específicos de pH ácido.',
      'Las relaciones sexuales protegidas, probióticos bajo indicación y tratamiento de pareja en infecciones transmisibles son pilares de prevención. Una visita al ginecólogo con examen y cultivo orienta el tratamiento correcto. Registrar moco cervical en el calendario te ayuda a distinguir lo normal de lo patológico con mayor seguridad.'
    ]),
    relaciones_sexuales: buildResponse([
      'La sexualidad saludable integra placer, consentimiento mutuo continuo, comunicación y seguridad. El deseo fluctúa con el ciclo: muchas mujeres notan mayor libido en ovulación y menor en fase lútea o con estrés crónico. Esto es normal y no indica problema de pareja necesariamente. Hablar sobre fantasías, ritmos y lo que resulta placentero reduce ansiedad de rendimiento.',
      'El orgasmo femenino puede ser clitoriano, vaginal o mixto; muchas mujeres necesitan estimulación directa del clitoris para alcanzarlo y eso es completamente normal. La lubricación natural varía; usar lubricante no es un fallo. Si el dolor aparece con la penetración, detente, evalúa posición, lubricación y posibles causas médicas como infección, vaginismo o endometriosis.',
      'Explora tu cuerpo sin presión, prioriza el aftercare emocional y establece límites claros. Si experimentas deseo muy bajo persistente que te angustia, existen terapias sexuales y revisión hormonal. Recuerda que el consentimiento puede retirarse en cualquier momento y que tu cuerpo merece respeto absoluto.'
    ]),
    nutricion_ciclo: buildResponse([
      'La nutrición cíclica reconoce que tus necesidades metabólicas cambian con las fases menstruales. En fase menstrual prioriza hierro hemo de legumbres, carnes magras o suplementos si hay anemia, vitamina C para absorción y alimentos calientes reconfortantes. En fase folicular incrementa vegetales crucíferos y proteínas magras que apoyan estrógenos saludables. En ovulación consume antioxidantes, semillas de girasol y calabaza según seed cycling, además de hidratación extra.',
      'En fase lútea el cuerpo quema más calorías y puede pedir carbohidratos complejos, magnesio de chocolate negro al setenta por ciento, nueces y plátano para reducir antojos y irritabilidad. Reduce sodio para minimizar retención de líquidos y aumenta omega-3 de pescado azul o linaza para modular inflamación. Evita saltos extremos de azúcar que empeoran fatiga premenstrual.',
      'Suplementos como magnesio, vitex agnus-castus o hierro solo bajo análisis y supervisión profesional. Lleva registro de síntomas y alimentación para identificar intolerancias personales. La alimentación no reemplaza tratamiento médico pero es un pilar poderoso de bienestar hormonal integrado.'
    ]),
    ciclo_general: buildResponse([
      'Tu ciclo menstrual es la quinta señal vital femenina y refleja salud cardiovascular, ósea, tiroidea y reproductiva. Dura en promedio veintiocho días, aunque entre veintiuno y treinta y cinco es considerado normal. La fase menstrual dura típicamente tres a siete días con sangrado; la folicular reconstruye el endometrio bajo estrógenos; la ovulatoria libera el óvulo; la lútea prepara el útero con progesterona y, si no hay embarazo, inicia de nuevo.',
      'Registrar inicio y fin de periodo, síntomas, moco cervical, temperatura basal, ánimo y actividad física permite a Menstruapp calcular patrones personalizados, predecir próximos ciclos y mostrar ventanas fértiles y de síndrome premenstrual. La regularidad puede alterarse por estrés, viajes, enfermedad, cambios de peso, lactancia o trastornos hormonales.',
      'Observar tu ciclo te empodera para anticipar necesidades: más descanso en menstruación, mayor energía creativa post-menstrual, comunicación clara en PMS y autocuidado extra en fase lútea. Cualquier cambio brusco persistente merece evaluación médica, pero la mayoría de variaciones leves son adaptaciones normales del cuerpo sabio.'
    ]),
    acne_hormonal: buildResponse([
      'El acné hormonal suele aparecer en la mandíbula, barbilla y cuello, empeorando en fase premenstrual y lútea por aumento de progesterona y andrógenos relativos. No es culpa de la higiene exclusivamente: factores internos incluyen genética, SOP, estrés y cosméticos comedogénicos. Limpia suavemente dos veces al día, usa protectores solares oil-free y evita reventar lesiones para prevenir cicatrices e infección.',
      'Tratamientos tópicos con peróxido de benzoilo, retinoides o ácido salicílico ayudan en casos leves. Anticonceptivos antiandrogénicos, espironolactona o isotretinoína oral se reservan para moderado-severo bajo supervisión dermatológica por sus riesgos en embarazo. La dieta con bajo índice glucémico y reducción de lácteos enteros muestra beneficio en algunos estudios, aunque la evidencia varía individualmente.',
      'Sé paciente: la piel tarda seis a doce semanas en responder. El maquillaje no mineral no tapa el problema si no retiras bien. Combina cuidado dermatológico con seguimiento ginecológico si sospechas SOP o ciclos irregulares asociados.'
    ]),
    ejercicio_ciclo: buildResponse([
      'Entrenar en sintonía con tu ciclo optimiza resultados y reduce lesiones. En menstruación, prioriza yoga restaurativo, caminatas y estiramientos si el dolor lo permite; escucha si necesitas descanso total. En fase folicular el estrógeno favorece fuerza y entrenamientos de alta intensidad, HIIT y pesas progresivas. En ovulación alcanzas pico de coordinación y potencia, ideal para récords personales con calentamiento cuidadoso de ligamentos.',
      'En fase lútea la temperatura corporal sube y la progesterona puede generar fatiga: reduce intensidad, enfócate en cardio moderado, pilates y movilidad. Hidrátate más, consume proteína post-entreno y respeta sueño de calidad para recuperación hormonal. No compares tu rendimiento semana a semana sin contexto cíclico.',
      'El ejercicio regular mejora síntomas de PMS, regula insulina en SOP y fortalece huesos premenopáusicas. Si practicas deporte de élite con amenorrea por déficit energético, consulta nutrición deportiva especializada. El movimiento es medicina cuando se dosifica con inteligencia corporal.'
    ]),
    pms_spm: buildResponse([
      'El síndrome premenstrual agrupa síntomas emocionales y físicos en los días previos a la menstruación: irritabilidad, ansiedad, hinchazón, dolor mamario, antojos y fatiga. Cuando es severo e interfiere gravemente, puede clasificarse como trastorno disfórico premenstrual y requiere abordaje médico específico con antidepresivos en fase lútea, terapia hormonal o psicológica.',
      'Estrategias de alivio incluyen ejercicio aeróbico regular, reducción de cafeína y alcohol, sueño constante, suplementación de calcio y vitamina B6 bajo orientación, y técnicas de manejo del estrés. Registrar síntomas confirma el patrón cíclico y diferencia PMS de otras condiciones psiquiátricas. La terapia cognitivo-conductual muestra eficacia comparable a fármacos leves en estudios controlados.',
      'No minimices tu experiencia: pedir ayuda no es exagerar. Un calendario detallado durante tres ciclos es la herramienta más valiosa que puedes llevar a tu consulta ginecológica o psiquiátrica para personalizar tratamiento.'
    ]),
    sueno_ciclo: buildResponse([
      'El sueño fluctúa con el ciclo hormonal. La progesterona en fase lútea tiene efecto sedante pero también eleva temperatura corporal, pudiendo fragmentar el descanso. En menstruación, el dolor o necesidad de cambiar protección nocturna interrumpe ciclos REM. La melatonina y cortisol también varían, afectando ritmo circadiano.',
      'Higiene del sueño: horario fijo, habitación fresca y oscura, evitar pantallas una hora antes, limitar cafeína post mediodía y cenas ligeras. Magnesio y té de manzanilla pueden ayudar en fase premenstrual. Si los ronquidos o pausas respiratorias aparecen, descarta apnea del sueño. Registra horas de sueño en el calendario para correlacionar con fatiga diurna.',
      'Dormir siete a nueve horas es inversión en salud hormonal, piel y estado de ánimo. Si el insomnio persiste todo el mes, busca evaluación integral más allá del componente cíclico.'
    ]),
    amenorrea: buildResponse([
      'La amenorrea es la ausencia de menstruación: primaria si nunca inició hasta los quince años con desarrollo puberal, secundaria si desaparece tres o más meses tras ciclos establecidos. Causas incluyen embarazo, estrés extremo, déficit calórico, ejercicio excesivo, hiperprolactinemia, tiroides, SOP, insuficiencia ovárica prematura o patología hipotalámica.',
      'No ignores meses sin periodo aunque no planees embarazo: la falta de estrógenos prolongada afecta densidad ósea y salud cardiovascular. Un embarazo debe descartarse siempre primero. Análisis hormonales, ecografía pélvica y historia clínica detallada orientan el diagnóstico. Tratamientos van desde nutrición y reducción de estrés hasta terapia hormonal sustitutiva según edad y causa.',
      'Tu ciclo es un barómetro metabólico. Recuperarlo con apoyo profesional protege fertilidad futura y bienestar sistémico integral.'
    ]),
    infecciones_urinarias: buildResponse([
      'Las infecciones urinarias son frecuentes en mujeres por uretra más corta. Síntomas incluyen ardor al orinar, urgencia, orina turbia o maloliente, dolor suprapúbico y a veces sangre. No confundas con irritación vaginal o infección de transmisión sexual. Beber agua, orinar después de relaciones sexuales y evitar retener orina reduce recurrencias.',
      'El tratamiento antibiótico requiere prescripción médica tras urocultivo cuando es recurrente. Los remedios caseros no sustituyen antibióticos en infección establecida. Si hay fiebre, dolor lumbar o vómitos, podría ascender a riñón y necesitas atención urgente. En menopausia, la atrofia urogenital incrementa riesgo y puede beneficiarse de estrógenos locales.',
      'Registra episodios en tu calendario para identificar desencadenantes como relaciones, viajes o métodos anticonceptivos específicos.'
    ]),
    autoexploracion: buildResponse([
      'La autoexploración mamaria mensual complementa mamografías según edad y riesgo. Realízala días cinco a diez del ciclo cuando las mamas están menos densas, o fecha fija si no menstrúas. Observa en espejo cambios de forma, piel de naranja o pezón hundido; palpa en círculos con yemas de dedos cubriendo todo el pecho y axila.',
      'Busca bultos duros, cambios nuevos persistentes, secreción espontánea unilateral o sangrado del pezón. La mayoría de hallazgos son benignos como quistes, pero la detección temprana salva vidas. Combina con examen clínico anual y estudios de imagen según protocolo nacional para tu grupo de edad y antecedentes familiares.',
      'Normaliza conocer tu anatomía sin miedo: es autocuidado feminista y responsable. Cualquier duda merece consulta sin esperar al próximo ciclo.'
    ]),
    libido_baja: buildResponse([
      'La libido baja es multifactorial: estrés, fatiga, conflictos de pareja, medicamentos como antidepresivos, anticonceptivos, disfunción tiroidea, dolor crónico, imagen corporal y fluctuaciones hormonales cíclicas. No es obligatorio desear sexo constantemente para estar sana; lo relevante es si la ausencia de deseo te causa sufrimiento.',
      'Mejora sueño, comunicación emocional, tiempo para intimidad sin presión de penetración, reducción de alcohol y manejo del estrés. Terapia de pareja o sexología clínica abordan causas psicológicas. Revisión hormonal de testosterona libre, prolactina y tiroides puede indicar tratamiento médico en casos selectos bajo especialista.',
      'Explora sensate focus y placer sin objetivo orgásmico. Tu sexualidad puede reconfigurarse en cada etapa vital con paciencia y sin vergüenza.'
    ]),
    postparto: buildResponse([
      'El postparto transforma cuerpo y mente. El sangrado loquios dura semanas disminuyendo gradualmente; la lactancia puede retrasar la menstruación pero no es anticonceptivo fiable exclusivo. El blues del posparto con llanto y labilidad es común en la primera semana; si persiste tristeza intensa, desapego del bebé o pensamientos intrusivos, sospecha depresión o psicosis posparto y busca ayuda urgente.',
      'Recuperación pélvica incluye ejercicios de suelo pélvico, evitar penetración hasta autorización médica, hidratación y nutrición rica en hierro si hubo anemia. El dolor en cicatriz cesárea o episiotomía debe mejorar progresivamente; empeoramiento sugiere infección. Planifica descanso real y red de apoyo doméstico.',
      'La maternidad no exige perfección. Prioriza tu salud mental y física porque un cuidador sostenible beneficia a toda la familia.'
    ]),
    tiroides_hormonas: buildResponse([
      'La glándula tiroides regula metabolismo, energía, temperatura y ciclo menstrual. El hipotiroidismo puede alargar ciclos y aumentar sangrado; el hipertiroidismo acorta o suprime menstruación. Síntomas como fatiga extrema, cambio de peso inexplicable, caída de cabello, intolerancia al frío o calor, palpitaciones y estreñimiento o diarrea crónica justifican TSH y T4 libre en analítica.',
      'El tratamiento con levotiroxina normaliza ciclos en muchas pacientes pero requiere ajuste periódico. El estrés crónico eleva cortisol y puede alterar eje hipotálamo-hipófisis-ovario simulando tiroides disfuncionales. No automediques yodine ni suplementos tiroides sin diagnóstico.',
      'Integra seguimiento endocrinológico con tu calendario menstrual para ver respuesta al tratamiento en tres a seis meses.'
    ]),
    vulvodinia: buildResponse([
      'La vulvodinia es dolor vulvar crónico sin causa visible evidente, a menudo descrito como ardor, punzadas o hipersensibilidad al contacto, incluyendo ropa ajustada o relaciones. Se asocia con disfunción del suelo pélvico, hipersensibilización nerviosa central, antecedentes de infecciones o traumas. El diagnóstico es clínico excluyendo infecciones, dermatosis y liquen escleroso.',
      'Tratamiento multidisciplinar incluye fisioterapia pélvica especializada, terapia sexual, gabapentinoides o crema de lidocaína tópica, y en algunos casos bloqueos nerviosos. Evita jabones agresivos, depilación irritante y ropa sintética. El abordaje psicológico reduce anticipación del dolor que perpetúa el ciclo.',
      'Insiste en ser escuchada si te han dicho que es psicológico sin exploración física completa: la vulvodinia es real y tratable con equipo experto.'
    ])
  };

  const INTENT_MAP = {
    dolor_menstrual: { keywords: ['dolor', 'cólico', 'calambres', 'duele', 'me duele', 'colico', 'cólicos'], response: RESPONSES.dolor_menstrual },
    anticonceptivos: { keywords: ['anticonceptivo', 'pastilla', 'condón', 'condon', 'diu', 'implante', 'parche', 'pildora'], response: RESPONSES.anticonceptivos },
    fertilidad: { keywords: ['quedar embarazada', 'fertilidad', 'ovulación', 'ovulacion', 'concebir', 'fertil'], response: RESPONSES.fertilidad },
    embarazo: { keywords: ['embarazo', 'embarazada', 'test de embarazo', 'falta el periodo', 'gestacion'], response: RESPONSES.embarazo },
    primera_vez: { keywords: ['primera vez', 'virginidad', 'primera relación', 'primera relacion'], response: RESPONSES.primera_vez },
    salud_mental: { keywords: ['ansiosa', 'deprimida', 'triste', 'llorar', 'no puedo más', 'agobio', 'ansiedad', 'depresion'], response: RESPONSES.salud_mental },
    menopausia: { keywords: ['menopausia', 'sofocos', 'climaterio', 'perimenopausia'], response: RESPONSES.menopausia },
    endometriosis: { keywords: ['endometriosis', 'adenomiosis', 'dolor pélvico crónico', 'pelvico cronico'], response: RESPONSES.endometriosis },
    sop: { keywords: ['sop', 'ovario poliquístico', 'ovario poliquistico', 'síndrome de ovario', 'sindrome de ovario'], response: RESPONSES.sop },
    flujo_vaginal: { keywords: ['flujo', 'secreción', 'secrecion', 'picor vaginal', 'candidiasis', 'infección', 'infeccion'], response: RESPONSES.flujo_vaginal },
    relaciones_sexuales: { keywords: ['sexo', 'relación sexual', 'relacion sexual', 'orgasmo', 'libido', 'deseo'], response: RESPONSES.relaciones_sexuales },
    nutricion_ciclo: { keywords: ['qué comer', 'que comer', 'dieta', 'hierro', 'magnesio', 'suplemento', 'nutricion'], response: RESPONSES.nutricion_ciclo },
    ciclo_general: { keywords: ['mi ciclo', 'explícame mi ciclo', 'explicame mi ciclo', 'fases del ciclo', 'menstruacion', 'regla'], response: RESPONSES.ciclo_general },
    acne_hormonal: { keywords: ['acné', 'acne', 'granos', 'espinillas', 'piel'], response: RESPONSES.acne_hormonal },
    ejercicio_ciclo: { keywords: ['ejercicio', 'entrenar', 'gimnasio', 'deporte', 'actividad física'], response: RESPONSES.ejercicio_ciclo },
    pms_spm: { keywords: ['pms', 'spm', 'premenstrual', 'sindrome premenstrual'], response: RESPONSES.pms_spm },
    sueno_ciclo: { keywords: ['insomnio', 'dormir', 'sueño', 'sueno', 'despertar'], response: RESPONSES.sueno_ciclo },
    amenorrea: { keywords: ['no me baja', 'sin periodo', 'amenorrea', 'retraso menstrual'], response: RESPONSES.amenorrea },
    infecciones_urinarias: { keywords: ['orinar', 'infección urinaria', 'cistitis', 'ardor al orinar'], response: RESPONSES.infecciones_urinarias },
    autoexploracion: { keywords: ['autoexploración', 'autoexploracion', 'mama', 'seno', 'bulto'], response: RESPONSES.autoexploracion },
    libido_baja: { keywords: ['libido baja', 'sin deseo', 'no tengo ganas'], response: RESPONSES.libido_baja },
    postparto: { keywords: ['postparto', 'posparto', 'después del parto', 'lactancia'], response: RESPONSES.postparto },
    tiroides_hormonas: { keywords: ['tiroides', 'tsh', 'hipotiroidismo', 'hipertiroidismo'], response: RESPONSES.tiroides_hormonas },
    vulvodinia: { keywords: ['vulvodinia', 'ardor vulvar', 'dolor al tacto'], response: RESPONSES.vulvodinia }
  };

  const GENERIC_TOPICS = ['dolor menstrual y cólicos', 'anticonceptivos y planificación', 'salud mental y ciclo'];

  /**
   * @description Normaliza texto para comparación
   * @param {string} text - Texto de entrada
   * @returns {string}
   */
  const normalize = (text) => (text || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  /**
   * @description Detecta intención del mensaje del usuario
   * @param {string} input - Mensaje del usuario
   * @returns {string|null} Clave de intención o null
   */
  const detectIntent = (input) => {
    const text = normalize(input);
    for (const [key, data] of Object.entries(INTENT_MAP)) {
      if (data.keywords.some((kw) => text.includes(normalize(kw)))) {
        return key;
      }
    }
    return null;
  };

  /**
   * @description Genera respuesta de Luna según el mensaje
   * @param {string} input - Mensaje del usuario
   * @param {Object} [context={}] - Contexto opcional (nombre, fase)
   * @returns {string} Respuesta de la IA
   */
  const processMessage = (input, context = {}) => {
    const intent = detectIntent(input);
    if (intent && INTENT_MAP[intent]) {
      return INTENT_MAP[intent].response;
    }
    const name = context.name || 'querida';
    return buildResponse([
      `Hola ${name}, gracias por confiar en mí con tu consulta. Aunque no identifiqué un tema específico en tu mensaje, quiero que sepas que estoy aquí para acompañarte en cualquier duda sobre tu salud íntima, emocional o reproductiva. A veces cuesta encontrar las palabras exactas, y eso está completamente bien.`,
      'Puedes contarme con más detalle si te duele algo, si notas cambios en tu ciclo, si tienes dudas sobre anticonceptivos, fertilidad, síntomas emocionales o cualquier inquietud médica. También puedes usar las sugerencias rápidas del chat para iniciar conversaciones sobre cólicos, tu ciclo, anticonceptivos o apoyo emocional.',
      `Mientras tanto, te sugiero explorar estos temas: ${GENERIC_TOPICS.join('; ')}. Recuerda que soy una guía informativa basada en evidencia general y no sustituyo una consulta presencial personalizada.`
    ]);
  };

  /**
   * @description Retorna delay aleatorio de escritura simulada
   * @returns {number} Milisegundos entre 800 y 1500
   */
  const getTypingDelay = () => 800 + Math.floor(Math.random() * 700);

  /**
   * @description Exporta sesión de chat a texto formateado
   * @param {Array<{role:string,text:string,time:string}>} messages - Mensajes
   * @param {string} userName - Nombre de usuaria
   * @returns {string}
   */
  const formatSessionExport = (messages, userName) => {
    const now = new Date().toLocaleString('es-ES');
    let out = `=== SESIÓN LUNA - MENSTRUAPP ===\nFecha: ${now}\nUsuaria: ${userName}\n---\n`;
    messages.forEach((m) => {
      const who = m.role === 'user' ? 'Tú' : 'Luna';
      out += `[${m.time}] ${who}: ${m.text}\n`;
    });
    out += '---\n[FIN DE SESIÓN]';
    return out;
  };

  window.CoachModule = {
    processMessage,
    detectIntent,
    getTypingDelay,
    formatSessionExport,
    INTENT_MAP,
    GENERIC_TOPICS
  };

  window.runTests_coach = () => {
    console.group('🧪 Tests Coach Module');
    console.assert(detectIntent('tengo mucho dolor de cólicos') === 'dolor_menstrual', '❌ intent dolor');
    console.log('✅ Test 1 passed: detectIntent dolor');
    const r = processMessage('hola');
    console.assert(r.includes(DISCLAIMER), '❌ disclaimer');
    console.log('✅ Test 2 passed: generic response');
    console.assert(getTypingDelay() >= 800 && getTypingDelay() <= 1500, '❌ delay');
    console.log('✅ Test 3 passed: typing delay');
    console.groupEnd();
  };
})();
