/* ============================================================
   Western astrology interpretations.
   Every reading is composed from the calculated chart:
   planet × sign × house × dignity × aspects. Each item has a
   one-line summary (glance) and a fuller explanation (detail).
   Traditional interpretation for reflection — not science.
   ============================================================ */
const WK = (() => {
  const S = W.SIGNS;
  const SIGN = [
    { el: 'fire', mode: 'cardinal', kw: 'courage, initiative and directness', d: 'Aries is the first sign of the zodiac — the spark of spring. It is brave, competitive and impatient, loves beginnings and acts before it thinks. Its gift is courage; its lesson is patience.' },
    { el: 'earth', mode: 'fixed', kw: 'stability, comfort and loyalty', d: 'Taurus is fertile, patient earth. It values security, good food, music, nature and touch, builds slowly and holds on firmly. Its gift is reliability; its lesson is accepting change.' },
    { el: 'air', mode: 'mutable', kw: 'curiosity, conversation and versatility', d: 'Gemini is the sign of the twins and of exchange. It loves ideas, words, news, humour and variety, and can do two things at once. Its gift is connection; its lesson is focus.' },
    { el: 'water', mode: 'cardinal', kw: 'care, memory and emotional security', d: 'Cancer is the nurturer. It feels deeply, protects home and family, remembers everything and moves with moods like the tides. Its gift is empathy; its lesson is not hiding in its shell.' },
    { el: 'fire', mode: 'fixed', kw: 'warmth, pride and creative self-expression', d: 'Leo is the sign of the Sun — generous, proud, playful and loyal. It wants to create, to shine and to be appreciated, and leads naturally. Its gift is a big heart; its lesson is sharing the stage.' },
    { el: 'earth', mode: 'mutable', kw: 'analysis, skill and helpfulness', d: 'Virgo is careful, intelligent earth. It notices details, improves systems, heals and serves, and likes things done well. Its gift is practical intelligence; its lesson is self-acceptance.' },
    { el: 'air', mode: 'cardinal', kw: 'balance, charm and partnership', d: 'Libra is the sign of the scales. It seeks harmony, beauty and fairness, thinks in terms of “we”, and is gifted at diplomacy and design. Its gift is grace; its lesson is deciding for itself.' },
    { el: 'water', mode: 'fixed', kw: 'depth, intensity and transformation', d: 'Scorpio is deep, still water. It is private, perceptive, loyal and strong-willed, drawn to hidden truths, intimacy and crisis. Its gift is resilience; its lesson is trust and letting go.' },
    { el: 'fire', mode: 'mutable', kw: 'optimism, freedom and meaning', d: 'Sagittarius is the archer aiming at the horizon. It is honest, adventurous and philosophical, loves travel, learning and big ideas. Its gift is faith; its lesson is tact and commitment.' },
    { el: 'earth', mode: 'cardinal', kw: 'ambition, discipline and responsibility', d: 'Capricorn is the mountain goat. It is patient, practical and ambitious, respects structure and achieves through steady work. Its gift is endurance; its lesson is allowing warmth and rest.' },
    { el: 'air', mode: 'fixed', kw: 'independence, originality and community', d: 'Aquarius is the water-bearer pouring for everyone. It is inventive, humanitarian and independent, values friendship and progress, and can seem detached. Its gift is vision; its lesson is closeness.' },
    { el: 'water', mode: 'mutable', kw: 'compassion, imagination and intuition', d: 'Pisces is the ocean where everything meets. It is gentle, intuitive, artistic and spiritual, and absorbs other people’s feelings. Its gift is compassion; its lesson is healthy boundaries.' },
  ];
  // one-line traits per sign, tuned to each planet's job
  const CORE = ['bold, energetic and quick to act', 'calm, loyal and fond of comfort and beauty', 'talkative, curious and good at communicating', 'caring, sensitive and family-minded', 'confident, warm-hearted and proud', 'careful, practical and detail-minded', 'charming, fair-minded and made for partnership', 'intense, private and deeply loyal', 'optimistic, honest and freedom-loving', 'ambitious, disciplined and patient', 'independent, original and friendly to all', 'gentle, imaginative and compassionate'];
  const FEEL = ['you need action, independence and to feel things fast and fully', 'you need security, comfort, routine and physical affection', 'you need conversation, variety and to talk feelings through', 'you need home, family, closeness and to feel protected', 'you need warmth, attention, admiration and loyalty', 'you need order, usefulness and to feel helpful', 'you need harmony, partnership and fairness', 'you need depth, trust and total emotional honesty', 'you need freedom, adventure and something to believe in', 'you need structure, achievement and to feel in control', 'you need space, friendship and freedom to be different', 'you need gentleness, imagination and quiet time to recharge'];
  const MIND = ['quick, direct and decisive — you say what you think', 'slow, steady and practical — you think things through', 'fast, curious and witty — a natural talker', 'intuitive, memory-rich and guided by feelings', 'confident, creative and expressive', 'precise, analytical and detail-minded', 'diplomatic, balanced and able to see both sides', 'probing, perceptive and good at reading people', 'big-picture, frank and philosophical', 'structured, realistic and strategic', 'original, logical and ahead of its time', 'imaginative, intuitive and poetic'];
  const LOVE = ['you love boldly — passionate, direct and fond of the chase', 'you love loyally and sensually — touch, comfort and stability', 'you love through words — flirting, fun and a mental connection', 'you love by caring — nurturing, protective and devoted', 'you love generously and grandly — romance, warmth and admiration', 'you love through small acts of care and practical help', 'you love romance, harmony and true partnership', 'you love intensely — all or nothing, deeply loyal', 'you love freely — adventure, humour and honesty', 'you love seriously — commitment, reliability and long-term plans', 'you love as a friend first — freedom and acceptance', 'you love tenderly — romantic, devoted and selfless'];
  const ACT = ['you act fast and fearlessly — a born starter', 'you act slowly but unstoppably — great stamina', 'you act through words and ideas, juggling many things', 'you act to protect — indirect, emotional and tenacious', 'you act with pride and flair — you want to lead', 'you act methodically — precise, efficient and skilled', 'you act diplomatically — you prefer cooperation to conflict', 'you act with intensity and strategy — you never give up', 'you act with enthusiasm — chasing goals and freedom', 'you act with discipline and ambition — built to achieve', 'you act for causes and ideas, in your own way', 'you act on intuition and inspiration, going with the flow'];
  const THEME = ['courage, independence and new starts', 'money, comfort, nature and the senses', 'learning, talking, writing and connections', 'home, family and emotional roots', 'creativity, romance, play and self-expression', 'work, health, skill and service', 'partnership, beauty, art and fairness', 'intimacy, shared resources, research and depth', 'travel, study, faith and big ideas', 'career, structure, hard work and long-term goals', 'friends, groups, technology and new ideas', 'compassion, spirituality, art and imagination'];
  const LESSON = ['patience and self-reliance', 'building security step by step', 'disciplined thinking and clear speech', 'emotional boundaries and family duty', 'confidence earned through effort', 'perfectionism and healthy routines', 'commitment and fairness in relationships', 'trust, control and shared resources', 'beliefs tested by experience', 'ambition and responsibility (Saturn is at home here)', 'responsibility to groups and ideals', 'boundaries, faith and facing fears'];
  const CAREER = ['leadership, sport and pioneering work', 'finance, art, food and building things', 'media, writing, teaching and sales', 'care, home, food and family business', 'creative, performing and leading roles', 'health, analysis and skilled crafts', 'law, design, diplomacy and partnerships', 'research, finance, psychology and investigation', 'education, travel, publishing and law', 'management, business and institutions', 'technology, science and social causes', 'art, healing, music and spiritual work'];

  const P = {
    Sun: { area: 'Your core self', core: 'your sense of self', what: 'your identity, vitality, purpose and confidence — what you are here to become. It also describes father figures and how you shine.', set: CORE },
    Moon: { area: 'Your emotions', core: 'your feelings', what: 'your emotions, needs, habits, instincts and what makes you feel safe. It also describes mother figures, home and your private self.', set: FEEL },
    Mercury: { area: 'Your mind and voice', core: 'your thinking', what: 'how you think, talk, write, learn and process information. It also rules siblings, short trips, paperwork and everyday contacts.', set: MIND },
    Venus: { area: 'Your love style', core: 'your heart', what: 'how you love and attract, what you find beautiful, how you enjoy life and what you value — including money.', set: LOVE },
    Mars: { area: 'Your drive', core: 'your drive', what: 'your energy, desire, courage, anger and sexuality — how you go after what you want and how you fight.', set: ACT },
    Jupiter: { area: 'Your luck and growth', core: 'your optimism', what: 'where you grow, find luck and meaning, and how you are generous. It shows your faith, wisdom and appetite for more.', themeFmt: (s) => `luck and growth come through ${THEME[s]}` },
    Saturn: { area: 'Your discipline', core: 'your sense of duty', what: 'your responsibilities, limits, fears and long-term lessons. What Saturn touches is hard at first and becomes your strength with time.', themeFmt: (s) => `your life lesson is ${LESSON[s]}` },
    Uranus: { area: 'Your originality', core: 'your need for freedom', what: 'where you rebel, innovate and need freedom, and where life brings sudden change. Its sign is shared by everyone born within about seven years.', themeFmt: (s) => `your generation shakes up ${THEME[s]}`, gen: true },
    Neptune: { area: 'Your dreams', core: 'your imagination', what: 'your dreams, ideals, intuition and spirituality — and where you can be confused or idealise. Its sign is shared by a whole generation (about 14 years).', themeFmt: (s) => `your generation dreams through ${THEME[s]}`, gen: true },
    Pluto: { area: 'Your power', core: 'your power to transform', what: 'where you meet intensity, power, crisis and rebirth. Its sign marks a whole generation (12–30 years); its house is very personal.', themeFmt: (s) => `your generation transforms ${THEME[s]}`, gen: true },
    Node: { area: 'Your life direction', core: 'your path of growth', what: 'your direction of growth in this life — qualities that feel unfamiliar but fulfilling. The South Node, exactly opposite, shows what comes too easily and holds you back.', themeFmt: (s) => `you grow by moving towards ${THEME[s]}; ${THEME[(s + 6) % 12]} come naturally but can hold you back` },
    Lilith: { area: 'Your wild side', core: 'your untamed side', what: 'the Black Moon (the Moon’s far point): raw instincts, rebellion, desires you were taught to hide, and what you refuse to compromise.', themeFmt: (s) => `your untamed side shows around ${THEME[s]}` },
    ASC: { area: 'How you come across', core: 'your outer self', what: 'the sign rising at your birth: your first impression, body, style and the way you start things. It is the “front door” of the chart.', set: CORE },
    MC: { area: 'Your public path', core: 'your ambitions', what: 'the highest point of the chart: career, reputation, public image and what you want to achieve in the world.', themeFmt: (s) => `success through ${CAREER[s]}` },
    Fortune: { area: 'Your luck point', core: 'your well-being', what: 'the Part of Fortune — an Arabic point that shows where you find ease, joy and material luck.', themeFmt: (s) => `ease and luck come through ${THEME[s]}` },
  };
  const HOUSE = [
    ['self, body and first impressions', 'The 1st house is you: your body, appearance, temperament and how you start things. Planets here are visible to everyone.'],
    ['money, possessions and self-worth', 'The 2nd house is what you own and value: income, possessions, talents and your sense of self-worth.'],
    ['communication, learning and siblings', 'The 3rd house covers everyday communication, learning, siblings, neighbours, short trips and how you share ideas.'],
    ['home, family and roots', 'The 4th house is home and roots: family, a parent, your private life, property and the emotional foundation you stand on.'],
    ['romance, creativity and fun', 'The 5th house is joy: romance, dating, creativity, play, hobbies, children and anything you do for love rather than duty.'],
    ['work routines, health and habits', 'The 6th house is daily life: work routines, health, diet, habits, colleagues, pets and being useful.'],
    ['partnership and marriage', 'The 7th house is “the other”: marriage, committed partnership, business partners and open rivals — what you seek in someone else.'],
    ['intimacy, shared money and transformation', 'The 8th house is depth: sex and intimacy, shared money, debts, inheritance, crises, psychology and rebirth.'],
    ['travel, study and beliefs', 'The 9th house is the wide world: long journeys, higher education, philosophy, religion, publishing and the search for meaning.'],
    ['career, reputation and public life', 'The 10th house is your public role: career, status, reputation, authority figures and what you are known for.'],
    ['friends, groups and hopes', 'The 11th house is community: friends, networks, groups, social causes and your hopes for the future.'],
    ['solitude, the unconscious and healing', 'The 12th house is the hidden world: solitude, dreams, the unconscious, rest, healing, secrets and spiritual retreat.'],
  ];
  const DOMICILE = { Sun: [4], Moon: [3], Mercury: [2, 5], Venus: [1, 6], Mars: [0, 7], Jupiter: [8, 11], Saturn: [9, 10], Uranus: [10], Neptune: [11], Pluto: [7] };
  const EXALT = { Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6 };
  function dignity(key, sign) {
    if (DOMICILE[key] && DOMICILE[key].includes(sign)) return { k: 'domicile', short: 'at home — strong', t: 'in its own sign (domicile): it works naturally and confidently here' };
    if (EXALT[key] === sign) return { k: 'exaltation', short: 'exalted — very strong', t: 'exalted: it is honoured here and shows its best side' };
    if (DOMICILE[key] && DOMICILE[key].some((s) => (s + 6) % 12 === sign)) return { k: 'detriment', short: 'in detriment — works against the grain', t: 'in detriment (opposite its home sign): it has to work in an unfamiliar way, which builds skill' };
    if (EXALT[key] != null && (EXALT[key] + 6) % 12 === sign) return { k: 'fall', short: 'in fall — grows with effort', t: 'in fall (opposite its exaltation): its gifts need conscious effort and mature with age' };
    return { k: 'peregrine', short: 'neutral', t: 'neither strengthened nor weakened by its sign' };
  }
  const NM = W.NAME, G = (k) => W.GLYPH[k] + (W.GLYPH[k].length === 1 ? '︎' : '');
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const trait = (key, sign) => (P[key].set ? P[key].set[sign] : P[key].themeFmt(sign));

  /* ---------- placements ---------- */
  function glance(ch, b, ctx = 'natal') {
    const area = ctx === 'composite' ? COMP_AREA[b.key] || P[b.key].area : P[b.key].area;
    let t = `${area}: ${trait(b.key, b.sign)}.`;
    if (ctx === 'composite') t = P[b.key].set ? `${area}: as a couple${/^you /.test(trait(b.key, b.sign)) ? ', ' : ' you are '}${trait(b.key, b.sign)}.` : b.key === 'MC' ? `${area}: ${trait(b.key, b.sign)}.` : `${area}: ${THEME[b.sign]}.`;
    if (b.house && !['ASC', 'MC'].includes(b.key)) t += ` Shows up in ${HOUSE[b.house - 1][0]} (house ${b.house}).`;
    const dg = W.PLANETS.includes(b.key) ? dignity(b.key, b.sign) : null;
    if (dg && dg.k !== 'peregrine') t += ` ${cap(dg.short)}.`;
    if (b.retro && W.PLANETS.includes(b.key)) t += ' Retrograde.';
    return t;
  }
  function placement(ch, b, ctx = 'natal') {
    const p = P[b.key], s = SIGN[b.sign], out = [];
    out.push(`<p><b>What it is.</b> ${NM[b.key]} describes ${p.what}</p>`);
    out.push(`<p><b>In ${S[b.sign]} (${W.dms(b.deg)}).</b> ${s.d} Here ${NM[b.key]} works through ${s.kw}: ${trait(b.key, b.sign)}.${p.gen ? ' Because this planet moves slowly, its sign describes your generation; its house and aspects make it personal.' : ''}</p>`);
    if (W.PLANETS.includes(b.key)) {
      const dg = dignity(b.key, b.sign);
      out.push(`<p><b>Strength.</b> ${NM[b.key]} is ${dg.t}.${b.retro ? ` It was <b>retrograde</b> at birth — its energy turns inward: you process ${p.core} privately, revisit things and develop them in your own way, often later in life.` : ''}</p>`);
    }
    if (b.house && !['ASC', 'MC'].includes(b.key)) out.push(`<p><b>In the ${ord(b.house)} house.</b> ${HOUSE[b.house - 1][1]} ${NM[b.key]} here means ${p.core} is lived out mostly through ${HOUSE[b.house - 1][0]}.</p>`);
    if (b.key === 'ASC' && ch.ruler) { const r = W.get(ch, ch.ruler); out.push(`<p><b>Chart ruler.</b> ${S[b.sign]} rising makes ${NM[ch.ruler]} the ruler of your chart${ch.tradRuler !== ch.ruler ? ` (traditionally ${NM[ch.tradRuler]})` : ''}. It sits in ${S[r.sign]}${r.house ? ` in the ${ord(r.house)} house` : ''}, so much of your life energy flows into ${r.house ? HOUSE[r.house - 1][0] : SIGN[r.sign].kw}.</p>`); }
    if (b.key === 'Node') out.push(`<p><b>South Node in ${S[(b.sign + 6) % 12]}.</b> The opposite point shows familiar habits — ${THEME[(b.sign + 6) % 12]} — that feel safe but stop you growing. Balance them with the North Node’s direction.</p>`);
    const asp = (ch.aspects || []).filter((a) => a.a === b.key || a.b === b.key);
    if (asp.length) out.push(`<p><b>Aspects.</b> ${asp.slice(0, 6).map((a) => { const o = a.a === b.key ? a.b : a.a; return `${W.ASP[a.type].name} ${NM[o]} (${a.orb.toFixed(1)}°)`; }).join(', ')} — see each aspect below.</p>`);
    return out.join('');
  }
  const COMP_AREA = { Sun: 'The relationship’s purpose', Moon: 'Its emotional core', Mercury: 'How you talk together', Venus: 'How you love each other', Mars: 'How you act and fight together', Jupiter: 'Where you grow together', Saturn: 'Your shared commitments', Uranus: 'Where you surprise each other', Neptune: 'Your shared dream', Pluto: 'What transforms you', Node: 'Where the relationship is heading', Lilith: 'Your shared wild side', ASC: 'How others see you as a couple', MC: 'Your shared direction' };

  /* ---------- aspects ---------- */
  const ASPV = {
    conj: ['are fused — they act as one', 'A conjunction merges the two energies: they always act together, for better or worse. This is one of the strongest features of a chart.'],
    opp: ['pull in opposite directions — balance is the lesson', 'An opposition (180°) sets the two planets against each other like a seesaw. You may swing between them, or meet one side through other people. Awareness turns it into balance and perspective.'],
    trine: ['flow together easily — a natural gift', 'A trine (120°) links planets of the same element: they cooperate without effort. It is a talent you may take for granted — use it actively.'],
    square: ['clash and push each other — friction that drives growth', 'A square (90°) creates tension: the two planets want different things at the same time. It is uncomfortable but very motivating — many achievements come from squares.'],
    sextile: ['support each other — an opportunity you can use', 'A sextile (60°) is a friendly, helpful link. It opens doors when you make a small effort.'],
    quincunx: ['don’t understand each other — they need constant adjustment', 'A quincunx (150°) joins planets with nothing in common. It asks for constant small adjustments, often around health, habits or work.'],
    semisextile: ['are mildly linked — small, useful adjustments', 'A semi-sextile (30°) is a subtle link between neighbouring signs: slight friction that encourages growth.'],
    semisquare: ['rub against each other — small irritations that spur action', 'A semi-square (45°) is a minor tension: little frictions that push you to act.'],
    sesqui: ['create occasional stress that asks for adjustment', 'A sesquiquadrate (135°) is a minor tension that flares up now and then and asks for adjustment.'],
  };
  const PAIR = {
    'Sun-Moon': 'how your will and your feelings get along — inner harmony or inner conflict', 'Sun-Mercury': 'how closely your thinking is tied to your identity', 'Sun-Venus': 'charm, warmth and a love of beauty', 'Sun-Mars': 'energy, courage and drive', 'Sun-Jupiter': 'confidence, generosity and luck', 'Sun-Saturn': 'self-discipline, seriousness and ambition', 'Sun-Uranus': 'independence and originality', 'Sun-Neptune': 'imagination, sensitivity and idealism', 'Sun-Pluto': 'willpower, intensity and the need for control', 'Moon-Mercury': 'talking about feelings and emotional intelligence', 'Moon-Venus': 'tenderness, affection and a need for harmony', 'Moon-Mars': 'emotional courage — and a quick temper', 'Moon-Jupiter': 'emotional generosity and optimism', 'Moon-Saturn': 'emotional self-control and a need for security', 'Moon-Uranus': 'emotional independence and changing moods', 'Moon-Neptune': 'deep empathy, dreams and sensitivity', 'Moon-Pluto': 'emotional intensity and depth', 'Mercury-Venus': 'a pleasant, diplomatic way with words', 'Mercury-Mars': 'a sharp, quick, debating mind', 'Mercury-Jupiter': 'big ideas, optimism and talk', 'Mercury-Saturn': 'serious, careful and structured thinking', 'Mercury-Uranus': 'brilliant, inventive and fast thinking', 'Mercury-Neptune': 'imaginative, intuitive and poetic thinking', 'Mercury-Pluto': 'penetrating, investigative thinking', 'Venus-Mars': 'passion, attraction and sexual chemistry', 'Venus-Jupiter': 'warmth, generosity and enjoyment of life', 'Venus-Saturn': 'serious, loyal love — sometimes caution in love', 'Venus-Uranus': 'excitement and a need for freedom in love', 'Venus-Neptune': 'romantic idealism and artistic gifts', 'Venus-Pluto': 'intense, all-or-nothing love', 'Mars-Jupiter': 'enthusiasm, ambition and energy', 'Mars-Saturn': 'disciplined, enduring effort — or frustration', 'Mars-Uranus': 'sudden action, daring and restlessness', 'Mars-Neptune': 'inspired action — or scattered energy', 'Mars-Pluto': 'tremendous willpower and intensity', 'Jupiter-Saturn': 'the balance between growth and limits', 'ASC-Sun': 'a strong, visible personality', 'ASC-Moon': 'feelings that show on your face', 'MC-Sun': 'a strong drive for public recognition', 'MC-Saturn': 'career built slowly through hard work', 'Node-Moon': 'emotional ties that feel fated', 'Node-Sun': 'a strong sense of destiny',
  };
  const ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Node', 'Lilith', 'ASC', 'MC', 'Fortune'];
  const pairKey = (a, b) => { const x = [a, b].sort((p, q) => (['ASC', 'MC', 'Node'].includes(p) ? -1 : ORDER.indexOf(p)) - (['ASC', 'MC', 'Node'].includes(q) ? -1 : ORDER.indexOf(q))); return PAIR[x.join('-')] || PAIR[[a, b].join('-')] || PAIR[[b, a].join('-')]; };
  function aspectGlance(a, ctx = 'natal') {
    const pa = P[a.a], pb = P[a.b];
    const subj = ctx === 'composite' ? `${pa.core.replace('your', 'your shared')} and ${pb.core.replace('your', 'your shared')}` : `${cap(pa.core)} and ${pb.core}`;
    return `${cap(subj)} ${ASPV[a.type][0]}.`;
  }
  function aspectDetail(a, ctx = 'natal') {
    const pk = pairKey(a.a, a.b);
    return `<p>${NM[a.a]} (${P[a.a].core}) and ${NM[a.b]} (${P[a.b].core}) form a <b>${W.ASP[a.type].name}</b>, ${a.orb.toFixed(1)}° from exact${a.applying == null ? '' : a.applying ? ', applying (getting stronger)' : ', separating'}.</p>
      <p>${ASPV[a.type][1]}</p>
      ${pk ? `<p><b>This pair is about</b> ${pk}. ${W.ASP[a.type].kind === 'soft' ? 'Here it works smoothly — a resource to lean on.' : W.ASP[a.type].kind === 'hard' ? 'Here it is a source of tension — and of drive once you work with it consciously.' : W.ASP[a.type].kind === 'conj' ? 'Here the two are blended, so this theme is central for you.' : 'Here it needs patient adjustment.'}</p>` : ''}
      ${ctx === 'composite' ? '<p>In a composite chart this describes the relationship itself, not either of you alone.</p>' : ''}`;
  }

  /* ---------- patterns & balance ---------- */
  const PATTERN = {
    'Grand trine': 'Three planets in a triangle of trines — an area of natural talent and ease. The risk is complacency: use the gift actively.',
    'T-square': 'Two planets in opposition, both squared by a third (the apex). A powerful engine of drive and stress; the apex planet is where tension is released and where you can achieve most.',
    'Grand cross': 'Four planets in a cross of squares and oppositions — great strength and resilience built from constant tension.',
    Yod: '“The finger of fate”: two planets in sextile both quincunx a third. The apex planet points to a special mission or recurring life adjustment.',
    Stellium: 'Three or more planets packed into one sign or house — a powerful concentration of energy and a central life theme.',
  };
  const EL_TXT = { fire: 'fire — enthusiasm, courage and action', earth: 'earth — practicality, stability and the senses', air: 'air — ideas, communication and social life', water: 'water — feelings, intuition and empathy' };
  const MODE_TXT = { cardinal: 'cardinal — you start things and take initiative', fixed: 'fixed — you persist, focus and finish', mutable: 'mutable — you adapt, learn and change easily' };

  /* ---------- synastry ---------- */
  const SYN = {
    'Sun-Moon': 'one of the classic signs of a lasting bond — one person’s identity meets the other’s emotional needs', 'Venus-Mars': 'the classic chemistry contact — attraction and desire', 'Moon-Moon': 'how your emotional rhythms and needs fit', 'Mercury-Mercury': 'how you talk, think and argue together', 'Venus-Venus': 'shared tastes and ways of loving', 'Mars-Mars': 'how your energies and tempers mix', 'Sun-Sun': 'how your identities and life goals fit', 'Moon-Venus': 'tenderness, affection and feeling cared for', 'Sun-Venus': 'admiration, affection and pleasure in each other', 'Moon-Mars': 'emotion meets desire — passion, but also hurt feelings', 'Sun-Mars': 'energy and drive — motivation or competition', 'Mercury-Venus': 'sweet words and easy conversation', 'Mercury-Moon': 'understanding each other’s feelings through talk', 'Sun-Mercury': 'mental rapport — you get each other’s ideas',
  };
  const SYN_OUTER = { Jupiter: 'generosity, encouragement and growth', Saturn: 'commitment and loyalty — but also seriousness or restriction', Uranus: 'excitement and freedom — but also unpredictability', Neptune: 'romance and idealisation — but also illusion', Pluto: 'intensity, transformation and power dynamics', Node: 'a “fated” feeling — you help each other grow', ASC: 'immediate recognition and physical attraction', MC: 'support for each other’s ambitions', Lilith: 'raw attraction and taboo-breaking', Fortune: 'shared luck and well-being' };
  function synTopic(a, b) {
    const k1 = [a, b].join('-'), k2 = [b, a].join('-');
    if (SYN[k1] || SYN[k2]) return SYN[k1] || SYN[k2];
    const outer = ['Pluto', 'Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Node', 'Lilith', 'ASC', 'MC'].find((x) => x === a || x === b);
    if (outer) { const other = a === outer ? b : a; return other === outer ? `${SYN_OUTER[outer]} — a shared generational or personal theme` : `${SYN_OUTER[outer]} around ${OBJ[other]}`; }
    return pairKey(a, b) || `${OBJ[a]} meets ${OBJ[b]}`;
  }
  const OBJ = { Sun: 'identity', Moon: 'feelings', Mercury: 'communication', Venus: 'love', Mars: 'desire', Jupiter: 'growth', Saturn: 'duty', Uranus: 'freedom', Neptune: 'dreams', Pluto: 'power', Node: 'life direction', Lilith: 'hidden desires', ASC: 'personal style', MC: 'ambitions', Fortune: 'well-being' };
  const SYN_Q = { conj: 'intense and immediate', trine: 'flows easily', sextile: 'friendly and supportive', square: 'creates friction and spark', opp: 'strong attraction with push and pull', quincunx: 'needs adjustment' };
  function synGlance(x) { return `${cap(synTopic(x.a, x.b))} — ${SYN_Q[x.type] || 'subtle'}.`; }
  function synDetail(x, nA, nB) {
    const kind = W.ASP[x.type].kind;
    return `<p><b>${nA}’s ${NM[x.a]}</b> (${P[x.a].core.replace('your', 'their')}) forms a <b>${W.ASP[x.type].name}</b> with <b>${nB}’s ${NM[x.b]}</b> (${P[x.b].core.replace('your', 'their')}), ${x.orb.toFixed(1)}° from exact.</p>
      <p>This contact is about ${synTopic(x.a, x.b)}. ${kind === 'soft' ? 'It works easily: you naturally bring out good things in each other here.' : kind === 'hard' ? 'It brings tension: you can rub each other the wrong way here, but this friction is also what keeps the connection alive and makes you grow.' : kind === 'conj' ? 'The two energies merge — this is one of the most noticeable features of your connection.' : 'It asks you to adjust to each other with patience.'}</p>`;
  }
  // relationship scores from synastry aspects
  const CATS = {
    love: { name: 'Love & romance', pairs: ['Venus-Mars', 'Venus-Venus', 'Sun-Venus', 'Moon-Venus', 'ASC-Venus', 'Venus-Jupiter', 'Venus-Neptune', 'Sun-Moon'] },
    emotion: { name: 'Emotional bond', pairs: ['Moon-Moon', 'Sun-Moon', 'Moon-Venus', 'ASC-Moon', 'Moon-Jupiter', 'Moon-Saturn', 'Moon-Pluto', 'Moon-Neptune'] },
    talk: { name: 'Communication', pairs: ['Mercury-Mercury', 'Sun-Mercury', 'Mercury-Moon', 'Mercury-Jupiter', 'Mercury-Venus', 'Mercury-Saturn', 'Mercury-Uranus'] },
    passion: { name: 'Passion', pairs: ['Venus-Mars', 'Mars-Mars', 'Mars-Pluto', 'Venus-Pluto', 'ASC-Mars', 'Moon-Mars', 'Sun-Mars'] },
    commit: { name: 'Commitment', pairs: ['Sun-Saturn', 'Moon-Saturn', 'Venus-Saturn', 'Sun-Moon', 'Node-Sun', 'Node-Moon', 'Node-Venus', 'Saturn-Saturn', 'Jupiter-Saturn'] },
  };
  function synScores(syn) {
    const out = {};
    for (const [id, c] of Object.entries(CATS)) {
      let s = 0;
      for (const x of syn) {
        const key = [x.a, x.b].sort().join('-');
        if (!c.pairs.some((p) => p.split('-').sort().join('-') === key)) continue;
        const tight = 1 - x.orb / (x.lim || 7);
        const hasSat = x.a === 'Saturn' || x.b === 'Saturn';
        const val = { trine: 1, sextile: 0.8, conj: hasSat ? (id === 'commit' ? 0.7 : -0.2) : 0.9, opp: ['Venus-Mars', 'Sun-Moon'].some((p) => p.split('-').sort().join('-') === key) ? 0.4 : -0.4, square: hasSat ? -0.8 : id === 'passion' ? 0.1 : -0.6, quincunx: -0.3 }[x.type] || 0;
        s += val * (0.5 + tight);
      }
      out[id] = { name: c.name, score: Math.max(8, Math.min(96, Math.round(52 + 13 * s))) };
    }
    out.overall = { name: 'Overall', score: Math.round(Object.values(out).reduce((a, b) => a + b.score, 0) / Object.keys(CATS).length) };
    return out;
  }
  function elementFit(a, b) {
    const ea = SIGN[a].el, eb = SIGN[b].el;
    if (ea === eb) return { s: 2, t: `both ${ea} — you instinctively understand each other` };
    const p = [ea, eb].sort().join('+');
    if (p === 'air+fire' || p === 'earth+water') return { s: 1, t: `${ea} and ${eb} feed each other — a supportive mix` };
    if (p === 'air+earth' || p === 'fire+water') return { s: -1, t: `${ea} and ${eb} work differently — it takes effort to meet halfway` };
    return { s: 0, t: `${ea} and ${eb} are neutral to each other` };
  }
  const OVERLAY = { Sun: 'brings warmth, attention and a sense of purpose to', Moon: 'brings emotional comfort and familiarity to', Mercury: 'stimulates talk and shared ideas around', Venus: 'adds affection, attraction and pleasure to', Mars: 'energises — and can heat up —', Jupiter: 'expands, encourages and blesses', Saturn: 'adds commitment, seriousness and some weight to', Uranus: 'brings excitement and the unexpected to', Neptune: 'brings romance, dreams and some confusion to', Pluto: 'brings intensity and transformation to', Node: 'feels fated around', Lilith: 'stirs hidden desires around', ASC: 'feels personal and visible in', MC: 'supports goals in' };

  /* ---------- transits ---------- */
  const TONE = { Sun: 'the spotlight', Moon: 'your mood', Mercury: 'talks and messages', Venus: 'affection and pleasure', Mars: 'energy and drive', Jupiter: 'growth and luck', Saturn: 'pressure and responsibility', Uranus: 'surprises and change', Neptune: 'dreams and confusion', Pluto: 'intensity and transformation', Node: 'fated encounters' };
  const ADV = {
    Sun: ['take the lead and be seen', 'avoid ego clashes'], Moon: ['trust your instincts and look after your needs', 'don’t take moods too seriously'], Mercury: ['talk, write, plan and sign', 'double-check messages and details'], Venus: ['treat yourself and reach out to someone you love', 'avoid overspending and jealousy'], Mars: ['start things, exercise and act', 'avoid rushing, accidents and arguments'], Jupiter: ['say yes to opportunities', 'don’t overdo or overpromise'], Saturn: ['commit and do the hard work', 'pace yourself and accept limits'], Uranus: ['try something new', 'stay flexible — expect the unexpected'], Neptune: ['create, meditate and dream', 'avoid illusions and check facts'], Pluto: ['go deep and change old habits', 'avoid power struggles'], Node: ['notice meaningful encounters', 'don’t cling to old patterns'],
  };
  function transitGlance(t) {
    const kind = W.ASP[t.type].kind;
    const pl = / and |s$/.test(TONE[t.a]);
    return `${cap(TONE[t.a])} ${kind === 'soft' ? (pl ? 'flow' : 'flows') + ' easily into' : kind === 'hard' ? (pl ? 'challenge' : 'challenges') : kind === 'conj' ? (pl ? 'merge' : 'merges') + ' with' : pl ? 'nudge' : 'nudges'} ${P[t.b].core}.`;
  }
  function transitAdvice(t) { return ADV[t.a][W.ASP[t.type].kind === 'soft' ? 0 : W.ASP[t.type].kind === 'conj' && ['Jupiter', 'Venus', 'Sun', 'Moon', 'Mercury'].includes(t.a) ? 0 : 1]; }
  const SLOW_TXT = {
    Jupiter: { soft: 'a year of opportunity, help and growth in this area', hard: 'growth through stretching — beware of excess', conj: 'a 12-year high point: expansion and new beginnings' },
    Saturn: { soft: 'steady, earned progress — a good time to build', hard: 'a test of commitment: pressure, delays and maturity', conj: 'a major checkpoint: responsibility, endings and solid new foundations' },
    Uranus: { soft: 'refreshing change and new freedom', hard: 'sudden shake-ups that break routines', conj: 'a liberation — breaking free from old limits' },
    Neptune: { soft: 'inspiration, compassion and spiritual growth', hard: 'confusion and fading certainties — trust slowly', conj: 'dissolving old forms; dreams and sensitivity rise' },
    Pluto: { soft: 'empowering, deep transformation', hard: 'intense crisis that forces change', conj: 'a profound rebirth in this area of life' },
  };
  const RETURNS = { 'Saturn-Saturn-conj': 'your Saturn return — a once-in-29-years coming of age', 'Jupiter-Jupiter-conj': 'your Jupiter return — a new 12-year cycle of growth', 'Uranus-Uranus-opp': 'your Uranus opposition — the classic mid-life awakening', 'Saturn-Saturn-opp': 'your Saturn opposition — a mid-cycle review of commitments', 'Neptune-Neptune-square': 'your Neptune square — questioning what is real', 'Pluto-Pluto-square': 'your Pluto square — a deep mid-life transformation' };
  const HOUSE_DO = ['self-care, a fresh start and how you look', 'money matters and enjoying what you have', 'messages, errands, learning and short trips', 'home, family and rest', 'romance, play and creative projects', 'chores, health routines and getting organised', 'your partner, meetings and agreements', 'deep talks, shared finances and letting go', 'learning, travel plans and big-picture thinking', 'career moves and being visible', 'friends, groups and future plans', 'rest, reflection, sleep and quiet time'];
  const HOUSE_AVOID = ['acting on impulse or being self-centred', 'impulse spending', 'gossip and scattered attention', 'bringing work stress home', 'drama, gambling and risky bets', 'overwork and skipping rest', 'taking your partner for granted', 'power games and secrecy', 'preaching or rigid opinions', 'cutting corners at work', 'overcommitting socially', 'isolation and escapism'];
  const PHASE_TXT = { 'New Moon': 'a time to set intentions and start fresh', 'Waxing crescent': 'momentum builds — take first steps', 'First quarter': 'a turning point — act and push through obstacles', 'Waxing gibbous': 'refine and adjust before results arrive', 'Full Moon': 'emotions peak and things come to light — finish and celebrate', 'Waning gibbous': 'share what you learned and give back', 'Last quarter': 'release what is not working', 'Waning crescent': 'rest, reflect and clear space' };
  const PROG_MOON = (s) => `For about two and a half years your emotional focus is on ${THEME[s]}; ${FEEL[s]}.`;

  return { SIGN, P, HOUSE, CORE, FEEL, THEME, dignity, glance, placement, aspectGlance, aspectDetail, PATTERN, EL_TXT, MODE_TXT, synGlance, synDetail, synTopic, synScores, elementFit, OVERLAY, TONE, ADV, transitGlance, transitAdvice, SLOW_TXT, RETURNS, HOUSE_DO, HOUSE_AVOID, PHASE_TXT, PROG_MOON, COMP_AREA, ord, cap, G, trait };
})();
if (typeof module !== 'undefined') module.exports = WK;
