/* ============================================================
   Jyotish knowledge base + readings
   Every reading is composed from the calculated chart using
   classical rules (dignity, house, lordship, nakshatra, combustion).
   Meanings are traditional interpretations, not facts.
   ============================================================ */
const JY = (() => {
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const SIGNS = [
    { el: 'fire', mode: 'movable', g: 'masculine', kw: 'initiative, courage and a direct, pioneering spirit', d: 'Mesha (Aries) is the first sign: the spark that starts things. It is fiery, quick and competitive, prefers action to waiting, and is happiest leading, building something new or fighting for a cause. Its lesson is patience and finishing what it starts.' },
    { el: 'earth', mode: 'fixed', g: 'feminine', kw: 'steadiness, comfort, beauty and loyalty', d: 'Vrishabha (Taurus) is fertile, patient earth. It values security, good food, nature, music and lasting bonds, builds slowly and holds on firmly. It is warm and reliable; its lesson is letting go when change is due.' },
    { el: 'air', mode: 'dual', g: 'masculine', kw: 'curiosity, conversation, wit and versatility', d: 'Mithuna (Gemini) is the sign of the pair and of exchange. It loves ideas, languages, writing, trade, humour and variety, and can do two things at once. Its gift is connection; its lesson is focus and following through.' },
    { el: 'water', mode: 'movable', g: 'feminine', kw: 'care, memory, home and emotional intuition', d: 'Karka (Cancer) is the nurturer. It feels deeply, protects family and home, remembers everything and responds to moods like the tide responds to the Moon. Its gift is empathy; its lesson is not withdrawing into its shell when hurt.' },
    { el: 'fire', mode: 'fixed', g: 'masculine', kw: 'dignity, warmth, creativity and leadership', d: 'Simha (Leo) is royal fire. It is generous, proud, loyal and expressive, wants to shine and to be appreciated, and naturally takes charge. Its gift is a big heart; its lesson is sharing the stage.' },
    { el: 'earth', mode: 'dual', g: 'feminine', kw: 'analysis, skill, service and refinement', d: 'Kanya (Virgo) is careful, intelligent earth. It notices detail, improves systems, heals and serves, and likes things done properly. Its gift is practical intelligence; its lesson is self-acceptance instead of constant self-criticism.' },
    { el: 'air', mode: 'movable', g: 'masculine', kw: 'balance, partnership, fairness and grace', d: 'Tula (Libra) is the scales. It seeks harmony, beauty and justice, thinks in terms of “we”, and is skilled at diplomacy, design and trade. Its gift is fairness; its lesson is making decisions without endless weighing.' },
    { el: 'water', mode: 'fixed', g: 'feminine', kw: 'depth, intensity, secrecy and transformation', d: 'Vrishchika (Scorpio) is deep, still water. It is private, perceptive, loyal and strong-willed, drawn to research, healing and hidden truths. Its gift is resilience; its lesson is trust and forgiveness.' },
    { el: 'fire', mode: 'dual', g: 'masculine', kw: 'wisdom, faith, travel and higher learning', d: 'Dhanu (Sagittarius) is the archer aiming at meaning. It is optimistic, frank and philosophical, loves teachers, travel and big ideas, and wants freedom. Its gift is vision; its lesson is tact and commitment.' },
    { el: 'earth', mode: 'movable', g: 'feminine', kw: 'ambition, discipline, responsibility and endurance', d: 'Makara (Capricorn) is the mountain climber. It is practical, patient and ambitious, respects structure and tradition, and achieves through steady work. Its gift is reliability; its lesson is allowing warmth and rest.' },
    { el: 'air', mode: 'fixed', g: 'masculine', kw: 'independence, ideals, community and innovation', d: 'Kumbha (Aquarius) is the water-bearer serving many. It is original, humanitarian and thoughtful, values friendship and reform, and can seem detached. Its gift is long-range vision; its lesson is emotional closeness.' },
    { el: 'water', mode: 'dual', g: 'feminine', kw: 'compassion, imagination, devotion and surrender', d: 'Meena (Pisces) is the ocean where everything dissolves. It is gentle, intuitive, artistic and spiritual, absorbs other people’s feelings and longs for meaning beyond the material. Its gift is compassion; its lesson is boundaries.' },
  ];
  const P = {
    Sun: { name: 'Surya', en: 'Sun', nat: 'mild malefic', ab: 'Su', what: 'your soul, sense of self, vitality, confidence, father and authority figures, recognition and leadership', karaka: 'atma (self) and father', exalt: 0, exDeg: 10, own: [4], mt: [4, 0, 20], fr: ['Moon', 'Mars', 'Jupiter'], ne: ['Mercury'], enm: ['Venus', 'Saturn'], good: 'recognition, energy and support from people in authority', bad: 'ego clashes, fatigue or friction with officials and seniors' },
    Moon: { name: 'Chandra', en: 'Moon', nat: 'benefic when bright', ab: 'Mo', what: 'your mind and emotions, moods, memory, mother, comfort, the public and how you feel safe', karaka: 'mind and mother', exalt: 1, exDeg: 3, own: [3], mt: [1, 4, 30], fr: ['Sun', 'Mercury'], ne: ['Mars', 'Jupiter', 'Venus', 'Saturn'], enm: [], good: 'emotional ease, good company and a calm mind', bad: 'restlessness, oversensitivity and low energy' },
    Mars: { name: 'Mangal', en: 'Mars', nat: 'malefic', ab: 'Ma', what: 'your energy, courage, drive, competitiveness, siblings, property, technical skill and how you fight', karaka: 'courage, siblings and land', exalt: 9, exDeg: 28, own: [0, 7], mt: [0, 0, 12], fr: ['Sun', 'Moon', 'Jupiter'], ne: ['Venus', 'Saturn'], enm: ['Mercury'], good: 'courage, wins over competition and energy to act', bad: 'anger, haste, accidents or disputes — slow down' },
    Mercury: { name: 'Budh', en: 'Mercury', nat: 'benefic (takes on its company)', ab: 'Me', what: 'your intellect, speech, writing, learning, humour, trade, calculation and adaptability', karaka: 'speech and intelligence', exalt: 5, exDeg: 15, own: [2, 5], mt: [5, 16, 20], fr: ['Sun', 'Venus'], ne: ['Mars', 'Jupiter', 'Saturn'], enm: ['Moon'], good: 'clear thinking, good news, paperwork and deals going well', bad: 'miscommunication, nerves and errors in documents' },
    Jupiter: { name: 'Guru', en: 'Jupiter', nat: 'great benefic', ab: 'Ju', what: 'your wisdom, faith, teachers, children, fortune, ethics, growth and (traditionally) a woman’s husband', karaka: 'wisdom, children and fortune', exalt: 3, exDeg: 5, own: [8, 11], mt: [8, 0, 10], fr: ['Sun', 'Moon', 'Mars'], ne: ['Saturn'], enm: ['Mercury', 'Venus'], good: 'growth, blessings, good advice and opportunities', bad: 'over-optimism, missed chances or advisers who mislead' },
    Venus: { name: 'Shukra', en: 'Venus', nat: 'benefic', ab: 'Ve', what: 'your love life, attraction, pleasure, beauty, art, comforts, vehicles and (traditionally) a man’s wife', karaka: 'love, marriage and comforts', exalt: 11, exDeg: 27, own: [1, 6], mt: [6, 0, 15], fr: ['Mercury', 'Saturn'], ne: ['Mars', 'Jupiter'], enm: ['Sun', 'Moon'], good: 'affection, pleasure, beauty and easier money', bad: 'indulgence, overspending or misunderstandings in love' },
    Saturn: { name: 'Shani', en: 'Saturn', nat: 'great malefic', ab: 'Sa', what: 'your discipline, duty, endurance, work, time, limits, service, old age and karmic lessons', karaka: 'longevity, work and discipline', exalt: 6, exDeg: 20, own: [9, 10], mt: [10, 0, 20], fr: ['Mercury', 'Venus'], ne: ['Jupiter'], enm: ['Sun', 'Moon', 'Mars'], good: 'steady progress that rewards patient effort', bad: 'delays, heavy duties and tiredness — keep a steady pace' },
    Rahu: { name: 'Rahu', en: 'North lunar node', nat: 'shadow malefic', ab: 'Ra', what: 'your worldly hunger, ambition, fascination with the new or foreign, and areas where you over-reach to grow', karaka: 'obsession, foreign things and unconventional paths', exalt: 1, exDeg: 20, own: [], mt: null, fr: [], ne: [], enm: [], good: 'bold, unconventional opportunities and foreign links', bad: 'confusion, temptation and unclear motives — check facts' },
    Ketu: { name: 'Ketu', en: 'South lunar node', nat: 'shadow malefic', ab: 'Ke', what: 'your detachment, past-life skills, intuition, spirituality and areas you let go of or feel oddly empty', karaka: 'liberation, insight and detachment', exalt: 7, exDeg: 20, own: [], mt: null, fr: [], ne: [], enm: [], good: 'insight, research and spiritual clarity', bad: 'sudden breaks, disinterest or feeling lost' },
  };
  const HOUSES = [
    { name: 'Tanu bhava', a: 'self, body, health, appearance and overall direction in life' },
    { name: 'Dhana bhava', a: 'money, savings, family, speech, food and early education' },
    { name: 'Sahaja bhava', a: 'courage, effort, siblings, short trips, communication and hobbies' },
    { name: 'Sukha bhava', a: 'home, mother, inner peace, property, vehicles and roots' },
    { name: 'Putra bhava', a: 'children, creativity, romance, intelligence, study and past merit' },
    { name: 'Ari bhava', a: 'health routines, work, service, debts, rivals and daily obstacles' },
    { name: 'Kalatra bhava', a: 'marriage, partnership, contracts, the public and business dealings' },
    { name: 'Ayur bhava', a: 'transformation, longevity, shared resources, secrets, research and sudden change' },
    { name: 'Dharma bhava', a: 'fortune, faith, teachers, father, higher learning and long journeys' },
    { name: 'Karma bhava', a: 'career, status, actions in the world, authority and reputation' },
    { name: 'Labha bhava', a: 'gains, income, friends, networks, elder siblings and fulfilled wishes' },
    { name: 'Vyaya bhava', a: 'expenses, sleep, retreat, foreign lands, spirituality and letting go' },
  ];
  // [ruler, deity, symbol, nature/quality text]
  const NAK = [
    ['Ketu', 'the Ashwini Kumaras, divine healers', 'a horse’s head', 'quick, healing, youthful and pioneering — fast starts and a gift for remedies'],
    ['Venus', 'Yama, lord of dharma and death', 'a womb (yoni)', 'intense, creative and responsible — carrying burdens, birth and strong appetites'],
    ['Sun', 'Agni, the fire god', 'a razor or flame', 'sharp, purifying and courageous — cutting through falsehood, sometimes cutting words'],
    ['Moon', 'Brahma (Prajapati), the creator', 'an ox cart or chariot', 'fertile, attractive and artistic — growth, comfort and a love of beauty'],
    ['Mars', 'Soma, the moon god', 'a deer’s head', 'searching, gentle and curious — always looking for the next thing, restless but kind'],
    ['Rahu', 'Rudra, the storm god', 'a teardrop or diamond', 'stormy, intellectual and transforming — clarity that comes after turmoil'],
    ['Jupiter', 'Aditi, mother of the gods', 'a quiver of arrows', 'renewing, generous and philosophical — the ability to return and start again'],
    ['Saturn', 'Brihaspati, teacher of the gods', 'a cow’s udder or flower', 'nourishing, protective and devoted — considered one of the most auspicious stars'],
    ['Mercury', 'the Nagas, serpent deities', 'a coiled serpent', 'perceptive, clever and intense — hypnotic insight, sometimes guarded or possessive'],
    ['Ketu', 'the Pitris, the ancestors', 'a royal throne', 'regal, traditional and proud — honour, lineage and leadership'],
    ['Venus', 'Bhaga, god of delight', 'the front legs of a bed', 'pleasure-loving, warm and creative — rest, romance and enjoyment'],
    ['Sun', 'Aryaman, god of contracts and friendship', 'the back legs of a bed', 'generous, dependable and kind — patronage, partnership and keeping promises'],
    ['Moon', 'Savitar, the creative sun', 'an open hand', 'skilful, witty and resourceful — clever hands, craft and humour'],
    ['Mars', 'Vishvakarma, the celestial architect', 'a bright jewel', 'artistic, magnetic and stylish — design, building and visual flair'],
    ['Rahu', 'Vayu, the wind god', 'a young shoot blown by wind', 'independent, flexible and diplomatic — trade, travel and self-direction'],
    ['Jupiter', 'Indra and Agni', 'a triumphal arch', 'goal-driven, ambitious and determined — single-minded pursuit of a target'],
    ['Saturn', 'Mitra, god of friendship', 'a lotus', 'devoted, loyal and cooperative — friendship that blooms in hard places'],
    ['Mercury', 'Indra, king of the gods', 'an earring or umbrella', 'protective, senior and capable — responsibility, sometimes jealousy or pride'],
    ['Ketu', 'Nirriti, goddess of dissolution', 'tied roots', 'searching, radical and deep — getting to the root, uprooting what is false'],
    ['Venus', 'Apas, the waters', 'a fan or winnowing basket', 'invincible, persuasive and purifying — confidence that refreshes others'],
    ['Sun', 'the Vishvadevas, universal gods', 'an elephant’s tusk', 'principled, enduring and victorious — lasting achievements won fairly'],
    ['Moon', 'Vishnu, the preserver', 'an ear or three footprints', 'listening, learning and connecting — knowledge passed on through hearing'],
    ['Mars', 'the eight Vasus, gods of abundance', 'a drum', 'rhythmic, wealthy and sociable — music, groups and prosperity'],
    ['Rahu', 'Varuna, lord of cosmic waters', 'an empty circle', 'healing, secretive and independent — the hundred physicians, research and solitude'],
    ['Jupiter', 'Aja Ekapada, the one-footed goat', 'front of a funeral cot or a sword', 'fiery, idealistic and intense — passion that transforms'],
    ['Saturn', 'Ahir Budhnya, serpent of the deep', 'back of a funeral cot or twins', 'wise, calm and disciplined — depth, patience and self-control'],
    ['Mercury', 'Pushan, the nourisher and guide', 'a fish or a drum', 'gentle, caring and safe-guiding — journeys completed, kindness to all'],
  ];
  const GANA = ['Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva'];
  const YONI_OF = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
  const YONI_NAMES = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
  const YONI = [
    [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1], [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0], [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
    [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2], [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1], [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
    [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2], [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1], [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
    [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1], [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1], [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
    [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2], [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
  ];
  const NADI = (n) => [0, 1, 2, 2, 1, 0][n % 6];
  const NADI_NAMES = ['Adi (Vata)', 'Madhya (Pitta)', 'Antya (Kapha)'];
  const VARNA = (s) => [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4][s]; // 4 Brahmin … 1 Shudra
  const VARNA_NAMES = { 4: 'Brahmin', 3: 'Kshatriya', 2: 'Vaishya', 1: 'Shudra' };
  const VASHYA_NAMES = ['Chatushpada (four-footed)', 'Manava (human)', 'Jalachara (water)', 'Vanachara (wild)', 'Keeta (insect)'];
  function vashyaOf(lon) {
    const s = Math.floor(lon / 30), d = lon - s * 30;
    if (s === 0 || s === 1) return 0;
    if ([2, 5, 6, 10].includes(s)) return 1;
    if (s === 3 || s === 11) return 2;
    if (s === 4) return 3;
    if (s === 7) return 4;
    if (s === 8) return d < 15 ? 1 : 0;
    return d < 15 ? 0 : 2; // Capricorn
  }
  const VASHYA = [[2, 1, 1, 0.5, 1], [1, 2, 0.5, 0, 1], [1, 0.5, 2, 1, 1], [0, 0, 0, 2, 0], [1, 1, 1, 0, 2]]; // [groom][bride]
  const GANA_IX = { Deva: 0, Manushya: 1, Rakshasa: 2 };
  const GANA_PTS = [[6, 6, 1], [5, 6, 0], [0, 0, 6]]; // [bride][groom]  (bride Deva/groom Rakshasa = 0; bride Rakshasa/groom Deva = 1)
  const GANA_PTS_GB = (g, b) => [[6, 5, 1], [6, 6, 0], [0, 0, 6]][g][b];

  const rel = (a, b) => (a === b ? 'same' : P[a].fr.includes(b) ? 'friend' : P[a].enm.includes(b) ? 'enemy' : 'neutral');
  const signName = (i) => `${Astro.SIGNS[i]} (${Astro.SIGNS_EN[i]})`;
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const label = (k) => (k === 'Rahu' || k === 'Ketu' ? P[k].name : `${P[k].name} (${P[k].en})`);
  const NAK_RULER = (n) => NAK[n][0];

  function dignity(key, lon) {
    const p = P[key], s = Math.floor(lon / 30), d = lon - s * 30;
    if (p.exalt === s) return { k: 'exalted', t: `exalted — ${key === 'Rahu' || key === 'Ketu' ? 'by the common view, a strong placement for the node' : 'its strongest sign, where it gives its best results'}` };
    if ((p.exalt + 6) % 12 === s) return { k: 'debilitated', t: 'debilitated — its weakest sign, where its gifts need extra effort and maturity (traditional cancellations, Neecha Bhanga, can lift this)' };
    if (p.mt && p.mt[0] === s && d >= p.mt[1] && d < p.mt[2]) return { k: 'moolatrikona', t: 'in its moolatrikona — its “office”, very strong and purposeful' };
    if (p.own.includes(s)) return { k: 'own', t: 'in its own sign — comfortable, confident and dependable' };
    if (key === 'Rahu' || key === 'Ketu') return { k: 'node', t: `a shadow planet that acts through its sign lord, ${label(SIGN_LORD[s])}` };
    const r = rel(key, SIGN_LORD[s]);
    return r === 'friend' ? { k: 'friend', t: `in a friend’s sign (ruled by ${label(SIGN_LORD[s])}) — supported and at ease` }
      : r === 'enemy' ? { k: 'enemy', t: `in an enemy’s sign (ruled by ${label(SIGN_LORD[s])}) — it works under some strain` }
        : { k: 'neutral', t: `in a neutral sign (ruled by ${label(SIGN_LORD[s])}) — neither helped nor hindered` };
  }
  const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  function combust(p, sunLon) {
    if (!COMBUST[p.key]) return false;
    let lim = COMBUST[p.key]; if (p.retro && p.key === 'Mercury') lim = 12; if (p.retro && p.key === 'Venus') lim = 8;
    return Astro.angDiff(p.lon, sunLon) < lim;
  }
  const ruledHouses = (key, lagnaSign) => SIGN_LORD.map((l, s) => (l === key ? ((s - lagnaSign + 12) % 12) + 1 : null)).filter(Boolean);
  const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUSTHANA = [6, 8, 12], UPACHAYA = [3, 6, 10, 11];
  const isBenefic = (key, k) => ['Jupiter', 'Venus', 'Mercury'].includes(key) || (key === 'Moon' && waxing(k));
  const waxing = (k) => { const m = k.planets.find((x) => x.key === 'Moon'), s = k.planets.find((x) => x.key === 'Sun'); return Astro.norm(m.lon - s.lon) < 180; };

  function houseTone(key, h, k) {
    const ben = isBenefic(key, k);
    if (KENDRA.includes(h) && TRIKONA.includes(h)) return ben ? 'A benefic in the 1st house is one of the best placements: it protects health, character and reputation.' : 'A natural malefic in the 1st house gives drive and toughness, but can make you blunt or prone to heat and haste — channel it into purpose.';
    if (KENDRA.includes(h)) return ben ? 'Benefics in angular houses (kendras) are traditionally strong and protective, steadying this part of life.' : 'A malefic in an angular house (kendra) adds force and ambition here, though it can bring friction that needs handling.';
    if (TRIKONA.includes(h)) return ben ? 'A benefic in a trine (trikona) is a sign of good fortune and merit in this area.' : 'A malefic in a trine (trikona) adds intensity to your beliefs or creativity; it can test faith before rewarding it.';
    if (UPACHAYA.includes(h) && !ben) return 'Malefics do well in growth houses (upachaya): obstacles here tend to be overcome, and results improve steadily with age.';
    if (UPACHAYA.includes(h)) return 'This is a growth house (upachaya): what it promises improves with time and effort.';
    if (DUSTHANA.includes(h)) return ben ? 'A benefic in a challenging house (dusthana) softens difficulties there, though its own gifts are harder to enjoy openly.' : 'A malefic in a challenging house (dusthana) can bring struggle, but traditionally also the strength to defeat what it represents.';
    if (h === 2) return 'The 2nd house is a house of resources; planets here shape your speech and how you build security.';
    return '';
  }

  function grahaReading(k, p) {
    const pl = P[p.key], s = SIGNS[p.sign], sun = k.planets.find((x) => x.key === 'Sun');
    const dg = dignity(p.key, p.lon);
    const nk = NAK[p.nak];
    const navSign = (p.nak * 4 + p.pada - 1) % 12;
    const out = [];
    out.push(`<p><b>What ${pl.name} represents.</b> ${pl.name} (${pl.en}) is the significator (karaka) of ${pl.karaka}. In any chart it describes ${pl.what}. It is traditionally a ${pl.nat}.</p>`);
    out.push(`<p><b>In ${signName(p.sign)}.</b> ${s.d} Here ${pl.name}’s themes are expressed through ${s.kw}. ${pl.name} is ${dg.t}.${p.retro && p.key !== 'Rahu' && p.key !== 'Ketu' ? ' It is also <b>retrograde</b>: its energy turns inward and reflective, often revisiting the past before it delivers — results can come later but run deeper.' : ''}${p.key !== 'Sun' && combust(p, sun.lon) ? ` It is <b>combust</b> (very close to the Sun), so its independent voice is partly absorbed by the Sun’s will — you may express ${pl.en === 'Moon' ? 'feelings' : 'these qualities'} through your ego or career rather than on their own terms.` : ''}</p>`);
    if (k.lagna && p.house) {
      const h = HOUSES[p.house - 1];
      const rules = p.key in P && !['Rahu', 'Ketu'].includes(p.key) ? ruledHouses(p.key, k.lagna.sign) : [];
      const yk = rules.some((x) => [4, 7, 10].includes(x)) && rules.some((x) => [5, 9].includes(x));
      out.push(`<p><b>In your ${ord(p.house)} house (${h.name}).</b> This house covers ${h.a}, so ${pl.name} brings its themes into these areas. ${houseTone(p.key, p.house, k)}${rules.length ? ` As lord of your ${rules.map(ord).join(' and ')} house${rules.length > 1 ? 's' : ''} (${rules.map((r) => HOUSES[r - 1].a.split(',')[0]).join('; ')}), it carries those matters into the ${ord(p.house)} house.` : ''}${yk ? ` Ruling both an angle and a trine makes ${pl.name} a <b>yogakaraka</b> for you — a planet that traditionally brings success and status.` : ''}</p>`);
    } else if (!k.lagna) {
      out.push(`<p><b>House.</b> The house placement needs an exact birth time, so it isn’t shown.</p>`);
    }
    out.push(`<p><b>Nakshatra: ${Astro.NAKS[p.nak]}, pada ${p.pada}.</b> ${Astro.NAKS[p.nak]} is ruled by ${label(nk[0])}, its deity is ${nk[1]} and its symbol is ${nk[2]}. Its nature is ${nk[3]}. Pada ${p.pada} falls in the navamsa sign ${signName(navSign)}, adding a ${SIGNS[navSign].el} quality and a focus on ${['dharma (purpose)', 'artha (resources)', 'kama (desire and relationships)', 'moksha (inner freedom)'][['fire', 'earth', 'air', 'water'].indexOf(SIGNS[navSign].el)]}.</p>`);
    if (p.key === 'Rahu' || p.key === 'Ketu') out.push(`<p><b>The nodes.</b> Rahu and Ketu are always opposite each other. ${p.key === 'Rahu' ? 'Rahu shows where you are hungry to grow in this life — exciting, but prone to excess.' : 'Ketu shows where you already know a lot from the past and feel detached — a source of intuition, but also of disinterest.'} Their sign lord here is ${label(SIGN_LORD[p.sign])}, whose condition shapes the result.</p>`);
    return out.join('');
  }
  function lagnaReading(k) {
    if (!k.lagna) return '<p>Lagna needs an exact birth time.</p>';
    const s = SIGNS[k.lagna.sign], lord = SIGN_LORD[k.lagna.sign];
    const lp = k.planets.find((x) => x.key === lord);
    const nk = NAK[k.lagna.nak];
    return `<p><b>Your rising sign is ${signName(k.lagna.sign)}.</b> The Lagna is the most personal point of the chart: it describes your body, temperament, instincts and the lens through which you meet life. ${s.d}</p>
      <p>As a ${s.mode} ${s.el} sign, it gives a ${s.mode === 'movable' ? 'quick, initiating' : s.mode === 'fixed' ? 'steady, determined' : 'flexible, adaptable'} approach and a ${s.el === 'fire' ? 'warm, energetic' : s.el === 'earth' ? 'grounded, practical' : s.el === 'air' ? 'social, thinking' : 'feeling, intuitive'} presence.</p>
      <p><b>Your Lagna lord is ${label(lord)}</b>, placed in ${signName(lp.sign)} in your ${ord(lp.house)} house (${HOUSES[lp.house - 1].a.split(',').slice(0, 2).join(',')}). Where the Lagna lord goes, your life energy goes: much of your attention and identity flows into these matters. It is ${dignity(lord, lp.lon).t}.</p>
      <p><b>Lagna nakshatra: ${Astro.NAKS[k.lagna.nak]}</b> (ruled by ${label(nk[0])}, deity ${nk[1]}) adds a ${nk[3]} quality to how you come across.</p>`;
  }
  function rashiReading(k) {
    const m = k.planets.find((x) => x.key === 'Moon'), s = SIGNS[m.sign];
    const bright = waxing(k);
    return `<p><b>Your Moon sign (Rashi) is ${signName(m.sign)}.</b> In Vedic astrology the Moon sign is as important as the Sun sign in Western astrology: it describes your emotional nature, what makes you feel safe, how your mind works under stress, and it is the reference point for daily forecasts and compatibility.</p>
      <p>${s.d} Emotionally you respond through ${s.kw}.</p>
      <p>The Moon is ${dignity('Moon', m.lon).t}. It was <b>${bright ? 'waxing' : 'waning'}</b> at your birth — ${bright ? 'a bright Moon, traditionally a benefic that supports emotional resilience and popularity' : 'a waning Moon, traditionally more introspective, sensitive and spiritual'}.${k.lagna ? ` It sits in your ${ord(m.house)} house, so feelings are tied to ${HOUSES[m.house - 1].a}.` : ''}</p>
      <p>Your Rashi lord is ${label(SIGN_LORD[m.sign])}; its condition in your chart colours your mental peace.</p>`;
  }
  function nakReading(k) {
    const m = k.planets.find((x) => x.key === 'Moon'), nk = NAK[m.nak];
    return `<p><b>Your birth star (Janma Nakshatra) is ${Astro.NAKS[m.nak]}</b> — the lunar mansion the Moon occupied when you were born. The 27 nakshatras are older and finer than the 12 signs; your birth star is used for naming, Dasha timing, compatibility and choosing good days.</p>
      <p>${Astro.NAKS[m.nak]} is ruled by <b>${label(nk[0])}</b>, so your life began in ${label(nk[0])}’s Mahadasha. Its presiding deity is ${nk[1]} and its symbol is ${nk[2]}. Its nature is ${nk[3]}.</p>
      <p>Traditional classifications: Gana <b>${GANA[m.nak]}</b> (${GANA[m.nak] === 'Deva' ? 'gentle, idealistic, refined' : GANA[m.nak] === 'Manushya' ? 'balanced, practical, worldly' : 'intense, independent, forceful — not “bad”, simply strong-willed'}), Yoni <b>${YONI_NAMES[YONI_OF[m.nak]]}</b> (instinctive and physical nature), Nadi <b>${NADI_NAMES[NADI(m.nak)]}</b> (constitution). These are used in compatibility matching.</p>`;
  }
  function padaReading(k) {
    const m = k.planets.find((x) => x.key === 'Moon'), nav = (m.nak * 4 + m.pada - 1) % 12;
    return `<p><b>Pada ${m.pada}</b> is the quarter of ${Astro.NAKS[m.nak]} where your Moon falls (each nakshatra spans 13°20′, split into four padas of 3°20′).</p>
      <p>Each pada corresponds to a navamsa sign — yours is <b>${signName(nav)}</b>, ruled by ${label(SIGN_LORD[nav])}. This refines the star’s meaning towards ${SIGNS[nav].kw}, with the life aim of ${['dharma — living your purpose', 'artha — building resources and security', 'kama — relationships and fulfilled desires', 'moksha — inner freedom and spiritual peace'][['fire', 'earth', 'air', 'water'].indexOf(SIGNS[nav].el)]}. Traditionally the pada also gives the first syllable for a name.</p>`;
  }

  /* ---------- compatibility (Ashtakoota / Guna Milan) ---------- */
  function guna(groom, bride) {
    const gm = groom.planets.find((x) => x.key === 'Moon'), bm = bride.planets.find((x) => x.key === 'Moon');
    const gS = gm.sign, bS = bm.sign, gN = gm.nak, bN = bm.nak;
    const K = [];
    const vG = VARNA(gS), vB = VARNA(bS);
    K.push({ key: 'Varna', max: 1, pts: vG >= vB ? 1 : 0, what: 'spiritual and working compatibility — whether your natures support each other’s growth', detail: `Groom’s Moon sign gives ${VARNA_NAMES[vG]} varna, bride’s gives ${VARNA_NAMES[vB]}. The point is given when the groom’s varna is equal to or higher than the bride’s.` });
    const wG = vashyaOf(gm.lon), wB = vashyaOf(bm.lon);
    K.push({ key: 'Vashya', max: 2, pts: VASHYA[wG][wB], what: 'mutual attraction and influence — who naturally draws and leads whom', detail: `Groom: ${VASHYA_NAMES[wG]}; bride: ${VASHYA_NAMES[wB]}.` });
    const t1 = ((gN - bN + 27) % 27 + 1) % 9 || 9, t2 = ((bN - gN + 27) % 27 + 1) % 9 || 9;
    const bad = [3, 5, 7], TN = ['', 'Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Sadhana', 'Naidhana', 'Mitra', 'Param Mitra'];
    K.push({ key: 'Tara', max: 3, pts: (bad.includes(t1) ? 0 : 1.5) + (bad.includes(t2) ? 0 : 1.5), what: 'destiny and well-being — whether your birth stars support each other’s health and luck', detail: `Counting from the bride’s star to the groom’s gives ${TN[t1]} tara (${t1}); counting back gives ${TN[t2]} (${t2}). Vipat (3), Pratyak (5) and Naidhana (7) are the inauspicious taras.` });
    const yG = YONI_OF[gN], yB = YONI_OF[bN];
    K.push({ key: 'Yoni', max: 4, pts: YONI[yG][yB], what: 'physical and instinctive compatibility, intimacy and comfort with each other', detail: `Groom’s yoni: ${YONI_NAMES[yG]}; bride’s: ${YONI_NAMES[yB]}. ${yG === yB ? 'The same animal — full harmony.' : YONI[yG][yB] === 0 ? 'These animals are traditional enemies.' : YONI[yG][yB] >= 3 ? 'Friendly animals.' : YONI[yG][yB] === 2 ? 'Neutral animals.' : 'Unfriendly animals.'}` });
    const lG = SIGN_LORD[gS], lB = SIGN_LORD[bS];
    const r1 = rel(lG, lB), r2 = rel(lB, lG);
    const pairPts = (a, b) => { if (a === 'same') return 5; const s = [a, b].sort().join('+'); return { 'friend+friend': 5, 'friend+neutral': 4, 'neutral+neutral': 3, 'enemy+friend': 1, 'enemy+neutral': 0.5, 'enemy+enemy': 0 }[s]; };
    K.push({ key: 'Graha Maitri', max: 5, pts: pairPts(r1, r2), what: 'mental friendship — how naturally your minds and outlooks agree', detail: `Moon-sign lords: ${label(lG)} and ${label(lB)}. ${lG === lB ? 'The same lord — complete mental harmony.' : `${label(lG)} sees ${label(lB)} as ${r1 === 'friend' ? 'a friend' : r1 === 'enemy' ? 'an enemy' : 'neutral'}; ${label(lB)} sees ${label(lG)} as ${r2 === 'friend' ? 'a friend' : r2 === 'enemy' ? 'an enemy' : 'neutral'}.`}` });
    const gG = GANA[gN], gB = GANA[bN];
    K.push({ key: 'Gana', max: 6, pts: GANA_PTS_GB(GANA_IX[gG], GANA_IX[gB]), what: 'temperament — gentle, human or fiery natures, and how they blend', detail: `Groom: ${gG} gana; bride: ${gB} gana.` });
    const d = ((bS - gS + 12) % 12) + 1, d2 = ((gS - bS + 12) % 12) + 1;
    const bk = [[2, 12], [12, 2], [5, 9], [9, 5], [6, 8], [8, 6]].some(([a, b]) => a === d && b === d2);
    K.push({ key: 'Bhakoot', max: 7, pts: bk ? 0 : 7, what: 'love, family welfare and prosperity — the relationship between your Moon signs', detail: `The Moon signs are ${d}/${d2} from each other.${bk ? ` The ${Math.min(d, d2)}/${Math.max(d, d2)} relationship is a traditional Bhakoot dosha${(lG === lB || (r1 === 'friend' && r2 === 'friend')) ? ', but it is commonly considered cancelled because your Moon-sign lords are the same or mutual friends' : ''}.` : ' This is a favourable distance.'}`, cancelled: bk && (lG === lB || (r1 === 'friend' && r2 === 'friend')) });
    const nG = NADI(gN), nB = NADI(bN);
    K.push({ key: 'Nadi', max: 8, pts: nG === nB ? 0 : 8, what: 'constitution, health and family line — traditionally the most important koota', detail: `Groom: ${NADI_NAMES[nG]}; bride: ${NADI_NAMES[nB]}.${nG === nB ? (gN === bN ? ' Same nadi and same star — Nadi dosha; some traditions cancel it when the padas differ.' : gS === bS ? ' Same nadi — Nadi dosha, traditionally softened because you share the same Moon sign with different stars.' : ' Same nadi — the traditional Nadi dosha.') : ' Different nadis — full points.'}`, cancelled: nG === nB && (gS === bS || (gN === bN && gm.pada !== bm.pada)) });
    const total = K.reduce((s, x) => s + x.pts, 0);
    return { K, total, band: total >= 33 ? 'Excellent' : total >= 25 ? 'Very good' : total >= 18 ? 'Average — acceptable' : 'Below the traditional threshold of 18' };
  }
  function manglik(k) {
    const mars = k.planets.find((x) => x.key === 'Mars'), moon = k.planets.find((x) => x.key === 'Moon');
    const H = [1, 2, 4, 7, 8, 12];
    const fromLagna = k.lagna ? mars.house : null;
    const fromMoon = ((mars.sign - moon.sign + 12) % 12) + 1;
    const ml = fromLagna != null && H.includes(fromLagna), mm = H.includes(fromMoon);
    const mitig = [0, 7, 9].includes(mars.sign) ? 'Mars is in its own or exalted sign, which traditionally reduces the dosha.' : '';
    return { fromLagna, fromMoon, byLagna: ml, byMoon: mm, any: ml || mm, mitig };
  }
  function elementHarmony(a, b) {
    const ea = SIGNS[a].el, eb = SIGNS[b].el;
    if (ea === eb) return { t: 'same element — you instinctively understand each other', s: 2 };
    const pair = [ea, eb].sort().join('+');
    if (pair === 'air+fire' || pair === 'earth+water') return { t: `${ea} and ${eb} feed each other — a supportive mix`, s: 1 };
    if (pair === 'air+earth' || pair === 'fire+water') return { t: `${ea} and ${eb} work differently — it takes conscious effort to meet halfway`, s: -1 };
    return { t: `${ea} and ${eb} are neutral to each other`, s: 0 };
  }

  /* ---------- transits (gochar) ---------- */
  const GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
  const TARAS = [
    ['Janma', 'mixed', 'your birth star returns — a sensitive day; keep things simple and look after your health'],
    ['Sampat', 'good', 'wealth and gains — good for money matters and starting useful things'],
    ['Vipat', 'bad', 'obstacles and losses — avoid risky decisions and new beginnings'],
    ['Kshema', 'good', 'well-being and comfort — a smooth, supportive day'],
    ['Pratyak', 'bad', 'opposition — others may resist your plans; don’t force things'],
    ['Sadhana', 'good', 'achievement — efforts succeed; good for important tasks'],
    ['Naidhana', 'bad', 'the hardest tara — rest, be careful, postpone big moves'],
    ['Mitra', 'good', 'friendship — good company, help from friends'],
    ['Param Mitra', 'good', 'the best friend — very supportive for most activities'],
  ];
  const tara = (birthNak, dayNak) => TARAS[(((dayNak - birthNak + 27) % 27)) % 9];
  const fromMoon = (sign, natalMoonSign) => ((sign - natalMoonSign + 12) % 12) + 1;
  function transitLine(key, h) {
    const good = GOOD[key].includes(h);
    return { good, t: `${label(key)} moves through your ${ord(h)} from the Moon (${HOUSES[h - 1].a.split(',').slice(0, 3).join(',')}) — traditionally ${good ? 'favourable' : 'testing'}: ${good ? P[key].good : P[key].bad}.` };
  }
  function dashaReading(k, lord, sub) {
    const p = k.planets.find((x) => x.key === lord);
    const where = k.lagna && p.house ? `your ${ord(p.house)} house of ${HOUSES[p.house - 1].a.split(',').slice(0, 3).join(',')}` : `${signName(p.sign)}`;
    const rules = k.lagna && !['Rahu', 'Ketu'].includes(lord) ? ruledHouses(lord, k.lagna.sign) : [];
    let t = `${label(lord)} brings forward ${P[lord].what.split(',').slice(0, 4).join(',')}. In your chart it sits in ${where}, ${dignity(lord, p.lon).t.split(' — ')[0]}`;
    if (rules.length) t += `, and rules your ${rules.map(ord).join(' and ')} house${rules.length > 1 ? 's' : ''}`;
    t += '.';
    if (sub && sub !== lord) {
      const r = rel(lord, sub);
      t += ` The ${label(sub)} sub-period adds ${P[sub].what.split(',').slice(0, 3).join(',')}; ${r === 'friend' ? 'its lord is friendly to the main period lord, so the two tend to cooperate' : r === 'enemy' ? 'its lord is unfriendly to the main period lord, which can bring mixed or uneven results' : 'the two lords are neutral to each other'}.`;
    }
    return t;
  }

  /* ---------- one-line summaries ---------- */
  const TRAIT = ['bold, energetic and quick to act', 'calm, loyal and fond of comfort and beauty', 'talkative, curious and good at communicating', 'caring, sensitive and family-minded', 'confident, warm-hearted and proud', 'careful, practical and detail-minded', 'charming, fair-minded and made for partnership', 'intense, private and deeply loyal', 'optimistic, honest and freedom-loving', 'ambitious, disciplined and patient', 'independent, original and friendly to all', 'gentle, imaginative and compassionate'];
  const AREA = { Sun: 'Your core self', Moon: 'Your feelings', Mars: 'Your drive and temper', Mercury: 'Your mind and speech', Jupiter: 'Your wisdom and luck', Venus: 'Your way of loving', Saturn: 'Your work and duty', Rahu: 'Your ambitions', Ketu: 'Your hidden gifts' };
  const STR = { exalted: 'very strong', moolatrikona: 'very strong', own: 'strong', friend: 'comfortable', neutral: 'average', enemy: 'under strain', debilitated: 'weak — grows with effort', node: 'works through its sign lord' };
  const houseShort = (h) => HOUSES[h - 1].a.split(',').slice(0, 2).join(' and').replace(' and and', ' and');
  function glance(k, p) {
    const dg = dignity(p.key, p.lon).k;
    return `${AREA[p.key]}: ${TRAIT[p.sign]}.${k.lagna && p.house ? ` Shows up in ${houseShort(p.house)} (house ${p.house}).` : ''} Strength: ${STR[dg]}${p.retro && !['Rahu', 'Ketu'].includes(p.key) ? ', retrograde (slower, inward)' : ''}.`;
  }
  const VARNA_MEAN = { 4: 'drawn to learning, ideas and ideals', 3: 'protective, brave and a natural leader', 2: 'practical, good with money and building things', 1: 'hands-on, helpful and steady in service' };
  const VASHYA_MEAN = ['steady and grounded', 'sociable and reasonable — at home among people', 'emotional and adaptable, like water', 'independent and proud, like a lion', 'intense and private, with strong instincts'];
  const GANA_MEAN = { Deva: 'gentle, kind and idealistic', Manushya: 'balanced, practical and worldly', Rakshasa: 'strong-willed, independent and intense' };
  const YONI_MEAN = ['energetic and free-spirited', 'strong, dignified and patient', 'gentle, sociable and peaceful', 'intense, intuitive and secretive', 'loyal, protective and hardworking', 'independent, graceful and clever', 'resourceful, quick and sharp', 'nurturing, calm and generous', 'hardworking, steady and strong', 'bold, passionate and commanding', 'sensitive, gentle and quick', 'playful, clever and curious', 'fearless and determined', 'proud, brave and a natural leader'];
  const NADI_MEAN = ['airy (Vata) constitution — light, active, a little restless', 'fiery (Pitta) constitution — warm, driven and sharp', 'watery (Kapha) constitution — calm, steady and enduring'];
  const AIM = ['dharma — living your purpose', 'artha — building security', 'kama — love and fulfilled wishes', 'moksha — inner peace'];
  function profile(k) {
    const m = k.moon, sun = k.planets.find((x) => x.key === 'Sun'), nav = (m.nak * 4 + m.pada - 1) % 12;
    const mlon = k.planets.find((x) => x.key === 'Moon').lon;
    const rows = [];
    if (k.lagna) rows.push(['Lagna (rising sign)', signName(k.lagna.sign), `Your personality: ${TRAIT[k.lagna.sign]} — how others first see you.`]);
    rows.push(['Rashi (Moon sign)', signName(m.sign), `Your feelings: ${TRAIT[m.sign]}.`]);
    rows.push(['Sun sign', signName(sun.sign), `Your core self: ${TRAIT[sun.sign]}.`]);
    rows.push(['Nakshatra (birth star)', Astro.NAKS[m.nak], `${NAK[m.nak][3].split(' — ')[0].replace(/^./, (c) => c.toUpperCase())}. Ruled by ${label(NAK[m.nak][0])}.`]);
    rows.push(['Pada', `${m.pada} · navamsa ${SIGNS_SHORT[nav]}`, `Life aim: ${AIM[['fire', 'earth', 'air', 'water'].indexOf(SIGNS[nav].el)]}.`]);
    const v = VARNA(m.sign);
    rows.push(['Varna', VARNA_NAMES[v], `From your Moon in ${SIGNS_SHORT[m.sign]}: ${VARNA_MEAN[v]}.`]);
    const w = vashyaOf(mlon);
    rows.push(['Vashya', VASHYA_NAMES[w].split(' (')[0], `You are ${VASHYA_MEAN[w]}; shows who you naturally attract and influence.`]);
    rows.push(['Gana', GANA[m.nak], `Temperament: ${GANA_MEAN[GANA[m.nak]]}.`]);
    rows.push(['Yoni', YONI_NAMES[YONI_OF[m.nak]], `Instinct and intimacy: ${YONI_MEAN[YONI_OF[m.nak]]}.`]);
    rows.push(['Nadi', NADI_NAMES[NADI(m.nak)].split(' ')[0], `${NADI_MEAN[NADI(m.nak)].replace(/^./, (c) => c.toUpperCase())}.`]);
    const mg = manglik(k);
    rows.push(['Manglik', mg.any ? 'Yes' : 'No', mg.any ? 'Mars needs patience in close relationships; balanced by a Manglik partner.' : 'No Kuja dosha.']);
    return rows;
  }
  const SIGNS_SHORT = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const lagnaGlance = (k) => (k.lagna ? `Your personality: ${TRAIT[k.lagna.sign]}. Ruled by ${label(SIGN_LORD[k.lagna.sign])}.` : 'Needs an exact birth time.');
  const rashiGlance = (k) => `Your feelings: ${TRAIT[k.moon.sign]}. Moon is ${waxing(k) ? 'waxing (resilient)' : 'waning (inward, sensitive)'}.`;
  const nakGlance = (k) => `${NAK[k.moon.nak][3].split(' — ')[0].replace(/^./, (c) => c.toUpperCase())}. Gana ${GANA[k.moon.nak]}, Yoni ${YONI_NAMES[YONI_OF[k.moon.nak]]}.`;
  const padaGlance = (k) => { const nav = (k.moon.nak * 4 + k.moon.pada - 1) % 12; return `Navamsa ${SIGNS_SHORT[nav]} — life aim: ${AIM[['fire', 'earth', 'air', 'water'].indexOf(SIGNS[nav].el)]}.`; };
  const houseGlance = (k, n) => { const s = (k.lagna.sign + n - 1) % 12; return `${HOUSES[n - 1].a.split(',').slice(0, 3).join(',')} — approached in ${/^[aeiou]/.test(TRAIT[s]) ? 'an' : 'a'} ${TRAIT[s].split(',')[0]} way.`; };
  return { glance, profile, lagnaGlance, rashiGlance, nakGlance, padaGlance, houseGlance, TRAIT, P, SIGNS, HOUSES, NAK, SIGN_LORD, GANA, YONI_NAMES, YONI_OF, NADI, NADI_NAMES, dignity, combust, ruledHouses, grahaReading, lagnaReading, rashiReading, nakReading, padaReading, guna, manglik, elementHarmony, GOOD, TARAS, tara, fromMoon, transitLine, dashaReading, label, ord, signName, rel, waxing };
})();
if (typeof module !== 'undefined') module.exports = JY;
