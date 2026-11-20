/* ============================================================
   Deeper European (tropical) readings — brings natal, composite
   and Davison placements, houses and aspects up to the depth of
   the Kundli readings. Reuses the shared sign profiles (JY.SX)
   and planet-in-house texts where the traditions agree, and adds
   Western-only texts for Uranus, Neptune, Pluto, the Node and Lilith.
   ============================================================ */
(() => {
  const { SIGN, P, HOUSE, THEME, dignity, ord, cap, trait } = WK;
  const S = W.SIGNS, SX = JY.SX, NM = new Proxy(W.NAME, { get: (o, k) => (k === 'Sun' || k === 'Moon' ? 'the ' + o[k] : o[k]) });
  const NMC = (k) => cap(NM[k]);
  const RULER = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Pluto', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const TRAD = { 7: 'Mars', 10: 'Saturn', 11: 'Jupiter' };
  const ELS = ['fire', 'earth', 'air', 'water'], MODES = ['cardinal', 'fixed', 'mutable'];
  const ELW = { fire: 'Fire signs act on enthusiasm and need movement, purpose and a little drama.', earth: 'Earth signs are practical and sensual and build things that last.', air: 'Air signs live through ideas, conversation and relationships.', water: 'Water signs feel first and think second; intuition is their compass.' };
  const MODW = { cardinal: 'As a cardinal sign it starts things and takes the initiative.', fixed: 'As a fixed sign it is steady, determined and slow to change.', mutable: 'As a mutable sign it adapts, learns and sees both sides.' };

  function signBlock(s, opts = {}) {
    const x = SX[s], el = ELS[s % 4], md = MODES[s % 3];
    return `<p>${SIGN[s].d} Its symbol is ${x.sym}; its ruler is ${NM[RULER[s]]}${TRAD[s] ? ` (traditionally ${NM[TRAD[s]]})` : ''}. ${ELW[el]} ${MODW[md]}</p><ul class="facts"><li><b>Strengths:</b> ${x.str}.</li><li><b>Challenges:</b> ${x.ch}.</li>${opts.love === false ? '' : `<li><b>In love:</b> ${x.love}.</li>`}${opts.work === false ? '' : `<li><b>Work it suits:</b> ${x.work}.</li>`}${opts.look ? `<li><b>Appearance:</b> ${x.look}.</li>` : ''}${opts.body === false ? '' : `<li><b>Body areas:</b> ${x.body}.</li>`}${opts.stress ? `<li><b>Under stress:</b> ${x.stress}; <b>what helps:</b> ${x.soothe}.</li>` : ''}</ul>`;
  }

  /* planet in house — personal planets share their meaning with the Vedic texts */
  const HFX = Object.assign({}, ...['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((k) => ({ [k]: JY.HFX[k] })), {
    Uranus: ['an unconventional, independent personality; you reinvent your look and direction often', 'income that comes in surprising ways — freelance, tech or sudden gains and losses; keep a cushion', 'an inventive, fast and original mind; unusual neighbours or siblings, and flashes of insight', 'an unusual home life — moves, flatmates or a home that doubles as a workplace; freedom at home matters', 'unexpected romances, original creativity and a need for excitement in love', 'irregular work patterns; you need freedom in your daily routine and do well with technology', 'a partner who is unusual or independent, sudden relationship changes; you need space within commitment', 'sudden changes in shared money or intimacy; a fascination with the unusual and taboo', 'unconventional beliefs, sudden trips and learning that changes your worldview', 'an unconventional career path with sudden turns; you need to be your own boss', 'many unusual friends, group projects and causes; your goals change suddenly', 'a hidden rebellious streak and sudden insights from dreams or solitude'],
    Neptune: ['a dreamy, sensitive and changeable presence; people project onto you', 'a vague relationship with money — generous but easily lost; earnings from art, healing or the sea', 'an imaginative, poetic mind; you think in images and can misread messages', 'an idealised home or family; a longing for the perfect home and sensitivity to its atmosphere', 'romantic, creative and inspired — and prone to falling for an illusion', 'sensitivity to food and medicines; work in care, art or healing suits you; avoid chaos in routines', 'an idealised partner; you may rescue or be rescued — check facts in love and contracts', 'psychic sensitivity, deep merging in intimacy and confusion over shared money', 'a spiritual, idealistic outlook; you are drawn to distant places, faith and mysticism', 'a career in art, film, healing or charity; your public image is hard to pin down', 'idealistic friendships and causes; some friends may disappoint, others inspire', 'a rich inner life, strong intuition and a need for retreat and solitude'],
    Pluto: ['an intense, magnetic presence; you transform yourself several times in life', 'strong drives around money and possessions — total loss and rebuilding; power through resources', 'a penetrating mind that investigates; words that have strong power over others', 'intense family dynamics and deep roots; transformation through the home or a parent', 'all-or-nothing romances, intense creativity and strong bonds with children', 'transformation through work and health; an obsessive drive to fix and improve', 'intense, transforming partnerships; power struggles until trust is built', 'great depth: intimacy, shared resources, inheritance, psychology and crisis management', 'beliefs transformed by experience; a drive to find the ultimate truth', 'a powerful drive for status and influence; career reinventions', 'powerful friends and groups; you influence or are influenced by collectives', 'hidden power, secrets and deep inner work; therapy and research suit you'],
    Node: ['growth through independence and putting yourself first; less people-pleasing', 'growth through building your own resources and values; less reliance on others', 'growth through learning, asking questions and everyday conversation', 'growth through home, family and emotional honesty rather than status', 'growth through creativity, joy and following your heart', 'growth through daily routine, service and looking after your health', 'growth through partnership and cooperation rather than going it alone', 'growth through intimacy, trust and sharing power and resources', 'growth through travel, study and finding your own beliefs', 'growth through career, responsibility and public goals', 'growth through friends, groups and a future-oriented vision', 'growth through solitude, compassion and letting go of control'],
    Lilith: ['a raw, untamed presence; you refuse to be anyone but yourself', 'refusing to be owned; strong desires around money, pleasure and the body', 'saying the unsayable; a provocative, unfiltered voice', 'conflicts with family expectations; a need to define home on your own terms', 'intense desires in love and creativity; rejecting conventional romance', 'rebellion against routines and other people’s rules at work', 'attraction to forbidden or unequal partners; power and honesty in relationships', 'deep, taboo-breaking intimacy; fascination with the hidden', 'rebellious beliefs; questioning religion and authority', 'a career that breaks the rules; refusing to compromise your public image', 'rebellious groups and outsider friends', 'hidden desires and secrets; power found in solitude'],
    Fortune: ['ease and luck come through being yourself and your own initiative', 'luck with money and comfort through steady effort', 'luck through learning, writing and your local network', 'joy at home and through family', 'luck through creativity, romance and children', 'well-being through a healthy daily routine and useful work', 'luck through partners and agreements', 'luck through shared resources, research and deep bonds', 'luck through travel, study and wide horizons', 'luck through career and public recognition', 'luck through friends and groups', 'well-being through retreat, spirituality and helping others quietly'],
  });
  const PRAC = Object.assign({}, ...['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((k) => ({ [k]: { strong: JY.PX[k].strong, weak: JY.PX[k].weak, adv: JY.PX[k].adv } })), {
    Uranus: { strong: 'originality, inventiveness, independence and a talent for technology and reform', weak: 'restlessness, sudden breaks, nervous tension and rebellion for its own sake', adv: 'build some freedom into every commitment, and channel restlessness into innovation rather than sudden exits' },
    Neptune: { strong: 'imagination, compassion, artistic and spiritual gifts and intuition', weak: 'confusion, escapism, self-deception and being taken advantage of', adv: 'keep firm boundaries, check facts before trusting, and give your imagination a creative outlet' },
    Pluto: { strong: 'resilience, depth, psychological insight and the power to rebuild after crisis', weak: 'control, jealousy, obsession and power struggles', adv: 'let go of what is finished, face fears directly and use your power to empower others' },
    Node: { strong: 'a sense of purpose and growth that feels fated and fulfilling', weak: 'falling back into the comfortable South Node habits and feeling stuck', adv: 'take small, regular steps toward the North Node’s qualities, even when they feel unfamiliar' },
    Lilith: { strong: 'authenticity, sexual confidence and the courage to refuse what is wrong for you', weak: 'anger at being controlled, shame around desire and self-sabotage', adv: 'own your desires without shame and set clear boundaries rather than rebelling in secret' },
    Fortune: { strong: 'ease, joy and material comfort in this area of life', weak: 'chasing luck elsewhere and missing what comes naturally', adv: 'invest time in the area this point falls in — it pays back' },
  });

  function placement(ch, b, ctx = 'natal') {
    const p = P[b.key], out = [], pers = !['ASC', 'MC'].includes(b.key);
    out.push(`<h5>What ${NM[b.key]} means</h5><p>${NMC(b.key)} describes ${p.what}</p>`);
    out.push(`<h5>${NMC(b.key)} in ${S[b.sign]} — ${W.dms(b.deg)}</h5>${signBlock(b.sign, { look: b.key === 'ASC', stress: b.key === 'Moon', work: !p.gen && !['Moon', 'Venus'].includes(b.key), love: !p.gen && !['MC', 'Saturn'].includes(b.key), body: !p.gen })}<p>Here ${NM[b.key]} works through ${SIGN[b.sign].kw}: <b>${trait(b.key, b.sign)}</b>.${p.gen ? ' Because this planet moves slowly, its sign describes your generation; its house and aspects make it personal.' : ''}</p>`);
    if (W.PLANETS.includes(b.key)) {
      const dg = dignity(b.key, b.sign);
      out.push(`<h5>Strength</h5><p>${NMC(b.key)} is ${dg.t}.${b.retro ? ` It was <b>retrograde</b> at birth — its energy turns inward: you process ${p.core} privately, revisit things and develop them in your own way, often later in life. Retrograde planets are deeper, not weaker.` : ''}</p>`);
    }
    if (b.house && pers) {
      const fx = HFX[b.key] && HFX[b.key][b.house - 1];
      out.push(`<h5>In your ${ord(b.house)} house — ${HOUSE[b.house - 1][0]}</h5><p>${HOUSE[b.house - 1][1]} ${NMC(b.key)} here means ${p.core} is lived out mostly through ${HOUSE[b.house - 1][0]}.${fx ? ` In practice it tends to bring <b>${fx}</b>.` : ''}</p>`);
      const rules = RULER.map((r, s) => (r === b.key ? s : -1)).filter((s) => s >= 0);
      if (ch.cusps && rules.length) { const hs = []; for (let i = 0; i < 12; i++) if (rules.includes(Math.floor(((ch.cusps[i] % 360) + 360) % 360 / 30))) hs.push(i + 1); if (hs.length) out.push(`<p>${NMC(b.key)} also rules your ${hs.map(ord).join(' and ')} house${hs.length > 1 ? 's' : ''} (${hs.map((h) => HOUSE[h - 1][0]).join('; ')}), so it carries those matters into the ${ord(b.house)} house — the two areas of life are linked in your story.</p>`); }
    }
    if (b.key === 'ASC') {
      if (ch.ruler) { const r = W.get(ch, ch.ruler); out.push(`<h5>Chart ruler</h5><p>${S[b.sign]} rising makes ${NM[ch.ruler]} the ruler of your chart${ch.tradRuler !== ch.ruler ? ` (traditionally ${NM[ch.tradRuler]})` : ''}. It sits in ${S[r.sign]}${r.house ? ` in the ${ord(r.house)} house` : ''}, so much of your life energy flows into ${r.house ? HOUSE[r.house - 1][0] : SIGN[r.sign].kw}.</p>`); }
      out.push(`<h5>First impressions</h5><p>People first meet you as someone ${WK.CORE[b.sign]}. Under pressure ${SX[b.sign].stress}. Your Sun sign shows who you are underneath; the rising sign is the front door.</p>`);
    }
    if (b.key === 'MC') out.push(`<h5>Career and reputation</h5><p>With ${S[b.sign]} on the Midheaven you are drawn to ${SX[b.sign].work}, and you want to be known for ${SX[b.sign].str.split(',').slice(0, 2).join(' and')}. Its ruler ${NM[RULER[b.sign]]} shows how you get there.</p>`);
    if (b.key === 'Node') out.push(`<h5>South Node in ${S[(b.sign + 6) % 12]}</h5><p>The opposite point shows familiar habits — ${THEME[(b.sign + 6) % 12]} — that feel safe but stop you growing. You already have its strengths (${SX[(b.sign + 6) % 12].str}); the danger is ${SX[(b.sign + 6) % 12].ch}. Balance them with the North Node’s direction.</p>`);
    const x = PRAC[b.key];
    if (x && ctx === 'natal') { const dg = W.PLANETS.includes(b.key) ? dignity(b.key, b.sign).k : 'peregrine'; out.push(`<h5>In practice</h5><ul class="facts">${dg !== 'detriment' && dg !== 'fall' ? `<li><b>At its best:</b> ${x.strong}.</li>` : ''}${dg !== 'domicile' && dg !== 'exaltation' ? `<li><b>When it struggles:</b> ${x.weak}.</li>` : ''}<li><b>What helps:</b> ${x.adv}.</li></ul>`); }
    const asp = (ch.aspects || []).filter((a) => a.a === b.key || a.b === b.key);
    if (asp.length) out.push(`<h5>Aspects</h5><ul class="facts">${asp.slice(0, 8).map((a) => { const o = a.a === b.key ? a.b : a.a; return `<li><b>${W.ASP[a.type].name} ${NM[o]}</b> (${a.orb.toFixed(1)}°): ${WK.aspectGlance(a, ctx)}</li>`; }).join('')}</ul>`);
    return out.join('');
  }

  /* everyday examples for natal aspects — [harmonious, tense] */
  const ASP_LIFE = {
    'Moon-Sun': ['what you want and what you feel usually agree — decisions feel right, and you are at ease with yourself', 'you may want one thing and feel another — for example, taking a job for the status and then feeling unhappy in it; check in with your feelings before big decisions'],
    'Saturn-Sun': ['you are reliable and build success slowly but surely', 'you can be hard on yourself and feel you are never good enough — success comes, but later; celebrate small wins'],
    'Moon-Saturn': ['you stay calm in a crisis and others lean on you', 'you may hide your feelings or feel you must cope alone — for example, saying “I’m fine” when you are not'],
    'Mars-Moon': ['you defend the people you love and act on your feelings', 'you react quickly when hurt — a sharp word slips out; pause before answering a message that upsets you'],
    'Mars-Venus': ['you are attractive and know what you want in love', 'love and desire may pull different ways — attraction to people who are not good for you, or making up after fights'],
    'Saturn-Venus': ['you are loyal and serious in love, and good with money', 'you may fear rejection and hold back affection, or be very strict with spending'],
    'Jupiter-Venus': ['you are warm, generous and lucky in love and money', 'you can overspend on pleasure, treats or other people — set a fun budget'],
    'Mars-Saturn': ['you can work long and hard toward a goal', 'you swing between pushing and blocking yourself — frustration, then bursts of anger; steady exercise helps'],
    'Mercury-Saturn': ['you think things through and your word can be trusted', 'you may doubt your ideas or worry before speaking; writing things down helps'],
    'Mars-Mercury': ['you are quick, witty and persuasive', 'you argue to win — in a heated chat you may say more than you mean'],
    'Moon-Venus': ['you are affectionate and easy to be close to', 'you may seek comfort in sweets, shopping or people-pleasing when low'],
    'Moon-Neptune': ['you are deeply intuitive and kind', 'you absorb other people’s moods and can lose yourself; protect your energy'],
    'Moon-Pluto': ['you feel deeply and are emotionally strong', 'you can feel jealous or need control when you feel insecure'],
    'Moon-Uranus': ['you are emotionally independent and open-minded', 'your moods change suddenly and you may need space without warning'],
    'Neptune-Venus': ['you are romantic and artistic', 'you may idealise partners and see what you wish to see'],
    'Pluto-Venus': ['you love deeply and loyally', 'love can become all-or-nothing, with jealousy'],
    'Uranus-Venus': ['you need excitement and freedom in love — and bring it', 'you may get bored or end things suddenly'],
    'Jupiter-Sun': ['you are optimistic and others give you chances', 'you may over-promise or take on too much'],
    'Mercury-Neptune': ['your imagination is strong — a gift for stories and art', 'you may forget details or misread messages; double-check dates and money'],
    'Jupiter-Moon': ['you are generous and emotionally open', 'you may over-eat or over-give when emotional'],
  };
  const baseDetail = WK.aspectDetail;
  function aspectDetail(a, ctx = 'natal') {
    const key = [a.a, a.b].sort().join('-'), e = ASP_LIFE[key], kind = W.ASP[a.type].kind;
    let life = '';
    if (e && ctx === 'natal') life = `<p><b>In daily life:</b> ${kind === 'soft' ? e[0] : kind === 'hard' ? e[1] : `${e[0]}; but ${e[1]}`}.</p>`;
    if (e && ctx === 'composite') life = `<p><b>As a couple</b> the pattern reads like this: ${kind === 'soft' ? e[0] : e[1]}. In a composite chart this describes the mood of the relationship itself — something you feel together.</p>`;
    return baseDetail(a, ctx) + life;
  }

  /* houses in depth */
  function houseDeep(ch, i, s, ruler, rb, occ) {
    const x = SX[s];
    return `<h5>The ${ord(i + 1)} house — ${HOUSE[i][0]}</h5><p>${HOUSE[i][1]}</p>
      <h5>${S[s]} on the cusp</h5><p>You meet these matters with ${SIGN[s].kw}: ${x.str} at best, ${x.ch} at worst.</p>
      <h5>Its ruler, ${NM[ruler]}</h5><p>${NMC(ruler)} is in ${S[rb.sign]}${rb.house ? ` in your ${ord(rb.house)} house (${HOUSE[rb.house - 1][0]})` : ''} — the two areas of life are linked.${rb.house && HFX[ruler] ? ` It tends to bring ${HFX[ruler][rb.house - 1]}.` : ''}</p>
      <h5>Planets here</h5>${occ.length ? `<ul class="facts">${occ.map((b) => `<li><b>${NMC(b.key)}</b> in ${S[b.sign]}: ${HFX[b.key] ? HFX[b.key][i] : trait(b.key, b.sign)}.</li>`).join('')}</ul><p>This area is emphasised in your life.</p>` : '<p>No planets here — the house is read through its sign and ruler; an empty house is not an empty area of life.</p>'}`;
  }

  Object.assign(WK, { placement, aspectDetail, houseDeep, signBlock, HFX_W: HFX, PRAC, RULER, ASP_LIFE });
})();
