// Educational library (English). Reference sources: WHO, FIGO (2018), NHS, ACOG, FSRH and NICE.
// Informative, judgement-free and never a diagnosis. Article/category ids are shared by all
// languages (checked by the integrity tests).

/** @type {import('../views/learn.js').Library} */
export default {
  categories: [
    { id: 'ciclo', title: 'Your cycle', icon: 'calendar', desc: "Phases, ovulation and what's normal" },
    { id: 'dolor', title: 'Pain and symptoms', icon: 'activity', desc: 'Period pain, heavy bleeding and common conditions' },
    { id: 'productos', title: 'Products and hygiene', icon: 'droplets', desc: 'Pads, tampons, cups and care' },
    { id: 'fertilidad', title: 'Fertility', icon: 'sprout', desc: 'Trying to conceive, fertility signs and tests' },
    { id: 'anticoncepcion', title: 'Contraception', icon: 'shield', desc: 'Methods, missed pills and emergency contraception' },
    { id: 'embarazo', title: 'Pregnancy and postpartum', icon: 'baby', desc: 'Warning signs, loss and recovery' },
    { id: 'menopausia', title: 'Menopause', icon: 'leaf', desc: 'Perimenopause, symptoms and long-term health' },
    { id: 'bienestar', title: 'Wellbeing', icon: 'heart-pulse', desc: 'Mood, food, exercise and sleep' },
    { id: 'mitos', title: 'Myths and facts', icon: 'badge-check', desc: 'What people say and what we know' },
  ],

  articles: [
    // ---------------------------------------------------------------- Your cycle
    {
      id: 'ciclo-menstrual',
      category: 'ciclo',
      title: 'The phases of your cycle',
      summary: 'What happens in your body from the start of one period to the next.',
      keywords: ['cycle', 'phases', 'follicular', 'luteal', 'hormones', 'oestrogen', 'estrogen', 'progesterone', 'day 1'],
      modes: ['track', 'conceive', 'avoid'],
      body: [
        {
          p: "The menstrual cycle runs from the first day of bleeding (day 1) to the day before your next period. In adults it usually lasts 24 to 38 days, and it's normal for it to vary a little from month to month.",
        },
        { h: '1. Menstruation' },
        {
          p: 'The endometrium (the lining of the uterus) sheds and leaves the body as bleeding, usually for 2 to 8 days. Hormone levels are low, which is why tiredness is common.',
        },
        { h: '2. Follicular phase' },
        {
          p: 'The ovaries prepare several follicles and one matures. Oestrogen rises, the lining thickens and many people feel more energetic and upbeat. This is the phase whose length varies most.',
        },
        { h: '3. Ovulation' },
        {
          p: 'A surge of the hormone LH releases the egg from the ovary. The egg lives 12–24 hours and sperm up to 5 days, so the fertile days are the 5 before ovulation plus the day itself.',
        },
        { h: '4. Luteal phase' },
        {
          p: "The empty follicle (corpus luteum) makes progesterone, which raises your basal temperature and prepares the uterus. If there's no pregnancy, hormones drop and your period comes. It lasts about 11–17 days and is fairly stable for each person.",
        },
        {
          ul: [
            "With hormonal contraception there's no ovulation or natural phases: bleeding in the break week is a “withdrawal bleed”.",
            'Your logs let the app estimate your own phases, not an average.',
          ],
        },
      ],
      related: ['ovulacion', 'ciclos-irregulares', 'sindrome-premenstrual'],
    },
    {
      id: 'ciclos-irregulares',
      category: 'ciclo',
      title: "Irregular cycles: what's normal",
      summary: 'Normal ranges, the most common causes of irregular cycles and when to get checked.',
      keywords: ['irregular', 'late', 'missed period', 'no period', 'amenorrhoea', 'amenorrhea', 'short cycle', 'long cycle', 'normal', 'variation'],
      modes: ['track', 'conceive', 'perimenopause'],
      body: [
        {
          p: 'According to the International Federation of Gynecology and Obstetrics (FIGO), a normal adult cycle lasts 24 to 38 days, periods last up to 8 days, and the difference between your shortest and longest cycle is no more than 7–9 days.',
        },
        { p: 'In the first years after your first period and during perimenopause, cycles are often more variable (21–45 days in adolescence).' },
        { h: 'Common causes' },
        {
          ul: [
            'Stress, travel, schedule changes or illness.',
            'Weight loss or gain, restrictive diets or very intense exercise.',
            'Breastfeeding and the months after giving birth.',
            'Polycystic ovary syndrome (PCOS) or thyroid or prolactin problems.',
            'Starting or changing hormonal contraception.',
            'Pregnancy: if it is possible, take a test.',
          ],
        },
        { p: "A single irregular cycle isn't usually a concern. The pattern is what matters, which is why logging for several months helps." },
      ],
      consult: [
        "You go 3 months or more without a period and aren't pregnant or breastfeeding.",
        'Your cycles are usually shorter than 24 days or longer than 38.',
        'You bleed between periods or after sex.',
        'You also have severe acne, excess hair or unexplained weight changes.',
      ],
      related: ['sop', 'test-embarazo', 'primera-regla'],
    },
    {
      id: 'colores-flujo',
      category: 'ciclo',
      title: 'Period blood colour: what it means',
      summary: 'From bright red to brown, most colours are normal. Here are the ones to watch.',
      keywords: ['colour', 'color', 'brown', 'black', 'pink', 'dark', 'clots', 'grey', 'orange'],
      body: [
        {
          p: 'The colour of period blood mostly depends on how long it has been since it shed: the longer it takes to leave the body, the more it oxidises and the darker it looks.',
        },
        {
          ul: [
            'Bright red: fresh bleeding, typical of the heaviest days.',
            'Dark red: blood that stayed in the uterus a little longer, common when you wake up.',
            'Brown or nearly black: old blood, usual at the start and end of a period.',
            'Pink: blood mixed with discharge; common with light periods or ovulation spotting.',
            'Orange or greyish: may be a sign of infection (such as bacterial vaginosis), especially with a bad smell or itching.',
          ],
        },
        { h: 'Clots' },
        { p: 'Small clots are normal on heavy days. If they are large (bigger than a 2 cm coin) and frequent, it could be heavy bleeding worth getting checked.' },
      ],
      consult: [
        'Grey or greenish discharge, or a bad smell, itching or fever.',
        'Large, repeated clots, or bleeding that soaks a pad every hour.',
        'Any bleeding during pregnancy or after menopause.',
      ],
      related: ['sangrado-abundante', 'flujo-vaginal'],
    },
    {
      id: 'flujo-vaginal',
      category: 'ciclo',
      title: 'Vaginal discharge through your cycle',
      summary: 'Discharge changes with your hormones and is a useful sign of fertility and health.',
      keywords: ['discharge', 'cervical mucus', 'egg white', 'itching', 'smell', 'thrush', 'yeast'],
      modes: ['conceive', 'avoid', 'track'],
      body: [
        { p: 'Vaginal discharge keeps the vagina clean and protected. Its amount and texture change through the cycle:' },
        {
          ul: [
            'After your period: little discharge or a dry feeling.',
            'Follicular phase: sticky or creamy, whitish discharge.',
            'Near ovulation: abundant, clear and stretchy like raw egg white. This is the most fertile type.',
            'Luteal phase: thicker and scarcer again.',
          ],
        },
        { h: 'When it may be an infection' },
        {
          ul: [
            'White and clumpy with intense itching: usually thrush (yeast).',
            'Grey or off-white, thin and fishy-smelling: bacterial vaginosis.',
            'Yellow-green, frothy or painful: may be a sexually transmitted infection.',
          ],
        },
        { p: 'Logging your discharge under “Fertility” helps identify your fertile window and spot changes.' },
      ],
      consult: ['Discharge with a bad smell, unusual colour, itching or burning.', 'Pelvic pain, fever or pain during sex.', "If you're pregnant and notice fluid leaking."],
      related: ['ovulacion', 'higiene-intima', 'its'],
    },
    {
      id: 'ovulacion',
      category: 'ciclo',
      title: 'Ovulation and the fertile window',
      summary: 'When you ovulate, how many days are fertile and how to recognise the signs.',
      keywords: ['ovulation', 'fertile', 'fertile days', 'fertile window', 'egg', 'ovulation pain', 'mittelschmerz', 'lh'],
      modes: ['conceive', 'avoid', 'track'],
      body: [
        {
          p: 'On average, ovulation happens about 14 days before your next period — not necessarily on day 14 of the cycle. In a 32-day cycle, for example, it is usually around day 18.',
        },
        { p: 'The fertile window lasts about 6 days: the 5 before ovulation plus the day itself. The most likely days are the 2 before ovulation and ovulation day.' },
        { h: 'Signs you can notice' },
        {
          ul: [
            'Clear, stretchy discharge (egg white).',
            'A positive LH test: ovulation usually follows within 24–36 hours.',
            'A 0.2–0.5 °C rise in basal temperature after ovulation (confirms it afterwards).',
            'Mild pain on one side of the pelvis or a higher sex drive.',
          ],
        },
        {
          p: "The app estimates your ovulation from your previous cycles and confirms it if you log temperature or LH tests. It's still an estimate: don't use it as contraception.",
        },
      ],
      related: ['temperatura-basal', 'test-ovulacion', 'buscar-embarazo'],
    },
    {
      id: 'sindrome-premenstrual',
      category: 'ciclo',
      title: 'PMS and PMDD',
      summary: 'Why symptoms appear before your period and what really helps.',
      keywords: ['pms', 'premenstrual', 'pmdd', 'irritable', 'anxiety', 'bloating', 'before my period', 'mood'],
      modes: ['track'],
      body: [
        {
          p: 'Up to 3 in 4 people who menstruate notice some symptoms in the days before their period: bloating, tender breasts, cravings, tiredness, irritability or low mood. They go away in the first days of bleeding.',
        },
        { p: "They're caused by each body's sensitivity to changes in oestrogen and progesterone, not by a “hormonal imbalance”." },
        { h: 'What helps' },
        {
          ul: [
            'Regular aerobic exercise and enough sleep.',
            'Cutting down on salt, caffeine and alcohol in the second half of the cycle.',
            'Regular meals with wholegrain carbohydrates.',
            'Stress management and cognitive behavioural therapy.',
            'Some contraceptives and antidepressants (SSRIs) work well for severe symptoms.',
          ],
        },
        { h: 'Premenstrual dysphoric disorder (PMDD)' },
        {
          p: 'It affects 3–8% of people and causes intense emotional symptoms (depression, anxiety, anger, hopelessness) that interfere with daily life. It is treatable: talk to your doctor.',
        },
      ],
      consult: [
        'Symptoms affect your studies, work or relationships.',
        'You have thoughts of harming yourself (get urgent help: 988 in the US, 116 123 in the UK, or your emergency number).',
      ],
      related: ['animo-ciclo', 'alimentacion-ciclo', 'ejercicio-ciclo'],
    },
    {
      id: 'primera-regla',
      category: 'ciclo',
      title: 'Your first period',
      summary: 'When it comes, what to expect in the first years and how to be ready.',
      keywords: ['first period', 'menarche', 'teen', 'teenager', 'girl', 'puberty'],
      body: [
        {
          p: 'Your first period (menarche) usually arrives between ages 10 and 15, about 2–3 years after your breasts start developing. Whitish discharge a few months before is a sign it is on its way.',
        },
        { p: "In the first years cycles are often irregular (21 to 45 days) because ovulation isn't regular yet. That's normal." },
        { h: 'Be prepared' },
        {
          ul: [
            'Keep a pad or period pants in your bag.',
            'Start with the product you find most comfortable; you can try others later.',
            'If it hurts, heat and ibuprofen (at the right dose for your weight) usually help.',
            'Talking to someone you trust makes everything easier.',
          ],
        },
        { p: 'Having periods means pregnancy is possible with unprotected sex, even before your cycles become regular.' },
      ],
      consult: [
        'No period by age 15, or 3 years after your breasts started developing.',
        'Pain often makes you miss school.',
        'Your period lasts more than 8 days or soaks through protection every 1–2 hours.',
      ],
      related: ['productos-menstruales', 'dolor-menstrual', 'ciclos-irregulares'],
    },

    // ---------------------------------------------------------------- Pain and symptoms
    {
      id: 'dolor-menstrual',
      category: 'dolor',
      title: 'Period pain: how to ease it',
      summary: "Cramps are common, but you don't have to put up with them. Here's what works.",
      keywords: ['pain', 'cramps', 'dysmenorrhoea', 'dysmenorrhea', 'painful period', 'ibuprofen', 'heat', 'period pain'],
      modes: ['track', 'avoid', 'conceive'],
      body: [
        {
          p: 'Period pain (dysmenorrhoea) is caused by prostaglandins, substances that make the uterus contract. It usually starts shortly before your period and lasts 1–3 days.',
        },
        { h: 'What helps most' },
        {
          ul: [
            'Anti-inflammatories such as ibuprofen or naproxen, taken as the pain starts (or the day before), following the leaflet.',
            'Local heat: a heating pad or hot water bottle on your tummy or lower back.',
            'Gentle movement: walking, stretching or yoga.',
            'Hormonal contraception greatly reduces pain for many people.',
            'Electrical stimulation (TENS) can help as a complement.',
          ],
        },
        { p: "If you have asthma, a stomach ulcer, kidney problems or you're pregnant, check before taking anti-inflammatories." },
        { h: "When pain isn't “normal”" },
        {
          p: "Pain that doesn't improve with treatment, gets worse over the years, appears outside your period or during sex may be due to endometriosis, adenomyosis or other treatable causes.",
        },
      ],
      consult: [
        "Pain doesn't improve with anti-inflammatories or stops you living normally.",
        'Pain during sex, when peeing or pooing during your period.',
        'Severe, sudden pain, with fever or if you could be pregnant: emergency care.',
      ],
      related: ['endometriosis', 'sangrado-abundante', 'ejercicio-ciclo'],
    },
    {
      id: 'sangrado-abundante',
      category: 'dolor',
      title: 'Heavy periods',
      summary: "How to tell if your period is too heavy and why it's worth getting checked.",
      keywords: ['heavy', 'heavy bleeding', 'bleeding a lot', 'haemorrhage', 'hemorrhage', 'clots', 'soaking', 'menorrhagia', 'long period'],
      modes: ['track', 'perimenopause'],
      body: [
        { p: "Heavy menstrual bleeding is bleeding that interferes with your physical, social or emotional life. It's very common and treatable, but often normalised." },
        { h: 'Signs' },
        {
          ul: [
            'You change your pad or tampon every 1–2 hours.',
            'You need double protection or get up at night to change.',
            'You pass clots bigger than a coin.',
            'Your period lasts more than 8 days.',
            'You feel very tired, dizzy or short of breath (possible anaemia).',
          ],
        },
        { h: 'Possible causes' },
        {
          p: 'Fibroids, polyps, adenomyosis, bleeding disorders (such as von Willebrand disease), thyroid problems, the copper IUD, or hormonal changes in adolescence and perimenopause.',
        },
        { h: 'Treatments' },
        { p: 'Tranexamic acid, anti-inflammatories, a hormonal IUD, contraceptive pills or other treatments depending on the cause. A blood test can detect anaemia.' },
      ],
      consult: [
        'If you soak a pad or tampon every hour for 2 hours or more, or feel dizzy or faint: emergency care.',
        'If your periods are usually heavy or last more than 8 days: book an appointment.',
      ],
      related: ['anemia', 'colores-flujo', 'dolor-menstrual'],
    },
    {
      id: 'endometriosis',
      category: 'dolor',
      title: 'Endometriosis',
      summary: 'A common, under-diagnosed condition that causes pain. Knowing about it helps catch it earlier.',
      keywords: ['endometriosis', 'adenomyosis', 'pelvic pain', 'painful sex', 'infertility', 'chronic pain'],
      body: [
        {
          p: 'In endometriosis, tissue similar to the uterine lining grows outside the uterus (ovaries, peritoneum, bowel…), causing inflammation and pain. It affects around 1 in 10 women and people with a uterus of reproductive age.',
        },
        { h: 'Common symptoms' },
        {
          ul: [
            "Very painful periods that don't improve with usual painkillers.",
            'Pelvic pain outside your period.',
            'Pain during or after sex.',
            'Pain when peeing or pooing during your period.',
            'Tiredness and difficulty getting pregnant.',
          ],
        },
        { p: 'Diagnosis is delayed by several years on average because the pain gets normalised. Logging your symptoms and bringing a report to appointments helps a lot.' },
        { p: 'Treatment combines pain management, hormonal treatment and, in some cases, surgery. Specialist centres and patient associations can guide you.' },
      ],
      consult: ['Period pain stops you studying, working or living normally.', 'You have pain during sex or persistent pelvic pain.'],
      related: ['dolor-menstrual', 'buscar-embarazo'],
    },
    {
      id: 'sop',
      category: 'dolor',
      title: 'Polycystic ovary syndrome (PCOS)',
      summary: 'The most common hormonal condition of reproductive age: symptoms, diagnosis and care.',
      keywords: ['pcos', 'polycystic', 'polycystic ovaries', 'hirsutism', 'hair growth', 'acne', 'insulin resistance', 'androgens'],
      modes: ['track', 'conceive'],
      body: [
        { p: 'PCOS affects around 1 in 10 people with ovaries. It is diagnosed when at least 2 of these 3 criteria are met, after ruling out other causes:' },
        {
          ul: [
            'Irregular cycles or no ovulation.',
            'Signs of excess androgens: acne, excess hair, hair loss, or high androgens in blood tests.',
            'Ovaries with many follicles on ultrasound.',
          ],
        },
        { p: "Having “cysts” on a scan isn't enough for a diagnosis, and not everyone with PCOS is overweight." },
        { h: 'Why it matters' },
        {
          p: "It's linked to insulin resistance, a higher risk of type 2 diabetes and high cholesterol, and it can make pregnancy harder. With follow-up, most of these risks are well controlled.",
        },
        { h: 'What helps' },
        {
          ul: [
            'Regular exercise and balanced eating (no extreme diets).',
            'Hormonal contraception to regulate cycles and improve acne and hair growth.',
            'Metformin or other medicines in some cases.',
            "Ovulation induction if you're trying to conceive.",
          ],
        },
      ],
      consult: ['Very irregular cycles or no periods.', 'Severe acne, excess hair or hair loss.', 'Difficulty getting pregnant.'],
      related: ['ciclos-irregulares', 'buscar-embarazo'],
    },
    {
      id: 'anemia',
      category: 'dolor',
      title: 'Iron-deficiency anaemia',
      summary: 'Heavy periods are one of the most common causes. How to recognise and prevent it.',
      keywords: ['anaemia', 'anemia', 'iron', 'tiredness', 'ferritin', 'pale', 'dizzy', 'hair loss'],
      body: [
        { p: 'Every period means losing iron. If bleeding is heavy or your diet provides little iron, your stores drop and iron-deficiency anaemia can develop.' },
        { h: 'Symptoms' },
        {
          ul: [
            'Persistent tiredness and lack of energy.',
            'Pale skin, brittle nails or hair loss.',
            'Dizziness, headaches or breathlessness on exertion.',
            'Palpitations or trouble concentrating.',
          ],
        },
        { h: 'Prevention' },
        {
          ul: [
            'Iron-rich foods: meat, fish, eggs, legumes, tofu, nuts and leafy greens.',
            'Pair them with vitamin C (citrus, peppers, tomatoes) to absorb plant iron better.',
            'Avoid tea and coffee right with meals.',
            'Only take supplements if advised: too much iron is also harmful.',
          ],
        },
      ],
      consult: ['Persistent tiredness or dizziness, especially with heavy periods.', 'Shortness of breath or palpitations.'],
      related: ['sangrado-abundante', 'alimentacion-ciclo'],
    },
    {
      id: 'migrana-menstrual',
      category: 'dolor',
      title: 'Menstrual migraine and headaches',
      summary: 'The drop in oestrogen can trigger migraines. How to plan ahead.',
      keywords: ['migraine', 'headache', 'aura'],
      body: [
        { p: 'Many people with migraine notice attacks between 2 days before and 3 days after their period starts, due to the fall in oestrogen.' },
        {
          ul: [
            'Logging your headaches in the app shows whether they follow your cycle.',
            'Keep regular sleep and meal times and stay hydrated.',
            'Your doctor can prescribe preventive treatment for those days.',
            'If you have migraine with aura, check before using contraception containing oestrogen.',
          ],
        },
      ],
      consult: [
        'A sudden, extremely severe headache, with fever, stiff neck, confusion or weakness: emergency care.',
        'Migraine with aura if you use or plan to use combined contraception.',
      ],
      related: ['metodos-anticonceptivos', 'sueno'],
    },

    // ---------------------------------------------------------------- Products and hygiene
    {
      id: 'productos-menstruales',
      category: 'productos',
      title: 'Choosing your period product',
      summary: 'Pads, tampons, cups, discs and period pants: pros and how to use them safely.',
      keywords: ['pad', 'tampon', 'cup', 'menstrual cup', 'disc', 'period pants', 'product', 'menstrual hygiene'],
      body: [
        {
          ul: [
            'Pads: easy to use; change every 4–6 hours or sooner if full.',
            'Tampons: use the lowest absorbency you need and change every 4–8 hours. Never longer than 8 hours.',
            'Menstrual cup: reusable, up to 8–12 hours depending on the brand. Boil it between cycles.',
            'Menstrual disc: sits at the back of the vagina; handy if a cup feels uncomfortable.',
            'Period pants: comfortable and reusable; wash cold without fabric softener.',
          ],
        },
        { p: "There's no single best option: choose based on your flow, comfort and lifestyle. You can combine them." },
        { h: 'If you have an IUD' },
        { p: 'With a cup or disc, break the seal before removing it so you don’t dislodge the IUD. Mention it to whoever fitted it.' },
      ],
      related: ['shock-toxico', 'higiene-intima', 'primera-regla'],
    },
    {
      id: 'shock-toxico',
      category: 'productos',
      title: 'Toxic shock syndrome',
      summary: 'A very rare but serious complication. Recognising it early saves lives.',
      keywords: ['toxic shock', 'tss', 'tampon', 'fever', 'cup', 'infection'],
      body: [
        {
          p: 'Toxic shock syndrome is a severe reaction to toxins from certain bacteria. It is very rare and has been linked to prolonged use of high-absorbency tampons, although it can also happen with cups or other causes.',
        },
        { h: 'Warning symptoms' },
        { ul: ['Sudden high fever.', 'Vomiting or diarrhoea.', 'A rash that looks like sunburn.', 'Dizziness, fainting or confusion.', 'Severe muscle aches.'] },
        { p: 'If you have these symptoms while using a tampon or cup, remove it and go to the emergency department straight away.' },
        { h: 'Prevention' },
        { ul: ['Use the lowest absorbency you need.', 'Change tampons every 4–8 hours and switch to pads at night if you prefer.', 'Wash your hands before and after inserting.'] },
      ],
      consult: ['High fever with a tampon or cup and any other symptom on the list: emergency care (112 / 911 / 999).'],
      related: ['productos-menstruales'],
    },
    {
      id: 'higiene-intima',
      category: 'productos',
      title: 'Intimate hygiene: less is more',
      summary: 'The vagina cleans itself. Simple care to avoid irritation and infections.',
      keywords: ['hygiene', 'washing', 'douching', 'soap', 'smell', 'irritation', 'thrush', 'vaginosis'],
      body: [
        {
          ul: [
            'Wash only the vulva (the outside) with water or a mild, unscented soap.',
            'Avoid douching: it disrupts protective bacteria and encourages infections.',
            'Dry the area well and wear breathable underwear.',
            'Wipe from front to back after using the toilet.',
            'Pee after sex to reduce urinary infections.',
          ],
        },
        { p: 'A mild smell is normal and changes through the cycle. A strong fishy smell, intense itching or oddly coloured discharge should be checked.' },
      ],
      consult: ["Itching, burning, a strong smell or abnormal discharge that doesn't improve in a few days.", 'Pain or burning when peeing, especially with fever or back pain.'],
      related: ['flujo-vaginal', 'its'],
    },

    // ---------------------------------------------------------------- Fertility
    {
      id: 'buscar-embarazo',
      category: 'fertilidad',
      title: 'Trying to conceive: a practical guide',
      summary: 'How to improve your chances, how long it usually takes and when to get help.',
      keywords: ['trying to conceive', 'ttc', 'get pregnant', 'conceive', 'fertility', 'infertility', 'folic acid'],
      modes: ['conceive'],
      body: [
        { p: 'Each cycle, a couple without fertility problems has about a 20–25% chance of pregnancy. Roughly 8 in 10 conceive within a year.' },
        { h: 'What helps' },
        {
          ul: [
            'Having sex every 2–3 days throughout the cycle, or daily in the fertile window.',
            'Taking folic acid (400 micrograms a day) from at least a month before pregnancy.',
            'Stopping smoking and alcohol, and moderating caffeine.',
            'Keeping a healthy weight and exercising moderately.',
            'Reviewing medication and vaccinations with your healthcare professional before conceiving.',
          ],
        },
        {
          p: "You don't need to time sex to the hour: the stress of scheduling everything doesn't help. LH tests and basal temperature can guide you if your cycles are irregular.",
        },
        { h: 'When to get checked' },
        {
          p: "After 12 months of regular unprotected sex, or after 6 months if you're 35 or older. Sooner if you have very irregular cycles, endometriosis, PCOS or known risk factors.",
        },
      ],
      consult: ["More than 12 months trying to conceive (6 months if you're 35 or older).", 'Very irregular cycles, no periods or significant pelvic pain.'],
      related: ['ovulacion', 'test-ovulacion', 'temperatura-basal', 'test-embarazo'],
    },
    {
      id: 'temperatura-basal',
      category: 'fertilidad',
      title: 'Basal body temperature',
      summary: 'How to measure it and how it confirms ovulation (after the fact).',
      keywords: ['basal temperature', 'bbt', 'thermometer', 'temperature rise', 'chart'],
      modes: ['conceive', 'avoid'],
      body: [
        {
          p: "After ovulation, progesterone raises your resting temperature by 0.2–0.5 °C until your next period. That's why basal temperature confirms you have already ovulated but doesn't warn you in advance.",
        },
        { h: 'How to measure it well' },
        {
          ul: [
            'Use a basal thermometer (two decimal places).',
            'Take it as soon as you wake up, before getting up or talking, at the same time.',
            'You need at least 3 hours of unbroken sleep.',
            'Mark “disturbed reading” if you slept badly, drank alcohol, have a fever or took it at a different time.',
          ],
        },
        { p: 'The app confirms ovulation with the “3 over 6” rule: three temperatures in a row at least 0.2 °C above the previous six.' },
        { p: 'If your temperature stays high more than 18 days after ovulation, you may be pregnant: take a test.' },
      ],
      related: ['ovulacion', 'test-ovulacion', 'buscar-embarazo'],
    },
    {
      id: 'test-ovulacion',
      category: 'fertilidad',
      title: 'Ovulation tests (LH)',
      summary: 'What they detect, when to start using them and how to read the result.',
      keywords: ['ovulation test', 'lh', 'lh surge', 'strip', 'positive ovulation'],
      modes: ['conceive'],
      body: [
        { p: 'Ovulation tests detect the surge of luteinising hormone (LH) in urine, which happens 24–36 hours before ovulation.' },
        {
          ul: [
            'Start about 17 days before your next expected period (for example, day 11 in a 28-day cycle).',
            'Test at the same time each day, ideally in the afternoon, without drinking lots beforehand.',
            'A positive result means your most fertile days are today and the next two.',
          ],
        },
        { p: 'With PCOS you may get several positives without ovulating, and some fertility medicines affect the result.' },
      ],
      related: ['ovulacion', 'temperatura-basal', 'buscar-embarazo'],
    },
    {
      id: 'test-embarazo',
      category: 'fertilidad',
      title: 'Pregnancy tests: when and how',
      summary: 'When they are reliable, how to avoid false negatives and what to do next.',
      keywords: ['pregnancy test', 'late period', 'pregnant', 'positive', 'negative', 'hcg', 'missed period'],
      modes: ['track', 'avoid', 'conceive'],
      body: [
        {
          p: 'Urine tests detect the hormone hCG, which is produced after implantation. They are reliable from the first day of a missed period; some detect earlier but with more false negatives.',
        },
        {
          ul: [
            "Use your first morning urine if you're testing very early.",
            'Read the result within the time stated in the leaflet.',
            'A faint line is usually positive: repeat in 48 hours.',
            "If it's negative and your period doesn't come, repeat in 3–5 days.",
          ],
        },
        { p: 'If your cycles are irregular, wait 3 weeks after unprotected sex for a reliable result.' },
        { h: "If it's positive" },
        {
          p: "Book an appointment with your doctor or midwife. If you don't want to continue the pregnancy, you can also get information there about abortion services and time limits.",
        },
      ],
      consult: [
        'A positive test with severe abdominal pain, bleeding or dizziness: emergency care (possible ectopic pregnancy).',
        'Repeated negative tests and more than 3 months without a period.',
      ],
      related: ['anticoncepcion-emergencia', 'embarazo-inicio', 'ciclos-irregulares'],
    },

    // ---------------------------------------------------------------- Contraception
    {
      id: 'metodos-anticonceptivos',
      category: 'anticoncepcion',
      title: 'Contraceptive methods compared',
      summary: 'Real-world effectiveness, pros and cons of each method so you can make an informed choice.',
      keywords: ['contraception', 'contraceptive', 'birth control', 'methods', 'pill', 'iud', 'coil', 'implant', 'condom', 'ring', 'patch', 'injection'],
      modes: ['avoid', 'track'],
      body: [
        { p: 'Effectiveness depends on the method and how it is used in real life. These figures are pregnancies per 100 people in the first year of typical use:' },
        {
          ul: [
            'Implant: fewer than 1. Lasts 3–5 years.',
            'Hormonal IUD: fewer than 1. Lasts 3–8 years depending on the model and often reduces bleeding.',
            'Copper IUD: fewer than 1. Hormone-free, lasts 5–10 years; may increase bleeding.',
            '3-monthly injection: about 4.',
            'Pill, patch and ring: about 7 (fewer than 1 with perfect use).',
            'External condom: about 13. The only one that also protects against STIs.',
            'Fertility awareness methods: 2 to 23, depending on the method and consistency.',
            'Withdrawal: about 20. Not considered reliable.',
          ],
        },
        { p: 'App predictions are not a method of contraception on their own.' },
        {
          p: 'Methods containing oestrogen are not recommended in some situations (migraine with aura, smoking at 35 or older, clot risk, or the first weeks after birth). Your healthcare professional will help you choose.',
        },
      ],
      related: ['olvido-pildora', 'anticoncepcion-emergencia', 'its'],
    },
    {
      id: 'olvido-pildora',
      category: 'anticoncepcion',
      title: 'I missed my pill',
      summary: 'What to do depending on how many pills you missed and in which week. Always check your leaflet.',
      keywords: ['missed pill', 'forgot pill', 'forgot my pill', 'late pill', 'vomiting pill', 'diarrhoea pill'],
      modes: ['avoid'],
      body: [
        { h: 'Combined pill' },
        {
          ul: [
            "1 missed pill (less than 48 h since the last one): take it as soon as you remember, even if that means two at once, and carry on as usual. You don't need extra protection.",
            '2 or more missed: take the last missed pill, carry on with the rest and use condoms for 7 days.',
            'If the missed pills were in week 3: start the next pack without a break.',
            'If they were in week 1 and you had unprotected sex in the previous 7 days: consider emergency contraception.',
          ],
        },
        { h: 'Progestogen-only pill' },
        {
          p: 'If more than 12 hours (desogestrel) or more than 3 hours (others) have passed since your usual time, take it as soon as possible, carry on and use condoms for 48 hours.',
        },
        { h: 'Vomiting or diarrhoea' },
        { p: 'If you vomit within 3 hours of taking it or have severe diarrhoea, it may not be absorbed: follow the missed-pill instructions.' },
        { p: 'Rules vary by brand: your leaflet or pharmacist takes priority.' },
      ],
      related: ['anticoncepcion-emergencia', 'metodos-anticonceptivos'],
    },
    {
      id: 'anticoncepcion-emergencia',
      category: 'anticoncepcion',
      title: 'Emergency contraception',
      summary: 'What the options are, how long they work and where to get them.',
      keywords: ['morning after pill', 'emergency pill', 'emergency contraception', 'condom broke', 'unprotected', 'plan b', 'emergency'],
      modes: ['avoid', 'track'],
      body: [
        { p: 'If you had unprotected sex or your method failed, emergency contraception greatly reduces the chance of pregnancy. The sooner, the better.' },
        {
          ul: [
            'Levonorgestrel pill: up to 72 hours (3 days) after. Available without prescription at pharmacies in many countries.',
            'Ulipristal acetate pill: up to 120 hours (5 days), more effective than levonorgestrel in the later days.',
            'Copper IUD: up to 5 days after. The most effective option, and it then works as ongoing contraception.',
          ],
        },
        { p: "It doesn't cause an abortion or affect an existing pregnancy. It works by delaying ovulation. It can change the date of your next period." },
        { p: 'Higher body weight may reduce how well the pills work: mention it at the pharmacy. If you vomit within 3 hours, you need another dose.' },
        { p: 'Take a pregnancy test if your period is more than 7 days late or different from usual.' },
      ],
      consult: [
        'Go to a pharmacy, sexual health clinic or emergency service as soon as possible.',
        "If the sex wasn't consensual, seek urgent care: you'll be offered contraception, STI prevention and support.",
      ],
      related: ['olvido-pildora', 'test-embarazo', 'its'],
    },
    {
      id: 'its',
      category: 'anticoncepcion',
      title: 'Sexually transmitted infections and check-ups',
      summary: 'Many cause no symptoms. How to prevent them and when to get tested.',
      keywords: ['sti', 'std', 'chlamydia', 'gonorrhoea', 'gonorrhea', 'hpv', 'herpes', 'syphilis', 'hiv', 'smear', 'condom'],
      body: [
        {
          p: 'Sexually transmitted infections (chlamydia, gonorrhoea, syphilis, HIV, herpes, HPV…) are common and many cause no symptoms, but they can affect fertility if untreated.',
        },
        {
          ul: [
            'External or internal condoms protect against most of them.',
            'Get tested if you have a new partner or several partners, even without symptoms.',
            'The HPV vaccine prevents most cervical cancers.',
            "Take part in your country's cervical screening programme.",
          ],
        },
      ],
      consult: [
        'Abnormal discharge, sores, warts, pain when peeing or during sex.',
        'Bleeding after sex.',
        'If your partner has an STI or after a risky encounter (HIV prevention must start within 72 h).',
      ],
      related: ['metodos-anticonceptivos', 'flujo-vaginal'],
    },

    // ---------------------------------------------------------------- Pregnancy and postpartum
    {
      id: 'embarazo-inicio',
      category: 'embarazo',
      title: 'The first weeks of pregnancy',
      summary: 'How weeks are counted, first steps and common discomforts.',
      keywords: ['pregnancy', 'pregnant', 'weeks', 'first trimester', 'nausea', 'morning sickness', 'folic acid', 'due date'],
      modes: ['pregnant'],
      body: [
        {
          p: "Pregnancy weeks are counted from the first day of your last period, not from conception. So when your period is first late, you're already about 4 weeks pregnant. A pregnancy lasts about 40 weeks.",
        },
        { h: 'First steps' },
        {
          ul: [
            'Book an appointment with your doctor or midwife.',
            'Take folic acid until week 12 (and iodine if advised).',
            'Avoid alcohol and tobacco, and check any medication.',
            "Avoid raw meat, raw cured meats and unpasteurised dairy if you're not immune to toxoplasmosis.",
          ],
        },
        { h: 'Common discomforts' },
        {
          p: "Nausea, tiredness, tender breasts and needing to pee often are common. Nausea improves with small, frequent, dry meals; if you can't keep fluids down, get checked.",
        },
      ],
      consult: ['Vomiting that stops you drinking or eating (hyperemesis).', 'Bleeding or abdominal pain: get checked without waiting.'],
      related: ['embarazo-alarma', 'perdida-gestacional'],
    },
    {
      id: 'embarazo-alarma',
      category: 'embarazo',
      title: 'Warning signs in pregnancy',
      summary: 'Symptoms that need attention without waiting for your next appointment.',
      keywords: ['pregnancy warning', 'bleeding pregnancy', 'pain pregnancy', 'pre-eclampsia', 'waters breaking', 'baby movements', 'contractions'],
      modes: ['pregnant'],
      body: [
        { p: 'Go to the emergency department or call your maternity unit if you notice:' },
        {
          ul: [
            'Vaginal bleeding, especially if heavy or with pain.',
            'Severe or persistent abdominal pain.',
            'A bad headache, blurred vision or flashing lights, or sudden swelling of the face and hands (possible pre-eclampsia).',
            'Fluid leaking from the vagina.',
            'A fever of 38 °C (100.4 °F) or higher.',
            'Your baby moving less or differently (from about week 24).',
            'Regular contractions before week 37.',
            'Intense itching of hands and feet, especially at night.',
            'Vomiting that stops you keeping fluids down.',
            "Thoughts of harming yourself or feeling you can't cope.",
          ],
        },
        { p: 'If in doubt, get checked: nobody will judge you for asking.' },
      ],
      consult: ['Any of the symptoms above: maternity triage or emergency services.'],
      related: ['embarazo-inicio', 'salud-mental-perinatal'],
    },
    {
      id: 'perdida-gestacional',
      category: 'embarazo',
      title: 'Pregnancy loss',
      summary: 'Information and support after a miscarriage or other loss.',
      keywords: ['miscarriage', 'pregnancy loss', 'lost the pregnancy', 'grief', 'ectopic'],
      body: [
        {
          p: 'Losing a pregnancy is more common than people think: around 1 in 8 known pregnancies ends in miscarriage, almost always in the first trimester and due to chromosomal causes.',
        },
        { p: "It isn't caused by exercise, stress, sex, or anything you did or didn't do." },
        { h: 'Afterwards' },
        {
          ul: [
            'Bleeding can last up to 2 weeks.',
            'Your period usually returns in 4–6 weeks.',
            'You can ovulate again before your first period.',
            'Grief is different for everyone; give yourself time and ask for support if you need it.',
          ],
        },
      ],
      consult: [
        'Very heavy bleeding, fever, foul-smelling discharge or severe pain after the loss: emergency care.',
        "If sadness or anxiety don't ease over the weeks, ask for professional help.",
      ],
      related: ['salud-mental-perinatal', 'buscar-embarazo'],
    },
    {
      id: 'posparto',
      category: 'embarazo',
      title: 'Recovering after birth',
      summary: "What's normal in the first weeks and which signs need attention.",
      keywords: ['postpartum', 'postnatal', 'lochia', 'after birth', 'pelvic floor', 'c-section', 'caesarean'],
      modes: ['postpartum'],
      body: [
        { p: 'The postnatal period lasts about 6 weeks. Bleeding (lochia) starts red and heavy and gradually turns pink, brown and yellowish.' },
        {
          ul: [
            'Rest as much as you can and accept help.',
            'Pelvic floor exercises help prevent urine leaks.',
            'After a caesarean, avoid lifting heavy things for the first weeks.',
            'Your period may return at 6–8 weeks without breastfeeding, or months later with breastfeeding.',
            'You can get pregnant before your first period: talk to your midwife about contraception.',
          ],
        },
      ],
      consult: [
        'Soaking a pad in an hour or less, or large clots: emergency care.',
        'Fever, foul-smelling lochia or increasing abdominal pain.',
        'Chest pain, shortness of breath, or pain and swelling in one leg: emergency care.',
        'A severe headache or vision changes.',
        'Intense sadness or anxiety, or thoughts of harming yourself or your baby.',
      ],
      related: ['lactancia-fertilidad', 'salud-mental-perinatal'],
    },
    {
      id: 'lactancia-fertilidad',
      category: 'embarazo',
      title: 'Breastfeeding, periods and fertility',
      summary: 'When breastfeeding protects you and when you need another method.',
      keywords: ['breastfeeding', 'lam', 'nursing', 'breastfeeding period', 'postpartum fertility'],
      modes: ['postpartum'],
      body: [
        { p: 'Breastfeeding delays ovulation, but it only protects against pregnancy if all three conditions of the lactational amenorrhoea method (LAM) are met:' },
        { ul: ['Your baby is under 6 months old.', 'They are fed only breast milk, on demand, day and night (no gaps longer than 4–6 hours).', "Your period hasn't come back."] },
        {
          p: "If any of these isn't true, you can ovulate without knowing. Oestrogen-free methods (progestogen-only pill, IUD, implant, condoms) are compatible with breastfeeding.",
        },
        { p: "While breastfeeding it's normal to have vaginal dryness and irregular cycles at first." },
      ],
      related: ['posparto', 'metodos-anticonceptivos'],
    },
    {
      id: 'salud-mental-perinatal',
      category: 'embarazo',
      title: 'Baby blues and perinatal depression',
      summary: 'How to tell passing sadness from depression, and where to get help.',
      keywords: ['postnatal depression', 'postpartum depression', 'baby blues', 'pregnancy anxiety', 'mental health', "can't cope"],
      modes: ['postpartum', 'pregnant'],
      body: [
        { p: 'Up to 8 in 10 people feel tearful, irritable and up and down in the first days after birth (“baby blues”). It passes by itself within about 2 weeks.' },
        {
          p: 'Perinatal depression affects more than 1 in 10, during pregnancy or the first year. It can show up as sadness, intense anxiety, loss of joy, guilt, sleep problems or frightening thoughts.',
        },
        { p: "It isn't your fault and doesn't mean you're a bad parent. Effective treatment exists, and in most cases it's compatible with breastfeeding." },
      ],
      consult: [
        'Symptoms lasting more than 2 weeks or stopping you looking after yourself.',
        'Thoughts of harming yourself or your baby: get urgent help (988 in the US, 116 123 in the UK, or your emergency number).',
      ],
      related: ['posparto', 'animo-ciclo'],
    },

    // ---------------------------------------------------------------- Menopause
    {
      id: 'menopausia',
      category: 'menopausia',
      title: 'Perimenopause and menopause',
      summary: 'What changes, how long it lasts and what options there are to feel well.',
      keywords: ['menopause', 'perimenopause', 'climacteric', 'last period', 'no period', 'hrt', 'hormone therapy'],
      modes: ['perimenopause'],
      body: [
        { p: 'Menopause is your last period. It is confirmed after 12 months in a row without menstruation and arrives on average around age 51 (between 45 and 55).' },
        {
          p: 'Perimenopause is the years before (often from the mid-40s) when hormones fluctuate: cycles get shorter or longer, periods change and hot flashes, insomnia, mood changes, brain fog or joint pain may appear.',
        },
        { h: 'Options' },
        {
          ul: [
            'Hormone therapy (HRT): the most effective treatment for hot flashes; for many people the benefits outweigh the risks. Discuss it with your doctor.',
            "Non-hormonal treatments for those who can't or don't want to use hormones.",
            'Strength training, a calcium-rich diet and not smoking to protect your bones and heart.',
          ],
        },
        { p: 'Keep using contraception until 12 months after your last period (24 months if it happens before 50).' },
      ],
      consult: ['Bleeding after 12 months without a period.', 'Symptoms affecting your quality of life.', 'Menopause before age 40 (premature ovarian insufficiency).'],
      related: ['sofocos', 'salud-vaginal-menopausia', 'huesos-corazon'],
    },
    {
      id: 'sofocos',
      category: 'menopausia',
      title: 'Hot flashes and night sweats',
      summary: 'Why they happen and what eases them.',
      keywords: ['hot flashes', 'hot flushes', 'night sweats', 'sweating', 'flushing'],
      modes: ['perimenopause'],
      body: [
        {
          p: 'Hot flashes affect most people going through the menopause transition. They are a sudden feeling of heat in the face, neck and chest, sometimes with sweating and palpitations, lasting a few minutes.',
        },
        {
          ul: [
            'Dress in layers and keep cold water nearby.',
            'Keep the bedroom cool and use breathable bedding.',
            'Identify triggers: alcohol, spicy food, caffeine, stress.',
            'Slow breathing and cognitive behavioural therapy reduce their impact.',
            'Hormone therapy and some non-hormonal medicines are effective.',
          ],
        },
        { p: 'Logging your hot flashes shows how often they happen and helps assess treatment with your doctor.' },
      ],
      related: ['menopausia', 'sueno'],
    },
    {
      id: 'salud-vaginal-menopausia',
      category: 'menopausia',
      title: 'Vaginal dryness and urinary health',
      summary: 'A common problem with simple, safe treatment.',
      keywords: ['vaginal dryness', 'painful sex', 'atrophy', 'genitourinary syndrome', 'urinary infection', 'lubricant'],
      modes: ['perimenopause', 'postpartum'],
      body: [
        {
          p: 'Falling oestrogen thins and dries the tissues of the vulva, vagina and bladder. This can cause dryness, itching, painful sex, urinary urgency or repeated urinary infections.',
        },
        {
          ul: [
            'Regular vaginal moisturisers and lubricants during sex.',
            'Low-dose vaginal oestrogen: very effective and safe for most people.',
            'Pelvic floor exercises and specialist physiotherapy.',
          ],
        },
        { p: "Unlike hot flashes, it doesn't usually improve over time without treatment. You don't have to put up with it." },
      ],
      related: ['menopausia', 'higiene-intima'],
    },
    {
      id: 'huesos-corazon',
      category: 'menopausia',
      title: 'Bones and heart after menopause',
      summary: 'Small habits with a big long-term impact.',
      keywords: ['osteoporosis', 'bones', 'calcium', 'vitamin d', 'heart', 'cholesterol', 'blood pressure'],
      modes: ['perimenopause'],
      body: [
        { p: 'Without oestrogen, bone density falls faster and cardiovascular risk increases.' },
        {
          ul: [
            'Strength and impact exercise (brisk walking, climbing stairs) several times a week.',
            'Enough calcium (dairy, fortified plant drinks, sardines, almonds) and vitamin D.',
            "Don't smoke and moderate alcohol.",
            'Check blood pressure, cholesterol and blood sugar as advised.',
          ],
        },
      ],
      related: ['menopausia', 'ejercicio-ciclo'],
    },

    // ---------------------------------------------------------------- Wellbeing
    {
      id: 'animo-ciclo',
      category: 'bienestar',
      title: 'Mood and your menstrual cycle',
      summary: 'Why your mood may change through the month and how to look after yourself.',
      keywords: ['mood', 'sadness', 'anxiety', 'crying', 'mood swings', 'emotions', 'stress'],
      modes: ['track', 'perimenopause'],
      body: [
        {
          p: 'Cycle hormones influence neurotransmitters such as serotonin. Many people feel more energetic in the follicular phase and more sensitive in the days before their period.',
        },
        {
          ul: [
            'Logging your mood in the app helps you see your patterns and plan ahead.',
            'Sleeping well, moving and eating regularly steady your mood.',
            'Give yourself permission to slow down on hard days.',
            'Talking to someone you trust helps.',
          ],
        },
        { p: "If sadness or anxiety last for weeks, don't follow your cycle or stop you living your life, ask for professional help." },
      ],
      consult: [
        'Sadness, anxiety or irritability affecting your daily life.',
        'Thoughts of harming yourself: get urgent help (988 in the US, 116 123 in the UK, or your emergency number).',
      ],
      related: ['sindrome-premenstrual', 'sueno'],
    },
    {
      id: 'alimentacion-ciclo',
      category: 'bienestar',
      title: 'Eating through your cycle',
      summary: 'No miracle diets: simple guidelines that help with energy and symptoms.',
      keywords: ['food', 'diet', 'eating', 'cravings', 'hunger', 'nutrition', 'magnesium'],
      body: [
        {
          ul: [
            'During your period, prioritise iron-rich foods and pair them with vitamin C.',
            'Before your period it is normal to be hungrier: choose wholegrains, legumes and nuts.',
            'Cutting down on salt, sugar and alcohol may ease bloating.',
            'Oily fish, seeds and nuts provide healthy fats.',
            'Drink water regularly.',
          ],
        },
        { p: 'Very restrictive diets can make your period stop. Your body needs enough energy to ovulate.' },
      ],
      related: ['anemia', 'sindrome-premenstrual'],
    },
    {
      id: 'ejercicio-ciclo',
      category: 'bienestar',
      title: 'Exercise and your period',
      summary: 'You can (and often should) move during your period. Adjust the intensity to how you feel.',
      keywords: ['exercise', 'sport', 'training', 'running', 'yoga', 'swimming on period'],
      body: [
        { p: 'Exercise improves period pain, mood and sleep. There is no phase in which it is harmful.' },
        {
          ul: [
            'During your period: gentle or moderate activity if you feel tired; swimming is perfectly fine with a tampon or cup.',
            'Follicular phase: a good time for harder workouts.',
            'Luteal phase: recovery may feel harder; listen to your body.',
          ],
        },
        { p: 'If you train a lot and your periods stop, it may be low energy availability (relative energy deficiency in sport): get checked.' },
      ],
      related: ['dolor-menstrual', 'huesos-corazon'],
    },
    {
      id: 'sueno',
      category: 'bienestar',
      title: 'Sleeping better',
      summary: 'Sleep changes with your cycle, pregnancy and menopause. Habits that help.',
      keywords: ['sleep', 'insomnia', 'sleeping', 'rest', 'waking up'],
      body: [
        { p: 'In the days before your period, a higher body temperature and hormonal shifts can make sleep worse. In menopause, night sweats interrupt it.' },
        {
          ul: [
            'Keep regular hours, including at weekends.',
            'A cool, dark, quiet bedroom.',
            'Avoid screens, caffeine and alcohol before bed.',
            'Be active during the day, ideally not right before bed.',
            "If you've slept badly for weeks, cognitive behavioural therapy for insomnia is very effective.",
          ],
        },
      ],
      related: ['sofocos', 'animo-ciclo'],
    },
    // ---------------------------------------------------------------- Myths and facts
    {
      id: 'mitos-regla',
      category: 'mitos',
      title: 'Period myths',
      summary: 'What people still say about periods, and what the evidence says.',
      keywords: [
        'myths',
        'myth',
        'true or false',
        'is it true',
        'shower on period',
        'bath on period',
        'swimming on period',
        'period syncing',
        'period blood dirty',
        'hymen',
        'tampon virginity',
        'sex on period',
      ],
      body: [
        { h: "“You can't shower, bathe or wash your hair on your period”" },
        { p: 'False. Showering or bathing is safe, helps you feel good, and warm water can ease cramps. You can swim too, with a tampon, cup or period swimwear.' },
        { h: '“Exercising on your period is bad for you”' },
        { p: 'False. Exercise often eases period pain and lifts your mood. Adjust the intensity to how you feel.' },
        { h: '“Period blood is dirty”' },
        { p: 'False. It is blood and tissue from the endometrium: it is not toxic or impure. It is as natural as any other body function.' },
        { h: '“A normal cycle is exactly 28 days”' },
        {
          p: 'False. In adults, cycles of 24 to 38 days are normal, and it is common for them to vary by a few days from month to month. Only a small share of cycles last exactly 28 days.',
        },
        { h: '“Severe pain is normal and you just have to put up with it”' },
        {
          p: 'False. Some discomfort is common, but pain that does not improve with usual painkillers, makes you miss school or work, or keeps getting worse deserves a check-up: it can have treatable causes such as endometriosis.',
        },
        { h: '“People who live together end up with synced periods”' },
        {
          p: 'There is no solid evidence. The largest studies have not confirmed it: because every cycle has a different length, periods sometimes overlap and then drift apart by pure chance.',
        },
        { h: '“Using a tampon or cup has to do with virginity”' },
        {
          p: 'False. The hymen is flexible tissue that normally already has an opening (that is how period blood comes out). Using a tampon or cup says nothing about your sex life, and “virginity” is not a medical concept.',
        },
        { h: "“You can't have sex on your period”" },
        { p: 'You can, if everyone involved wants to. Pregnancy is unlikely but possible, and sexually transmitted infections spread just the same: condoms still matter.' },
      ],
      consult: [
        'Period pain that does not improve with painkillers or stops you from doing your usual activities.',
        'Periods lasting more than 8 days, or needing to change your product every hour for several hours in a row.',
      ],
      related: ['dolor-menstrual', 'ciclo-menstrual', 'productos-menstruales'],
    },
    {
      id: 'mitos-fertilidad',
      category: 'mitos',
      title: 'Fertility and contraception myths',
      summary: 'Common beliefs that can lead to an unplanned pregnancy… or to needless worry.',
      keywords: [
        'contraception myths',
        'fertility myths',
        'withdrawal',
        'pull out',
        'pregnant on period',
        'pill weight gain',
        'pill break',
        'breastfeeding pregnancy',
        'day 14',
        'app as contraception',
        'morning after pill abortion',
      ],
      body: [
        { h: "“You can't get pregnant on your period”" },
        { p: 'It is unlikely, but possible, especially with short cycles: sperm can survive for up to 5 days and ovulation can come early.' },
        { h: '“Pulling out is a safe method”' },
        {
          p: 'It is not. With real-life use, about 1 in 5 people who rely on it alone get pregnant within a year, and it does not protect against sexually transmitted infections.',
        },
        { h: '“Everyone ovulates on day 14”' },
        { p: 'False. The day of ovulation differs from person to person and from cycle to cycle. That is why predictions are estimates.' },
        { h: '“A cycle app works as contraception”' },
        {
          p: 'This app is not a method of contraception: its fertile days are an estimate. Fertility awareness methods require learning specific rules (temperature, cervical mucus) and, even then, fail more often than long-acting methods.',
        },
        { h: '“You need a break from the pill every so often”' },
        { p: 'Not necessary. Breaks bring no benefit and raise the risk of pregnancy when you restart.' },
        { h: '“The pill makes you gain weight or causes infertility”' },
        {
          p: 'Studies show no significant weight gain with most pills, and fertility returns quickly after stopping the pill, patch, ring, implant or IUD. With the three-monthly injection it can take a few months longer.',
        },
        { h: "“You can't get pregnant while breastfeeding”" },
        {
          p: 'It only protects when all three conditions are met: less than 6 months since the birth, exclusive breastfeeding (night feeds included) and no periods yet. If any one is missing, you need another method.',
        },
        { h: '“The morning-after pill causes an abortion”' },
        {
          p: 'False. It works by delaying ovulation and does not end a pregnancy that has already begun. It works better the sooner it is taken; a copper IUD fitted within 5 days is the most effective option.',
        },
        { h: "“If you're not pregnant after a few months, something is wrong”" },
        {
          p: 'It is normal for it to take time: most couples conceive within a year of regular sex without contraception. It is advisable to see a professional after 12 months of trying (6 months from age 35), or sooner if cycles are very irregular or there are other concerns.',
        },
      ],
      related: ['metodos-anticonceptivos', 'anticoncepcion-emergencia', 'buscar-embarazo', 'ovulacion'],
    },
    {
      id: 'mitos-salud-intima',
      category: 'mitos',
      title: 'Intimate health and menopause myths',
      summary: 'Hygiene, discharge, infections, PCOS and menopause: sorting fact from fiction.',
      keywords: [
        'hygiene myths',
        'menopause myths',
        'douching',
        'vaginal wash',
        'discharge infection',
        'sti no symptoms',
        'pcos pregnancy',
        'sudden menopause',
        'perimenopause pregnancy',
        'pms real',
      ],
      body: [
        { h: '“You need to wash inside your vagina”' },
        {
          p: 'False. The vagina cleans itself. Douching upsets its natural balance and is linked to more infections. Washing the vulva on the outside with water or a mild, unscented soap is enough.',
        },
        { h: '“Having discharge means you have an infection”' },
        {
          p: 'False. Discharge is normal and changes throughout the cycle. See a professional if its smell or colour changes (greenish, greyish), or if there is itching, burning or pain.',
        },
        { h: '“Sexually transmitted infections always cause symptoms”' },
        { p: 'False. Chlamydia, gonorrhoea, HPV or HIV can cause no symptoms for a long time. The only way to know is to get tested.' },
        { h: '“PMS is all in your head”' },
        { p: 'False. It is real and has a hormonal basis. When mood changes are very intense it may be premenstrual dysphoric disorder, which can be treated.' },
        { h: "“With PCOS you can't get pregnant”" },
        { p: 'False. It may take longer because ovulation is irregular, but many people with PCOS get pregnant, with or without treatment.' },
        { h: '“Menopause happens overnight”' },
        {
          p: 'Usually not. It is preceded by perimenopause, which can last several years, with irregular cycles and symptoms that come and go. Menopause is confirmed after 12 months in a row without a period.',
        },
        { h: "“There's no risk of pregnancy in perimenopause”" },
        { p: 'False. As long as you ovulate, even irregularly, pregnancy is possible. Ask a professional when it is safe to stop contraception.' },
      ],
      consult: ['Discharge with a bad smell, a greenish or greyish colour, itching or burning.', 'Any bleeding after 12 months without a period.'],
      related: ['flujo-vaginal', 'its', 'sop', 'menopausia'],
    },
  ],

  glossary: [
    { term: 'Adenomyosis', def: 'Endometrial tissue inside the muscle of the uterus. It can cause painful, heavy periods.' },
    { term: 'Amenorrhoea', def: 'No period for 3 months or more (or none by age 15) outside pregnancy, breastfeeding or menopause.' },
    { term: 'Anovulation', def: "A cycle in which ovulation doesn't happen. Common in adolescence, perimenopause and PCOS." },
    { term: 'Menstrual cycle', def: 'The time from the first day of one period to the day before the next.' },
    { term: 'Clot', def: 'A build-up of thickened blood. Small ones are normal; large, frequent ones may mean heavy bleeding.' },
    { term: 'Corpus luteum', def: 'The structure left in the ovary after ovulation; it produces progesterone.' },
    { term: 'IUD', def: 'Intrauterine device (coil). It can be hormonal (releases levonorgestrel) or copper (hormone-free).' },
    { term: 'Dysmenorrhoea', def: 'Period pain. Primary if there is no other condition; secondary if it has a cause such as endometriosis.' },
    { term: 'Endometrium', def: 'The lining of the uterus, which thickens every cycle and sheds with your period.' },
    { term: 'Endometriosis', def: 'A condition in which tissue similar to the uterine lining grows outside the uterus, causing inflammation and pain.' },
    { term: 'Oestrogen', def: 'The main hormone of the first half of the cycle; it thickens the lining and promotes fertile discharge.' },
    { term: 'Follicular phase', def: 'The first part of the cycle, from your period to ovulation. Its length varies most.' },
    { term: 'Luteal phase', def: 'The part of the cycle between ovulation and your next period. It usually lasts 11–17 days.' },
    { term: 'Due date', def: 'The estimated date of delivery: 40 weeks from the first day of your last period.' },
    { term: 'hCG', def: 'The pregnancy hormone detected by pregnancy tests.' },
    { term: 'LH', def: 'Luteinising hormone. Its surge triggers ovulation and is detected by ovulation tests.' },
    { term: 'Lochia', def: 'The bleeding and discharge after giving birth, lasting about 6 weeks.' },
    { term: 'Menarche', def: 'Your first period.' },
    { term: 'Menopause', def: 'Your last period, confirmed after 12 months without menstruation.' },
    { term: 'Fibroid', def: 'A benign growth in the muscle of the uterus. It can cause heavy periods or no symptoms at all.' },
    { term: 'Cervical mucus', def: 'Discharge produced by the cervix. It becomes clear and stretchy near ovulation.' },
    { term: 'Ovulation', def: 'The release of an egg from the ovary, about 14 days before your next period.' },
    { term: 'Perimenopause', def: 'The transition years before menopause, with changing cycles and symptoms.' },
    { term: 'Progesterone', def: 'The hormone of the second half of the cycle; it prepares the uterus and raises basal temperature.' },
    { term: 'Intermenstrual bleeding', def: "Bleeding between two periods. If it keeps happening, it's worth getting checked." },
    { term: 'Gestational weeks', def: 'The way pregnancy is counted, from the first day of your last period (e.g. 12+3 means 12 weeks and 3 days).' },
    { term: 'PCOS', def: 'Polycystic ovary syndrome: a hormonal condition with irregular cycles and excess androgens.' },
    { term: 'PMS', def: 'Premenstrual syndrome: physical and emotional symptoms in the days before your period.' },
    { term: 'PMDD', def: 'Premenstrual dysphoric disorder: a severe form of PMS with significant emotional symptoms.' },
    { term: 'Basal body temperature', def: 'Your resting temperature on waking. It rises after ovulation.' },
    { term: 'Fertile window', def: 'The days of the cycle when pregnancy is possible: about 5 before ovulation plus the day itself.' },
    { term: 'HPV', def: 'Human papillomavirus. A very common infection; some types can cause cervical cancer. There is a vaccine.' },
  ],

  faq: [
    {
      q: 'Does my data leave my phone?',
      a: [
        "No. Everything is stored encrypted on your device. Only if you turn on sync, reminders with the app closed or a sharing link is anything sent to the server — always encrypted so the server can't read it.",
      ],
    },
    {
      q: 'What happens if I forget my PIN?',
      a: [
        "You can get in with your recovery code. Without it, nobody can decrypt your data (not even us) and you'll have to delete the profile. That's why keeping the code safe matters.",
      ],
    },
    {
      q: 'Can I use the predictions as contraception?',
      a: ['No. They are statistical estimates that can be wrong, especially with irregular cycles. Use a reliable contraceptive method.'],
    },
    { q: 'Which day counts as day 1?', a: ["The first day of real bleeding (light, medium or heavy flow). Spotting beforehand doesn't count as the start of your period."] },
    {
      q: 'Why did my predicted date change?',
      a: [
        'Because the app learns from every cycle you log. The more cycles, the more accurate it gets. If your period starts on a different day than expected, the next predictions are recalculated.',
      ],
    },
    {
      q: "Why can't I see fertile days?",
      a: [
        "They're hidden in pregnancy, postpartum and perimenopause modes. In “Avoiding pregnancy” you can turn them on in Settings → Usage mode. With hormonal contraception there's no natural ovulation.",
      ],
    },
    {
      q: "I'm on the pill — is the app useful?",
      a: ["Yes: log your bleeding, symptoms and doses, and turn on the pill reminder. Bear in mind that bleeding in the break week isn't a natural period."],
    },
    {
      q: 'Is it normal for my cycle to vary?',
      a: ['Yes. Variations of up to 7–9 days between cycles are considered normal in adults, and more in adolescence and perimenopause.'],
    },
    { q: 'Does it work offline?', a: ['Yes. After opening it once, it works without a connection. Install it on your Home Screen to use it like an app.'] },
    {
      q: 'Can I use it on several devices?',
      a: ['Yes, with end-to-end encrypted sync (Settings → Your data). You can also export an encrypted backup and import it on another device.'],
    },
    { q: 'Can more than one person use it on the same phone?', a: ['Yes. Each profile has its own lock and its data is encrypted separately. Add one in Settings → Profile.'] },
    {
      q: 'What does Luna do with my questions?',
      a: ['Nothing outside your device: Luna answers from a local knowledge base and your own data. The conversation is erased when you lock the app.'],
    },
  ],

  consult: {
    urgent: [
      'Bleeding that soaks a pad or tampon every hour for 2 hours or more, or with dizziness or fainting.',
      'Severe, sudden abdominal or pelvic pain, especially if you could be pregnant (possible ectopic pregnancy).',
      'High fever with a tampon or cup together with vomiting, a rash or dizziness (possible toxic shock).',
      'In pregnancy: bleeding, strong pain, fluid leaking, a severe headache with blurred vision, or your baby moving less.',
      'After birth: heavy bleeding, fever, chest pain, shortness of breath, or pain and swelling in one leg.',
      'Thoughts of ending your life or harming yourself: call 988 (US), 116 123 (UK Samaritans) or your emergency number.',
      'If you have been sexually assaulted: go to an emergency department or a sexual assault centre.',
    ],
    soon: [
      "A positive pregnancy test, to start antenatal care (or if you don't want to continue).",
      'Unprotected sex in the last 5 days: emergency contraception as soon as possible.',
      'Bleeding between periods or after sex.',
      'Discharge with a bad smell, intense itching, sores or pain when peeing.',
      'Pain during sex.',
      'Any bleeding after menopause.',
      'Sadness, anxiety or irritability affecting your life, especially in pregnancy or after birth.',
    ],
    routine: [
      'Very painful periods that make you miss school or work.',
      'Heavy periods or periods lasting more than 8 days.',
      'Cycles usually shorter than 24 days or longer than 38 (21–45 in adolescence).',
      "3 months or more without a period when you're not pregnant or breastfeeding.",
      'No period by age 15.',
      'Severe acne, excess hair or irregular cycles (possible PCOS).',
      "More than 12 months trying to conceive (6 if you're 35 or older).",
      'Menopause symptoms affecting your daily life.',
      "Your cervical screening according to your country's programme.",
    ],
  },

  help: [
    {
      id: 'install',
      title: 'Installing the app on your phone',
      steps: [
        'Android (Chrome): tap “Install” on the home card or open the ⋮ menu and choose “Install app”.',
        'iPhone (Safari): tap Share and then “Add to Home Screen”.',
        'Computer: click the install icon in the address bar.',
        'Once installed it opens full screen and works offline.',
      ],
    },
    {
      id: 'notifications',
      title: 'Turning on reminders',
      steps: [
        'Go to Settings → Reminders and tap “Allow notifications”.',
        'Turn on the reminders you want and choose the time.',
        'On iPhone, install the app on your Home Screen first (iOS 16.4 or later).',
        'To get them with the app closed, turn on “On-time reminders with the app closed” if available.',
        "If you don't want them to reveal anything, turn on discreet notifications in Privacy.",
      ],
    },
    {
      id: 'backup',
      title: 'Making a backup',
      steps: [
        'Go to Settings → Your data → Export.',
        'Choose “Encrypted backup” and type a password.',
        'Keep the file off your phone (cloud, computer, email to yourself).',
        'To restore it: Settings → Your data → Import.',
      ],
    },
    {
      id: 'sync',
      title: 'Using the app on two devices',
      steps: [
        'On the first device: Settings → Your data → Sync → Turn on.',
        'Keep the sync code that appears.',
        'On the second device, create your profile, go to the same screen and enter the code under “Already have a code?”.',
        'Changes sync, encrypted, when you open the app and when you log.',
      ],
    },
    {
      id: 'forgot',
      title: 'I forgot my PIN or passphrase',
      steps: [
        'On the lock screen, tap “I forgot my PIN”.',
        'Enter your recovery code.',
        'Create a new PIN or passphrase.',
        "If you don't have the code, you'll have to delete the profile: your data can't be decrypted without it.",
      ],
    },
    {
      id: 'profiles',
      title: 'Several profiles on one device',
      steps: [
        'Go to Settings → Profile → Add profile.',
        'Each profile has its own lock and separately encrypted data.',
        'To switch profile, lock the app and choose the profile on the lock screen.',
      ],
    },
    {
      id: 'safe',
      title: 'Safe screen and guest mode',
      steps: [
        'Turn on the safe screen in Settings → Privacy.',
        'Tap the shield in the top bar to instantly show a working calculator.',
        "You'll need to unlock to come back.",
        'Guest mode shows someone else only what you choose (for example, your next period).',
      ],
    },
    {
      id: 'delete',
      title: 'Deleting your data',
      steps: [
        'To delete a profile: Settings → Profile → Delete this profile.',
        'To delete everything: Settings → Your data → Delete everything.',
        'Encrypted sync data and shared links on the server are deleted too.',
        'If you want to keep your data, export a backup first.',
      ],
    },
  ],
};
