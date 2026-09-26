// Luna knowledge base (English). Everything is evaluated on the device.
// - redFlags: always checked first and shown on top (emergencies, crisis, violence).
// - contextual: personal questions answered with the user's own data (views/luna.js).
// - intents: informational answers; `topic` is the question offered as a follow-up chip.
// Keywords are normalised (lower case, no accents, apostrophes become spaces). Keywords of 4
// letters or fewer must match a whole word. Weights: 2 = weak hint, 4 = clear topic, 6 = exact phrase.

/** @type {import('../domain/luna.js').KnowledgeBase} */
export default {
  redFlags: [
    {
      id: 'heavyBleeding',
      patterns: ['soaking a pad', 'soaking through', 'soak a pad', 'soaked a pad', 'soaking pads', 'soaking a tampon', 'haemorrhag', 'hemorrhag', 'bleeding heavily', 'bleeding so much', "won't stop bleeding", 'wont stop bleeding', 'huge clots', 'massive clots', 'bleeding out'],
      answer: ['⚠️ If you soak a pad or tampon every hour for 2 hours or more, pass very large clots, or feel dizzy or weak, get urgent medical help now: go to the emergency department or call your emergency number (112 / 911 / 999).'],
    },
    {
      id: 'severePain',
      patterns: ['unbearable pain', 'excruciating', 'worst pain', 'severe pain', 'pain is unbearable', "can't stand the pain", 'sudden pain', 'agonising', 'agonizing'],
      answer: ["⚠️ If the pain is very intense or sudden, doesn't improve with painkillers, or comes with fever, vomiting, dizziness or bleeding — especially if you could be pregnant — go to the emergency department or call your emergency number."],
    },
    {
      id: 'fainting',
      patterns: ['fainted', 'passed out', 'fainting', 'about to faint', 'going to faint', 'blacked out'],
      answer: ["⚠️ If you've fainted or feel you're about to, lie down with your legs raised and ask for help. If you're bleeding heavily, could be pregnant or don't recover quickly, call your emergency number."],
    },
    {
      id: 'pregnancyBleeding',
      patterns: ['pregnant and bleeding', 'bleeding while pregnant', 'bleeding in pregnancy', 'bleeding during pregnancy', 'pregnant and spotting', 'spotting while pregnant', "i'm pregnant and i'm bleeding"],
      answer: ['⚠️ Any bleeding in pregnancy should be checked by a professional. If it is heavy, with clots, strong pain or dizziness, go to the emergency department now. If it is light spotting, call your midwife or maternity unit today.'],
    },
    {
      id: 'toxicShock',
      patterns: ['fever with a tampon', 'tampon and fever', 'fever and tampon', 'fever and a tampon', 'fever with my cup', 'cup and fever', 'fever with a cup'],
      answer: ['⚠️ A sudden high fever while using a tampon or cup, with vomiting, diarrhoea, a rash or dizziness, may be toxic shock syndrome: remove it and go to the emergency department now.'],
    },
    {
      id: 'preeclampsia',
      patterns: ['blurred vision', 'blurry vision', 'seeing spots', 'flashing lights', 'seeing flashes'],
      answer: ["⚠️ Blurred vision or flashing lights, especially with a severe headache or sudden swelling, can be a sign of pre-eclampsia if you're pregnant or recently gave birth. Contact maternity triage today or call your emergency number."],
    },
    {
      id: 'fetalMovement',
      patterns: ["baby isn't moving", 'baby not moving', 'baby is moving less', 'baby moving less', 'reduced movements', "can't feel the baby", "can't feel my baby", 'fewer kicks', 'baby stopped moving'],
      answer: ["⚠️ If your baby is moving less or differently, don't wait until tomorrow: call your maternity unit or go to maternity triage today."],
    },
    {
      id: 'waterBreak',
      patterns: ['waters broke', 'water broke', 'waters have broken', 'my waters have gone', 'leaking fluid'],
      answer: ["⚠️ If you think your waters have broken, note the time and the colour of the fluid and contact your maternity unit. If it's green, brown or bloody, the baby is moving less or you're under 37 weeks, go in without waiting."],
    },
    {
      id: 'chest',
      patterns: ['chest pain', 'short of breath', "can't breathe", 'cannot breathe', 'swollen leg', 'calf pain'],
      answer: ['⚠️ Chest pain, sudden shortness of breath, or pain and swelling in one leg can be serious, especially in pregnancy, after birth or if you take oestrogen-containing contraception. Call your emergency number now.'],
    },
    {
      id: 'selfHarm',
      patterns: ['suicid', 'kill myself', 'end my life', 'want to die', "don't want to live", 'dont want to live', 'self harm', 'self-harm', 'want to hurt myself', 'harm myself', 'better off dead'],
      answer: [
        "I'm so sorry you're going through this. You're not alone and you deserve help right now. 💜",
        'In the US, call or text 988 (Suicide & Crisis Lifeline). In the UK and Ireland, call Samaritans on 116 123. In Spain, call 024. Elsewhere, call your local emergency number (112 in Europe, 911 in the US, 999 in the UK).',
        "If you can, reach out to someone you trust now and don't stay alone.",
      ],
    },
    {
      id: 'violence',
      patterns: ['hits me', 'beats me', 'hit me', 'abusive partner', 'domestic violence', 'domestic abuse', 'raped', 'rape', 'sexual assault', 'sexually assaulted', 'forced me to have sex', 'afraid of my partner', 'scared of my partner'],
      answer: [
        "What you're describing is serious and it's not your fault. You deserve to be safe. 💜",
        'If you are in danger, call your emergency number. In the US: National Domestic Violence Hotline 1-800-799-7233 (or text START to 88788) and RAINN 1-800-656-4673 for sexual assault. In the UK: National Domestic Abuse Helpline 0808 2000 247 (free, 24 h). In Spain: 016.',
        "If you've been sexually assaulted, go to an emergency department or sexual assault centre: they can care for you, collect evidence if you want, and offer emergency contraception and infection prevention.",
      ],
    },
  ],

  contextual: {
    nextPeriod: { 'when is my next period': 6, 'when will my period': 6, 'when is my period': 6, 'next period': 5, 'when will i get my period': 6, 'when am i due': 5, 'when does my period': 6, 'when should my period': 6, 'my period due': 5 },
    fertileNow: { 'am i fertile': 6, 'fertile today': 5, 'fertile now': 5, 'my fertile days': 5, 'my fertile window': 5, 'in my fertile': 5, 'can i get pregnant today': 6, 'when are my fertile days': 6 },
    ovulation: { 'when do i ovulate': 6, 'when will i ovulate': 6, 'my ovulation': 5, 'have i ovulated': 6, 'did i ovulate': 6, 'when is my ovulation': 6 },
    cycleDay: { 'what day of my cycle': 6, 'which day of my cycle': 6, 'what cycle day': 5, 'what phase am i': 6, 'which phase am i': 6, 'my phase': 4 },
    cycleNormal: { 'is my cycle normal': 6, 'my cycle normal': 5, 'is my cycle regular': 6, 'am i regular': 5, 'how long is my cycle': 6, 'my average cycle': 5, 'are my cycles normal': 6, 'normal cycle': 3 },
    periodLength: { 'how long is my period': 6, 'how long does my period last': 6, 'my period last': 5, 'how many days is my period': 6 },
    pregnancyWeek: { 'how many weeks pregnant': 6, 'how far along': 6, 'how many weeks am i': 6, 'what week am i': 6, 'my due date': 5, 'when is my due date': 6 },
    pregnancyChance: { 'could i be pregnant': 6, 'can i be pregnant': 6, 'am i pregnant': 5, 'might i be pregnant': 6, 'chance of pregnancy': 5, 'chances of getting pregnant': 5, 'risk of pregnancy': 5, 'could i have got pregnant': 6 },
  },

  intents: [
    // ------------------------------------------------------------ Pain and symptoms
    {
      id: 'cramps',
      topic: 'How can I ease cramps?',
      keywords: { cramp: 4, 'period pain': 4, 'menstrual pain': 4, 'painful period': 4, dysmenorrh: 4, 'my period hurts': 4, 'stomach ache': 2, 'tummy ache': 2, 'ease the pain': 2, hurts: 2, pain: 1 },
      answer: [
        'Cramps are caused by prostaglandins, which make the uterus contract. What works best: an anti-inflammatory such as ibuprofen as the pain starts (following the leaflet), heat on your tummy or lower back, and gentle movement like walking or stretching.',
        "If that doesn't help, if it makes you miss school or work, or if you have pain during sex or outside your period, talk to your doctor: there may be a treatable cause such as endometriosis.",
      ],
      article: 'dolor-menstrual',
      followUps: ['endometriosis', 'heavyBleeding'],
    },
    {
      id: 'heavyBleeding',
      topic: 'Is my period too heavy?',
      keywords: { 'heavy period': 4, 'heavy bleeding': 4, 'too heavy': 5, 'bleed a lot': 4, 'lots of blood': 3, clot: 3, menorrhagia: 4, fibroid: 3, 'long period': 3 },
      answer: [
        "It counts as heavy if you change your pad or tampon every 1–2 hours, need double protection, pass clots bigger than a coin, bleed for more than 8 days or feel very tired.",
        "It's common and treatable (tranexamic acid, a hormonal IUD, contraceptive pills…). Book an appointment to get it checked and rule out anaemia. If you soak a pad every hour for 2 hours or feel dizzy, go to the emergency department.",
      ],
      article: 'sangrado-abundante',
      followUps: ['anemia', 'colors'],
    },
    {
      id: 'endometriosis',
      topic: 'What is endometriosis?',
      keywords: { endometriosis: 5, adenomyosis: 4, 'pelvic pain': 3, 'chronic pain': 2 },
      answer: [
        'Endometriosis is a condition where tissue similar to the uterine lining grows outside the uterus, causing inflammation and pain. It affects around 1 in 10 women and people with a uterus.',
        "Typical signs are very painful periods that don't improve with painkillers, pain during sex, pain when peeing or pooing during your period, and pelvic pain outside it. If this sounds like you, log your symptoms and take them to an appointment: diagnosis is often delayed because the pain gets normalised.",
      ],
      article: 'endometriosis',
      followUps: ['cramps'],
    },
    {
      id: 'pcos',
      topic: 'What is PCOS?',
      keywords: { pcos: 5, polycystic: 5, hirsutism: 4, 'excess hair': 3, 'facial hair': 3, 'insulin resistance': 4 },
      answer: [
        'Polycystic ovary syndrome (PCOS) affects 1 in 10 people with ovaries. It is diagnosed when at least two of these are present: irregular cycles, signs of excess androgens (acne, hair growth, hair loss) and ovaries with many follicles on ultrasound.',
        "There are treatments to regulate cycles, improve skin and help if you're trying to conceive, and it's worth keeping an eye on blood sugar and cholesterol. If you think you have it, talk to your doctor.",
      ],
      article: 'sop',
      followUps: ['irregular', 'ttc'],
    },
    {
      id: 'anemia',
      topic: 'Could I be anaemic?',
      keywords: { anaemi: 5, anemi: 5, iron: 4, ferritin: 5, tired: 2, tiredness: 2, exhausted: 2, 'no energy': 2 },
      answer: [
        'Heavy periods are a very common cause of low iron. Symptoms include persistent tiredness, pale skin, hair loss, dizziness or breathlessness on exertion.',
        'To prevent it, include legumes, meat, fish, eggs and leafy greens with foods rich in vitamin C. If you have symptoms, get a blood test before taking supplements on your own.',
      ],
      article: 'anemia',
      followUps: ['heavyBleeding', 'food'],
    },
    {
      id: 'headache',
      topic: 'Why do I get headaches with my period?',
      keywords: { headache: 4, migraine: 5, 'my head hurts': 4 },
      answer: [
        'The drop in oestrogen before your period can trigger headaches and migraines. Log them in the app to see whether they follow your cycle.',
        'Regular sleep and meal times and drinking water help. If they are frequent, preventive treatments exist. If you have migraine with aura, check before using contraception with oestrogen. A sudden, extremely severe headache needs emergency care.',
      ],
      article: 'migrana-menstrual',
    },
    {
      id: 'bloating',
      topic: 'How can I reduce bloating?',
      keywords: { bloat: 5, 'water retention': 5, gas: 3, 'swollen belly': 5, 'swollen tummy': 5 },
      answer: [
        'Bloating before and during your period is very common because of hormonal changes. Cutting down on salt and alcohol, drinking water, gradually eating more fibre and moving every day usually help.',
        "If bloating is persistent, doesn't follow your cycle or comes with feeling full quickly or weight loss, get it checked.",
      ],
      article: 'alimentacion-ciclo',
    },
    {
      id: 'acne',
      topic: 'Why do I break out before my period?',
      keywords: { acne: 5, spots: 3, pimples: 4, 'break out': 4, breakout: 4, 'oily skin': 3 },
      answer: [
        "Androgens affect oil production and many people notice breakouts before their period. Gentle cleansing, not picking and using non-comedogenic products help.",
        'If acne is severe or comes with irregular cycles or excess hair, it may be linked to PCOS: mention it to your doctor. Some contraceptives also improve it.',
      ],
      article: 'sop',
    },
    {
      id: 'breastPain',
      topic: 'Why are my breasts sore?',
      keywords: { breast: 3, breasts: 3, 'sore breasts': 6, 'tender breasts': 6, 'breast lump': 6, 'lump in my breast': 6 },
      answer: [
        'Swollen or tender breasts in the days before your period are common because of progesterone, and they ease once bleeding starts. A comfortable bra and less caffeine may help.',
        "If you notice a lump, skin or nipple changes, bloody discharge or pain that doesn't follow your cycle, book an appointment to be examined.",
      ],
      article: 'sindrome-premenstrual',
    },
    {
      id: 'colors',
      topic: 'What does the colour of my period mean?',
      keywords: { 'colour of my period': 6, 'color of my period': 6, colour: 2, color: 2, 'brown period': 5, 'brown blood': 5, 'black period': 5, 'dark blood': 4, 'pink period': 4 },
      answer: [
        'The colour mostly depends on how long the blood takes to leave the body: bright red on the heaviest days, and brown or dark at the start and end, because it is older blood. Pink is usually blood mixed with discharge.',
        'Get checked if it is greyish or orange with a bad smell or itching (possible infection), or if there are large, frequent clots.',
      ],
      article: 'colores-flujo',
    },
    {
      id: 'spotting',
      topic: 'Is spotting between periods normal?',
      keywords: { spotting: 4, 'bleeding between periods': 5, 'bleeding after sex': 5, 'implantation bleeding': 5, 'intermenstrual bleeding': 5 },
      answer: [
        'Light spotting can happen around ovulation, in the first months of hormonal contraception or after missed doses.',
        "If it keeps happening, occurs after sex or after menopause, or you don't know why, get it checked. If pregnancy is possible, take a test.",
      ],
      article: 'ciclos-irregulares',
      followUps: ['pregnancyTest'],
    },

    // ------------------------------------------------------------ Cycle
    {
      id: 'cycleBasics',
      topic: 'What are the phases of the cycle?',
      keywords: { 'phases of the cycle': 5, 'cycle phases': 5, 'luteal phase': 4, 'follicular phase': 4, 'menstrual cycle': 3, 'what is a period': 4, 'why do i have periods': 4, 'how does the cycle work': 5 },
      answer: [
        "The cycle has four phases: menstruation, the follicular phase (oestrogen rises and an egg matures), ovulation and the luteal phase (progesterone prepares the uterus). If there's no pregnancy, hormones drop and a new period starts.",
        "The luteal phase is fairly stable (about 11–17 days); what varies most from cycle to cycle is the follicular phase. That's why ovulation doesn't always fall on day 14.",
      ],
      article: 'ciclo-menstrual',
      followUps: ['fertileWindow'],
    },
    {
      id: 'irregular',
      topic: 'Why are my cycles irregular?',
      keywords: { irregular: 4, 'irregular cycles': 4, 'irregular periods': 4, 'changes every month': 2 },
      answer: [
        "In adults, a normal cycle lasts 24 to 38 days and can vary by up to 7–9 days from month to month. It's normal for it to vary more in adolescence and perimenopause.",
        'Stress, travel, weight changes, intense exercise, breastfeeding, PCOS or thyroid problems can affect it. Get checked if you go 3 months without a period, if your cycles are usually shorter than 24 days or longer than 38, or if you bleed between periods.',
      ],
      article: 'ciclos-irregulares',
      followUps: ['late', 'pcos'],
    },
    {
      id: 'late',
      topic: 'My period is late, what should I do?',
      keywords: { late: 4, 'missed period': 5, 'missed my period': 5, "period hasn't come": 5, 'period hasnt come': 5, 'no period': 3 },
      answer: [
        "If you've had unprotected sex or your method may have failed, take a pregnancy test: it's reliable from the first day your period is late. If it's negative and your period doesn't come, repeat it in 3–5 days.",
        "One-off delays are also caused by stress, travel, illness or changes in weight or exercise. If you go 3 months without a period and aren't pregnant, get checked.",
      ],
      article: 'test-embarazo',
      followUps: ['pregnancyTest', 'irregular'],
    },
    {
      id: 'normalPeriod',
      topic: 'How long does a normal period last?',
      keywords: { 'how long does a period last': 5, 'how long should a period last': 5, 'normal period': 4, 'period length': 4, 'period last': 3, 'how much blood': 4 },
      answer: [
        'A normal period lasts up to 8 days; 3–7 is most common. In total about 30–80 ml of blood is lost, even if it looks like more.',
        'If it lasts more than 8 days or is so heavy it interferes with your life, talk to a professional.',
      ],
      article: 'ciclos-irregulares',
      followUps: ['heavyBleeding'],
    },
    {
      id: 'firstPeriod',
      topic: 'When does your first period come?',
      keywords: { 'first period': 5, menarche: 5, 'never had a period': 5, "haven't started my period": 5, 'havent started my period': 5, 'when will i start my period': 5 },
      answer: [
        'First periods usually come between ages 10 and 15, about 2–3 years after the breasts start developing. Whitish discharge a few months before is a sign it is on its way.',
        "Irregular cycles are normal in the first years. Get checked if it hasn't come by 15, or if pain or bleeding stop you living normally.",
      ],
      article: 'primera-regla',
      followUps: ['products'],
    },
    {
      id: 'discharge',
      topic: 'Is my discharge normal?',
      keywords: { discharge: 4, 'vaginal discharge': 5, 'cervical mucus': 5, 'egg white': 4, 'white discharge': 2, 'yellow discharge': 2, 'clear discharge': 4 },
      answer: [
        'Discharge changes through the cycle: scarce after your period, creamy afterwards, clear and stretchy like egg white near ovulation, and thicker in the luteal phase. All of that is normal.',
        'Get checked if it smells bad, is grey, yellow-green or clumpy with itching, or comes with pain or fever.',
      ],
      article: 'flujo-vaginal',
      followUps: ['infection', 'fertileWindow'],
    },
    {
      id: 'infection',
      topic: 'Do I have a vaginal or urinary infection?',
      keywords: { itch: 5, itchy: 6, discharge: 1, itching: 5, 'itchy discharge': 6, burning: 4, thrush: 5, yeast: 5, 'bad smell': 4, 'fishy smell': 5, vaginosis: 5, 'vaginal infection': 5, uti: 5, 'urinary infection': 5, cystitis: 5, 'burns when i pee': 5, 'hurts when i pee': 5 },
      answer: [
        'Itching with thick white discharge is usually thrush; grey discharge with a fishy smell, bacterial vaginosis; and burning when peeing with frequent urges, a urinary infection.',
        "All are easy to treat, but it's worth confirming: book an appointment, especially if it's the first time, you're pregnant, you have a fever or back pain, or it keeps coming back. Avoid douching.",
      ],
      article: 'higiene-intima',
      followUps: ['sti'],
    },

    // ------------------------------------------------------------ Fertility
    {
      id: 'fertileWindow',
      topic: 'What are the fertile days?',
      keywords: { 'fertile days': 2, 'fertile window': 3, 'what are the fertile days': 6, 'how many fertile days': 6, fertility: 2 },
      answer: [
        'The fertile days are the 5 days before ovulation plus ovulation day, because sperm can live up to 5 days and the egg about 12–24 hours.',
        "The signs are clear, stretchy discharge, a positive LH test and, after ovulation, a rise in basal temperature. Remember that estimates don't work as contraception.",
      ],
      article: 'ovulacion',
      followUps: ['ovulationInfo', 'lhTest'],
    },
    {
      id: 'ovulationInfo',
      topic: "How do I know if I'm ovulating?",
      keywords: { ovulation: 2, 'what is ovulation': 5, 'ovulation pain': 5, mittelschmerz: 5, 'signs of ovulation': 5, 'ovulation symptoms': 5, ovulating: 3, "how do i know if i'm ovulating": 6 },
      answer: [
        'Ovulation happens about 14 days before your next period. Some signs: egg-white discharge, a mild pain on one side of the pelvis, a higher sex drive and a positive LH test 24–36 hours before.',
        'Basal temperature rises after ovulation and confirms it afterwards. If you log temperature or LH tests, the app will use them to confirm your ovulation.',
      ],
      article: 'ovulacion',
      followUps: ['bbt', 'lhTest'],
    },
    {
      id: 'bbt',
      topic: 'How do I measure basal body temperature?',
      keywords: { 'basal temperature': 5, 'basal body temperature': 6, bbt: 4, thermometer: 3, 'temperature rise': 4 },
      answer: [
        'Take it as soon as you wake up, before getting up, at the same time and after at least 3 hours of sleep, with a two-decimal thermometer.',
        "After ovulation it rises by 0.2–0.5 °C. The app confirms it when it sees 3 temperatures in a row above the previous 6. Mark any reading as “disturbed” after little sleep, alcohol or fever.",
      ],
      article: 'temperatura-basal',
    },
    {
      id: 'lhTest',
      topic: 'How do I use ovulation tests?',
      keywords: { 'ovulation test': 5, 'ovulation tests': 5, 'opk': 5, lh: 3, 'lh surge': 5, 'ovulation strip': 4 },
      answer: [
        'They detect the LH surge, which happens 24–36 hours before ovulation. Start about 17 days before your next expected period and test every day at the same time, ideally in the afternoon.',
        'A positive means today and the next two days are the most fertile. With PCOS you may get false positives.',
      ],
      article: 'test-ovulacion',
    },
    {
      id: 'ttc',
      topic: 'Tips for trying to conceive',
      keywords: { 'trying to conceive': 5, ttc: 5, 'get pregnant': 4, 'want to get pregnant': 5, "can't get pregnant": 5, 'cant get pregnant': 5, conceive: 4, infertility: 4, 'fertility treatment': 4, 'tips for getting pregnant': 5 },
      answer: [
        "The most effective approach is having sex every 2–3 days through the cycle, or daily in the fertile window, without obsessing over the exact time. Take folic acid before pregnancy, avoid smoking and alcohol and keep healthy habits.",
        "Each cycle there's a 20–25% chance, and about 8 in 10 couples conceive within a year. Get checked after 12 months (6 if you're 35 or older), or sooner if your cycles are very irregular.",
      ],
      article: 'buscar-embarazo',
      followUps: ['folicAcid', 'lhTest'],
    },
    {
      id: 'folicAcid',
      topic: 'When should I take folic acid?',
      keywords: { 'folic acid': 5, folate: 4, vitamins: 2, iodine: 3, prenatal: 3 },
      answer: [
        "Taking 400 micrograms of folic acid a day is recommended from at least a month before trying to conceive until week 12, to prevent neural tube defects. A higher dose is advised in some cases.",
        'Ask your healthcare professional about iodine and other vitamins for your situation.',
      ],
      article: 'buscar-embarazo',
    },
    {
      id: 'pregnancyTest',
      topic: 'When should I take a pregnancy test?',
      keywords: { 'pregnancy test': 5, 'positive test': 3, 'negative test': 3, 'two lines': 3, 'faint line': 4 },
      answer: [
        "Urine tests are reliable from the first day your period is late. If testing earlier, use your first morning urine. A faint line is usually positive: repeat in 48 hours.",
        "If it's negative and your period doesn't come, repeat in 3–5 days. If your cycles are irregular, wait 3 weeks after the unprotected sex.",
      ],
      article: 'test-embarazo',
      followUps: ['pregnancyEarly', 'abortion'],
    },
    {
      id: 'sexDuringPeriod',
      topic: 'Can I get pregnant on my period?',
      keywords: { 'sex on my period': 5, 'sex during my period': 5, 'pregnant on my period': 6, 'pregnant during my period': 6 },
      answer: [
        "It's unlikely but not impossible: if your cycles are short you could ovulate a few days after your period, and sperm survive up to 5 days.",
        'Sex during your period is safe if you both want it. STIs are passed on just the same, so condoms still matter.',
      ],
      article: 'ovulacion',
    },

    // ------------------------------------------------------------ Contraception
    {
      id: 'emergencyContraception',
      topic: 'How does the morning-after pill work?',
      keywords: { 'morning after': 6, 'morning-after': 6, 'emergency contraception': 5, 'emergency pill': 5, 'plan b': 5, 'condom broke': 5, 'condom split': 5, unprotected: 3, 'without a condom': 3, 'without protection': 3 },
      answer: [
        'The sooner, the better. The levonorgestrel pill works up to 72 hours after, and the ulipristal pill up to 120 hours (more effective in the later days). A copper IUD, up to 5 days, is the most effective option.',
        "It doesn't cause an abortion: it delays ovulation. If you vomit within 3 hours you need another dose, and take a test if your period is more than 7 days late.",
      ],
      article: 'anticoncepcion-emergencia',
      followUps: ['missedPill', 'contraceptionMethods'],
    },
    {
      id: 'missedPill',
      topic: 'I missed my pill, what should I do?',
      keywords: { 'missed pill': 5, 'missed a pill': 5, 'forgot a pill': 5, 'pill late': 5, 'missed my pill': 5, 'forgot my pill': 5, 'forgot the pill': 5, 'forgot to take my pill': 5, 'late pill': 4, 'vomited my pill': 5, 'threw up my pill': 5 },
      answer: [
        'With the combined pill: if only one is missed (less than 48 h), take it as soon as you remember, even if that means two at once, and carry on. If two or more, take the last one, use condoms for 7 days and, if it was in week 3, start the next pack without a break.',
        'If it was in week 1 and you had unprotected sex, consider emergency contraception. With the progestogen-only pill the window is 12 hours (desogestrel) or 3 hours (others). Always check your leaflet.',
      ],
      article: 'olvido-pildora',
      followUps: ['emergencyContraception'],
    },
    {
      id: 'contraceptionMethods',
      topic: 'Which contraceptive method is right for me?',
      keywords: { contracepti: 3, 'birth control': 4, iud: 4, coil: 4, implant: 3, 'vaginal ring': 4, patch: 3, 'contraceptive injection': 4, condom: 2, 'which method': 2 },
      answer: [
        'The most effective are the implant and IUDs (fewer than 1 pregnancy per 100 people a year). The pill, patch and ring are about 7 in 100 with typical use, and condoms about 13 — but condoms are the only method that also protects against STIs.',
        'The best option depends on your health, your preferences and whether you want to avoid hormones or oestrogen. A sexual health or family planning clinic can help you choose.',
      ],
      article: 'metodos-anticonceptivos',
      followUps: ['pillBleeding', 'sti'],
    },
    {
      id: 'pillBleeding',
      topic: 'Is it normal to bleed on the pill?',
      keywords: { 'bleed on the pill': 6, 'bleeding on the pill': 6, 'spotting on the pill': 6, 'withdrawal bleed': 5, 'period on the pill': 4, 'break week': 4, 'skip the break': 4, 'back to back': 3 },
      answer: [
        "On the pill there's no natural period: bleeding in the break week is a withdrawal bleed. Spotting between doses is common in the first 3 months and usually settles.",
        'Many regimens let you safely skip the break. If spotting persists, starts suddenly after months without it or comes with pain, get checked to rule out missed pills, interactions or infection.',
      ],
      article: 'metodos-anticonceptivos',
    },
    {
      id: 'sti',
      topic: 'How do I know if I have an STI?',
      keywords: { sti: 5, std: 5, 'sexually transmitted': 5, chlamydia: 5, gonorrh: 5, hpv: 5, herpes: 4, syphilis: 5, hiv: 5, 'smear test': 4, 'pap smear': 4 },
      answer: [
        'Many sexually transmitted infections cause no symptoms, so testing is the only way to know, especially with a new partner. They can cause unusual discharge, sores, warts, pain when peeing or bleeding after sex.',
        'Condoms protect against most, the HPV vaccine prevents most cervical cancers, and after a possible HIV exposure there is preventive treatment that must start within 72 hours.',
      ],
      article: 'its',
    },

    // ------------------------------------------------------------ Products
    {
      id: 'products',
      topic: 'Which period product should I use?',
      keywords: { tampon: 3, tampons: 3, pad: 3, pads: 3, 'menstrual cup': 5, cup: 3, 'period pants': 5, 'period underwear': 5, 'menstrual disc': 5, 'period product': 4 },
      answer: [
        'There is no single best one: pads are the simplest; tampons are comfortable for sport (change every 4–8 hours); cups and discs are reusable and last longer; and period pants are very comfortable.',
        'Use the lowest absorbency you need and, if you have an IUD, break the seal before removing a cup.',
      ],
      article: 'productos-menstruales',
      followUps: ['tss'],
    },
    {
      id: 'tss',
      topic: 'What is toxic shock syndrome?',
      keywords: { 'toxic shock': 6, tss: 5 },
      answer: [
        'It is a very rare but serious reaction to bacterial toxins, linked to prolonged tampon use. It causes a sudden high fever, vomiting, diarrhoea, a sunburn-like rash and dizziness.',
        'To prevent it, use the lowest absorbency you need and change tampons every 4–8 hours. If you get those symptoms, remove it and go to the emergency department.',
      ],
      article: 'shock-toxico',
    },

    // ------------------------------------------------------------ Mood and wellbeing
    {
      id: 'pms',
      topic: 'Why does my mood change before my period?',
      keywords: { pms: 5, premenstrual: 4, pmdd: 5, 'before my period': 3, 'mood swings': 3, irritable: 2, mood: 2, 'feel sad': 3 },
      answer: [
        'In the luteal phase some people are more sensitive to changes in oestrogen and progesterone: irritability, sadness, anxiety, bloating or cravings that go away once the period starts.',
        'Regular exercise, good sleep, less caffeine, salt and alcohol, and stress-management techniques help. If symptoms seriously affect your life, it may be premenstrual dysphoric disorder (PMDD), which has effective treatment.',
      ],
      article: 'sindrome-premenstrual',
      followUps: ['mood'],
    },
    {
      id: 'mood',
      topic: 'I feel sad or anxious',
      keywords: { sad: 3, anxiety: 3, anxious: 3, depressed: 4, depression: 4, stress: 2, stressed: 3, 'feel low': 3, 'feeling down': 3 },
      answer: [
        "I'm sorry you feel this way. 💜 Your cycle can influence your mood, and logging how you feel will help you see whether there's a pattern.",
        "Looking after your sleep, moving and leaning on people you trust helps. If sadness or anxiety last more than two weeks or stop you living your life, ask for professional help; you don't have to go through it alone.",
      ],
      article: 'animo-ciclo',
      followUps: ['pms', 'sleep'],
    },
    {
      id: 'libido',
      topic: 'Is a low sex drive normal?',
      keywords: { libido: 5, 'sex drive': 5, 'no desire': 4, 'dont feel like sex': 5, "don't feel like sex": 5 },
      answer: [
        'Desire varies through the cycle (it often rises near ovulation) and with stress, tiredness, some contraceptives or antidepressants, after birth and in menopause.',
        'If it worries you or sex is painful, talk to someone: dryness and pain are treatable.',
      ],
      article: 'animo-ciclo',
    },
    {
      id: 'sleep',
      topic: "I'm sleeping badly, what can I do?",
      keywords: { insomnia: 5, 'sleeping badly': 5, "can't sleep": 5, 'cant sleep': 5, sleep: 3, 'wake up at night': 3 },
      answer: [
        "Poorer sleep is common before your period and in menopause. Regular hours, a cool dark bedroom, avoiding screens, caffeine and alcohol at night, and moving during the day all help.",
        "If you've slept badly for weeks, cognitive behavioural therapy for insomnia is very effective. Also get checked if you snore loudly or wake up gasping.",
      ],
      article: 'sueno',
    },
    {
      id: 'food',
      topic: 'What should I eat during my period?',
      keywords: { 'what to eat': 4, 'what should i eat': 5, diet: 3, food: 3, cravings: 4, chocolate: 3, nutrition: 4 },
      answer: [
        "During your period, iron-rich foods (legumes, meat, fish, eggs, leafy greens) with vitamin C help. Before your period it's normal to be hungrier: choose wholegrains and nuts.",
        'Avoid very restrictive diets: too little energy can make your period stop.',
      ],
      article: 'alimentacion-ciclo',
    },
    {
      id: 'exercise',
      topic: 'Can I exercise on my period?',
      keywords: { 'exercise on my period': 5, 'exercise during my period': 5, 'swim on my period': 5, 'swimming on my period': 5, 'sport on my period': 5, exercise: 2, workout: 2, sport: 2, swim: 2 },
      answer: [
        'Yes! Exercise often eases pain and lifts your mood. Adjust the intensity to how you feel. You can swim without any problem with a tampon or cup.',
        'If you train a lot and your periods stop, get checked: it may be due to low energy availability.',
      ],
      article: 'ejercicio-ciclo',
    },
    {
      id: 'pelvicFloor',
      topic: 'How do I strengthen my pelvic floor?',
      keywords: { 'pelvic floor': 5, 'bladder leaks': 5, 'urine leaks': 5, incontinence: 5, kegel: 5, 'leak when i sneeze': 5 },
      answer: [
        'Squeeze the muscles you would use to stop peeing and hold in wind, hold for 5–10 seconds and relax for the same. Do 10 repetitions, 3 times a day, without holding your breath.',
        "After birth or in menopause, a pelvic health physiotherapist can help a lot. Leaks are common, but they aren't normal and you don't have to put up with them.",
      ],
      article: 'posparto',
    },
    {
      id: 'ovarianCyst',
      topic: 'What is an ovarian cyst?',
      keywords: { cyst: 4, 'ovarian cyst': 6, 'cyst on my ovary': 6 },
      answer: [
        'Most ovarian cysts are functional: they form with ovulation and go away by themselves within one or two cycles. They are often found by chance on a scan.',
        'Get urgent care for sudden, severe pelvic pain, especially with nausea or vomiting, because a cyst can rupture or twist the ovary.',
      ],
    },

    // ------------------------------------------------------------ Pregnancy and postpartum
    {
      id: 'pregnancyEarly',
      topic: "What should I do now that I'm pregnant?",
      keywords: { "i'm pregnant": 3, 'im pregnant': 3, 'just found out i m pregnant': 6, 'early pregnancy': 5, 'first trimester': 4, 'newly pregnant': 5, 'now that i m pregnant': 6 },
      answer: [
        "Weeks are counted from the first day of your last period. Book an appointment with your doctor or midwife, take folic acid and avoid alcohol, tobacco and any medicine without checking.",
        "If you like, turn on pregnancy mode in Settings → Usage mode to follow your pregnancy week by week. If you don't want to continue the pregnancy, you can also get information from your doctor or a sexual health clinic.",
      ],
      article: 'embarazo-inicio',
      followUps: ['pregnancyWarning', 'nausea'],
    },
    {
      id: 'nausea',
      topic: 'How can I ease pregnancy nausea?',
      keywords: { nausea: 4, 'morning sickness': 6, vomiting: 3, 'feel sick': 4, hyperemesis: 5, "can't keep anything down": 5 },
      answer: [
        'It usually helps to eat small, frequent meals, have dry foods (crackers, toast) on waking, avoid strong smells and sip drinks between meals. Ginger may help.',
        "Get checked if you can't keep fluids down, pee very little, lose weight or feel dizzy when standing: it may be hyperemesis, which is treatable.",
      ],
      article: 'embarazo-inicio',
    },
    {
      id: 'pregnancyWarning',
      topic: 'Warning signs in pregnancy',
      keywords: { 'pregnant and bleeding': 6, 'bleeding in pregnancy': 6, 'warning signs': 5, 'danger signs': 5, 'pre-eclampsia': 5, preeclampsia: 5, 'when to go to hospital': 5, 'swollen hands': 4, 'baby movements': 4, 'baby moving': 4 },
      answer: [
        'Go to the emergency department if you have bleeding, severe abdominal pain, fluid leaking, a fever, a bad headache with blurred vision or sudden swelling, regular contractions before 37 weeks, or your baby moving less.',
        "Also if you have intense itching of hands and feet, vomiting that stops you drinking, or thoughts of harming yourself. If in doubt, get checked.",
      ],
      article: 'embarazo-alarma',
      followUps: ['contractions'],
    },
    {
      id: 'contractions',
      topic: "How do I know if I'm in labour?",
      keywords: { contraction: 4, 'count contractions': 5, kicks: 4, 'kick count': 5, 'braxton hicks': 5, labour: 5, labor: 5, 'in labour': 5 },
      answer: [
        "Labour contractions become regular, longer and stronger and don't ease with rest. A common guide: every 5 minutes, lasting 1 minute, for 1 hour. Follow your maternity unit's advice.",
        "In Pregnancy tools you'll find a contraction timer and a baby movement counter.",
      ],
      article: 'embarazo-alarma',
    },
    {
      id: 'miscarriage',
      topic: "I've had a pregnancy loss",
      keywords: { miscarriage: 6, miscarried: 6, 'pregnancy loss': 6, 'lost the baby': 6, 'lost my baby': 6, 'lost the pregnancy': 6, ectopic: 4, "i've had a pregnancy loss": 6 },
      answer: [
        "I'm so very sorry. 💜 Losing a pregnancy is very hard, and it isn't your fault: it's almost always due to chromosomal causes, not something you did.",
        'Afterwards, bleeding can last up to 2 weeks and your period usually returns in 4–6. Go to the emergency department if bleeding is very heavy or you have a fever or severe pain. Give yourself time, and ask for support if you need it.',
      ],
      article: 'perdida-gestacional',
    },
    {
      id: 'abortion',
      topic: 'Where can I find information about abortion?',
      keywords: { abortion: 5, 'end the pregnancy': 6, 'terminate the pregnancy': 6, termination: 5, "don't want to be pregnant": 5, 'dont want to be pregnant': 5 },
      answer: [
        'It is your decision and you can get information without committing to anything. Laws, time limits and services vary a lot between countries.',
        'Ask your doctor, a sexual health or family planning clinic. The sooner you seek information, the more options you will have.',
      ],
      article: 'test-embarazo',
    },
    {
      id: 'postpartumBleeding',
      topic: 'How long does bleeding last after birth?',
      keywords: { lochia: 5, 'bleeding after birth': 6, 'bleeding after giving birth': 6, 'after birth': 3, postpartum: 3, postnatal: 3 },
      answer: [
        'Lochia lasts up to about 6 weeks: it starts red and heavy and gradually turns pink, brown and yellowish.',
        'Go to the emergency department if you soak a pad in an hour or less, pass large clots, bleeding gets heavier again, or you have a fever or a bad smell.',
      ],
      article: 'posparto',
      followUps: ['breastfeedingFertility', 'postpartumMood'],
    },
    {
      id: 'breastfeedingFertility',
      topic: 'Can I get pregnant while breastfeeding?',
      keywords: { breastfeeding: 4, 'breast feeding': 4, nursing: 4, lam: 5, 'pregnant while breastfeeding': 6 },
      answer: [
        'Yes, you can. Breastfeeding only protects you if your baby is under 6 months, feeds only on breast milk day and night, and your period hasn’t returned. If any of these fails, you could ovulate before your first period.',
        'The progestogen-only pill, IUDs, the implant and condoms are compatible with breastfeeding.',
      ],
      article: 'lactancia-fertilidad',
    },
    {
      id: 'postpartumMood',
      topic: 'I feel low since giving birth',
      keywords: { 'postnatal depression': 6, 'postpartum depression': 6, 'baby blues': 5, 'low since giving birth': 6, 'sad after birth': 6, 'bad mother': 5, "don't love my baby": 5 },
      answer: [
        "Ups and downs and tearfulness are very common in the first 2 weeks. If sadness, anxiety or loss of joy last longer, it may be postnatal depression, which affects more than 1 in 10 people.",
        "It isn't your fault and doesn't make you a worse parent, and it's treatable. Talk to your midwife or doctor. If you have thoughts of harming yourself or your baby, get urgent help (988 in the US, 116 123 in the UK, or your emergency number).",
      ],
      article: 'salud-mental-perinatal',
    },

    // ------------------------------------------------------------ Menopause
    {
      id: 'menopause',
      topic: 'What is perimenopause?',
      keywords: { menopause: 4, perimenopause: 5, climacteric: 5, 'last period': 3, hrt: 5, 'hormone therapy': 4, 'hormone replacement': 4 },
      answer: [
        'Perimenopause is the years before your last period, with changing cycles, hot flashes, poorer sleep or mood changes. Menopause is confirmed after 12 months without a period and arrives on average around age 51.',
        'Hormone therapy is the most effective treatment for symptoms and, for many people, its benefits outweigh the risks; non-hormonal options exist too. Keep using contraception until 12 months after your last period.',
      ],
      article: 'menopausia',
      followUps: ['hotFlashes', 'dryness'],
    },
    {
      id: 'hotFlashes',
      topic: 'How can I ease hot flashes?',
      keywords: { 'hot flash': 5, 'hot flashes': 5, 'hot flush': 5, 'hot flushes': 5, 'night sweats': 5, flushing: 4 },
      answer: [
        'Dress in layers, keep the bedroom cool, have cold water nearby and spot your triggers (alcohol, spicy food, caffeine, stress). Slow breathing and cognitive behavioural therapy reduce their impact.',
        'If they affect your life, hormone therapy and some non-hormonal medicines work well: talk to your doctor.',
      ],
      article: 'sofocos',
      followUps: ['sleep'],
    },
    {
      id: 'dryness',
      topic: 'I have vaginal dryness',
      keywords: { 'vaginal dryness': 6, dryness: 4, 'painful sex': 4, 'sex hurts': 4, dyspareunia: 5, lubricant: 4, lube: 4 },
      answer: [
        'Vaginal dryness is very common in menopause, while breastfeeding and with some treatments. Regular vaginal moisturisers and lubricants help.',
        'Low-dose vaginal oestrogen is very effective and safe for most people. Painful sex always deserves a check-up: it can be solved.',
      ],
      article: 'salud-vaginal-menopausia',
    },
    {
      id: 'bones',
      topic: 'How do I look after my bones?',
      keywords: { osteoporosis: 5, bones: 3, calcium: 3, 'vitamin d': 4, 'bone density': 5 },
      answer: [
        'After menopause bones lose density faster. Strength and impact exercise, enough calcium and vitamin D, not smoking and moderating alcohol all help.',
        'Ask your doctor whether a bone density scan makes sense for your risk factors.',
      ],
      article: 'huesos-corazon',
    },

    // ------------------------------------------------------------ About the app
    {
      id: 'appPrivacy',
      topic: 'Who can see my data?',
      keywords: { privacy: 4, 'my data': 3, 'who can see': 4, encrypt: 4, 'is it safe': 3, 'sell my data': 5, 'sell data': 5 },
      answer: [
        'Only you. Your data is encrypted with AES-256 on your device and unlocked with your PIN, passphrase or biometrics. There are no accounts, ads or trackers, and we never sell data.',
        'Sync, cloud reminders and sharing links are optional and end-to-end encrypted. You can export or delete everything in Settings → Your data.',
      ],
    },
    {
      id: 'appHowTo',
      topic: 'How do I log my period?',
      keywords: { 'how do i log': 5, 'how to log': 5, 'log my period': 5, 'record my period': 5, 'how do i use the app': 5, 'how does the app work': 5 },
      answer: [
        'On Today, tap “My period started”, or tap the + button to open the full daily log. In the Calendar you can tap “Edit period” and mark several days in a row.',
        'The more days you log (flow, symptoms, mood), the better your predictions and patterns will be.',
      ],
    },
    {
      id: 'predictions',
      topic: 'Are the predictions reliable?',
      keywords: { prediction: 4, predictions: 4, reliable: 3, accurate: 3, 'why did the date change': 5 },
      answer: [
        'The app calculates predictions from your own cycles, giving more weight to recent ones, and shows you a margin and a confidence level. With 3–4 logged cycles they are usually quite accurate if you are regular.',
        'They are still estimates: stress or illness can bring your period forward or delay it. And they should never be used as contraception.',
      ],
    },
  ],

  smalltalk: {
    hello: { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'hiya'], answer: ['Hi {name}! 🌙 How can I help you today?'] },
    thanks: { keywords: ['thanks', 'thank you', 'great', 'perfect', 'cheers'], answer: ["You're welcome! I'm here whenever you need me. 💜"] },
    bye: { keywords: ['bye', 'goodbye', 'see you', 'good night', 'goodnight'], answer: ['See you soon! Take care. 🌙'] },
    howAreYou: { keywords: ['how are you', 'how r u'], answer: ["I'm great, thanks for asking! And you? If you like, tell me how you're feeling today or ask me anything."] },
    who: { keywords: ['who are you', 'what are you', 'are you a person', 'are you real', 'what can you do', 'how do you work'], answer: ["I'm Luna, an assistant that runs inside the app, offline and without sending anything. I answer with checked health information and your own data, but I'm not a person or a doctor.", 'Ask me about your next period, your fertile days, symptoms, contraception, pregnancy or menopause.'] },
    love: { keywords: ['love you', 'you are great', "you're great", 'you are the best'], answer: ["That's lovely! 💜 I'm glad I can be here for you."] },
  },

  fallback: [
    "I'm not sure I understood. Could you put it another way?",
    'I can help with your next period, fertile days, cramps, late periods, contraception, pregnancy, postpartum or menopause. You can also search the Learn section.',
  ],

  disclaimer: "ℹ️ For guidance only: this doesn't replace an assessment by a healthcare professional.",
};
