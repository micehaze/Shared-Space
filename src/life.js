/* ============================================================
   Compatibility in everyday life — practical, concrete examples
   for both Vedic and European views. Built from each partner's
   Moon, Mercury, Venus, Mars and Sun signs, the kootas, house
   overlays and synastry contacts. Tendencies, not certainties.
   ============================================================ */
const LIFE = (() => {
  const EL = (s) => ['fire', 'earth', 'air', 'water'][s % 4];
  const MONEY = ['spends quickly and on impulse, especially on new things and experiences', 'is careful and value-minded, likes savings and quality things that last', 'spends on gadgets, books, trips and going out — money comes and goes', 'saves for home and family, feels safe with a cushion and spends on loved ones', 'is generous, likes to treat people and spends on fun, style and gifts', 'budgets carefully, compares prices and dislikes waste', 'spends on beauty, clothes, art and nice evenings, and likes money shared fairly', 'is private about money, saves quietly and wants a say in shared finances', 'spends on travel, learning and adventures and is optimistic about money', 'is a disciplined saver who plans long-term and invests', 'spends on causes, technology and friends and is unconventional about money', 'gives easily and is a little vague about money — forgets to keep track'];
  const SAVER = [-1, 1, -1, 1, -1, 1, -1, 1, -1, 1, 0, -1];
  const TALK = ['blunt and quick — says it straight and moves on', 'slow and steady — needs time and won’t be rushed', 'chatty and witty — jumps between topics', 'emotional and indirect — remembers how things were said', 'expressive and proud — needs to be heard and respected', 'precise and a little critical — notices every detail', 'diplomatic — avoids conflict and looks for a fair middle', 'probing and private — reads between the lines', 'frank and big-picture — can be tactless', 'practical and to the point — dislikes small talk', 'logical and detached — enjoys debating ideas', 'gentle and intuitive — may avoid hard topics'];
  const LOVE = ['excitement, flirting and doing things together', 'touch, good food, little gifts and being reliably there', 'messages, long conversations, jokes and new experiences', 'care, cooking, protection and remembering small things', 'compliments, grand gestures and being proud of each other in public', 'practical help — fixing, organising, looking after each other’s health', 'romantic dates, beauty, harmony and politeness', 'intensity, loyalty, deep talks and intimacy', 'adventures, travel, humour and honesty', 'commitment, plans for the future and providing', 'friendship, freedom and being accepted as they are', 'tenderness, romance, small sacrifices and sensing each other’s mood'];
  const FIGHT = ['flares up fast and forgets fast', 'is slow to anger but stubborn once angry', 'argues with words and sarcasm, then wants to talk it through', 'gets hurt, goes quiet and brings it up later', 'gets proud and needs a real apology', 'criticises and points out mistakes', 'avoids open conflict while resentment builds quietly', 'goes cold, remembers and needs honesty to forgive', 'says it bluntly, then moves on', 'controls anger and withdraws into work', 'detaches, goes cold and argues on principle', 'avoids conflict and may cry or escape'];
  const FAST = [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  const HOME = { fire: 'an active, spontaneous home life and going out often', earth: 'a tidy home, steady routines, good food and a fixed schedule', air: 'a sociable home with guests, conversation and flexible routines', water: 'a cosy, private nest and an emotional, family atmosphere' };
  const SOCIAL = { fire: 'outgoing — energised by people and events', air: 'sociable — loves conversation and many friends', earth: 'selective — prefers a few close friends and practical plans', water: 'private — prefers intimate company and time at home' };
  const CLOSE = [0, 1, -1, 1, 1, 0, 0, 1, -1, 0, -1, 1]; // 1 wants closeness / reassurance, -1 wants space
  const SX = () => JY.SX;
  const they = (t) => t.replace(/\byou\b/g, 'they').replace(/\byour\b/g, 'their').replace(/\byourself\b/g, 'themselves');
  const two = (t) => t.split(',').slice(0, 2).join(' and').trim();
  const pair = (a, b) => [EL(a), EL(b)].sort().join('+');
  const sameOrFriendly = (a, b) => { const p = pair(a, b); return EL(a) === EL(b) || p === 'air+fire' || p === 'earth+water'; };

  function areas(get, nA, nB) {
    const a = (k) => get('A', k), b = (k) => get('B', k);
    const rows = [];
    // money
    { const va = a('Venus'), vb = b('Venus'), sa = SAVER[va], sb = SAVER[vb];
      let t;
      if (sa === sb && sa === 1) t = 'You both like security, so money rarely causes fights. Remember to enjoy it too — plan a treat now and then.';
      else if (sa === sb && sa === -1) t = 'You both enjoy spending — great fun together, but nobody watches the budget. Set up an automatic savings transfer on payday.';
      else if (sa > sb) t = `${nA} is the more careful one and may feel anxious when ${nB} spends freely; ${nB} may feel ${nA} is too strict. For example, ${nA} checks the bank app after a weekend away while ${nB} is already planning the next one. Agree on a shared budget plus a personal allowance each of you can spend without explaining.`;
      else if (sb > sa) t = `${nB} is the more careful one and may feel anxious when ${nA} spends freely; ${nA} may feel ${nB} is too strict. For example, ${nB} checks the bank app after a weekend away while ${nA} is already planning the next one. Agree on a shared budget plus a personal allowance each of you can spend without explaining.`;
      else t = 'Your attitudes to money differ in style rather than in caution — talk about what each of you wants money for.';
      rows.push(['Money and spending', `${nA} ${MONEY[va]}.`, `${nB} ${MONEY[vb]}.`, t]); }
    // talking
    { const ma = a('Mercury'), mb = b('Mercury'), fa = ['fire', 'air'].includes(EL(ma)), fb = ['fire', 'air'].includes(EL(mb));
      const t = fa === fb ? (sameOrFriendly(ma, mb) ? 'You talk at the same speed and usually understand each other quickly.' : 'You talk at a similar speed, but about different things — one about ideas, the other about feelings or practical matters. Ask “do you want advice or just to be heard?”') : `${fa ? nA : nB} wants to sort things out right away, while ${fa ? nB : nA} needs time to think. For example, after a disagreement ${fa ? nA : nB} keeps texting while ${fa ? nB : nA} goes quiet. Agree on a short pause and a time to come back to it.`;
      rows.push(['Talking and disagreeing', `${nA} is ${TALK[ma]}.`, `${nB} is ${TALK[mb]}.`, t]); }
    // affection
    { const va = a('Venus'), vb = b('Venus');
      const t = va === vb ? 'You show love in the same way, so it is easy to feel loved by each other.' : sameOrFriendly(va, vb) ? 'Your ways of showing love are different but compatible. Notice the other’s way rather than waiting for yours.' : `You show love differently, so each of you can feel unloved while the other is trying hard. For example, ${nA} may plan ${LOVE[va].split(',')[0]} while ${nB} is really hoping for ${LOVE[vb].split(',')[0]}. Tell each other exactly what makes you feel loved.`;
      rows.push(['Affection and romance', `${nA} feels and shows love through ${LOVE[va]}.`, `${nB} feels and shows love through ${LOVE[vb]}.`, t]); }
    // conflict
    { const xa = a('Mars'), xb = b('Mars'), fa = FAST[xa], fb = FAST[xb];
      const t = fa && fb ? 'Arguments are loud but short — you both say it and move on. Avoid saying things in the heat of the moment that are hard to take back.' : !fa && !fb ? 'You both tend to avoid fights, so problems can pile up silently. Set aside a calm moment each week to say what bothers you.' : `${fa ? nA : nB} wants to argue it out now; ${fa ? nB : nA} withdraws or needs time — which can make ${fa ? nA : nB} push harder and ${fa ? nB : nA} pull away even more. Agree: a 20-minute break, then talk.`;
      rows.push(['Anger and conflict', `${nA} ${FIGHT[xa]}.`, `${nB} ${FIGHT[xb]}.`, t]); }
    // emotional needs
    { const oa = a('Moon'), ob = b('Moon');
      rows.push(['When one of you is upset', `When ${nA} is upset, ${they(SX()[oa].stress)}. What helps: ${SX()[oa].soothe}.`, `When ${nB} is upset, ${they(SX()[ob].stress)}. What helps: ${SX()[ob].soothe}.`, oa === ob ? 'You need the same things — and can both get low at the same time, so take turns being the strong one.' : `Comfort each other the way the other needs, not the way you would want: ${nA} needs ${two(SX()[oa].soothe)}; ${nB} needs ${two(SX()[ob].soothe)}.`]); }
    // home
    { const ea = EL(a('Moon')), eb = EL(b('Moon'));
      rows.push(['Home and daily routine', `${nA} feels at home with ${HOME[ea]}.`, `${nB} feels at home with ${HOME[eb]}.`, ea === eb ? 'You want the same kind of home, so daily life flows easily.' : `Expect small daily frictions — for example, ${['earth', 'water'].includes(ea) ? nA : nB} wants a quiet, ordered evening while ${['earth', 'water'].includes(ea) ? nB : nA} invites friends round or wants to go out. Agree on “home nights” and “out nights”.`]); }
    // social life
    { const ea = EL(a('Sun')), eb = EL(b('Sun')), xa = ['fire', 'air'].includes(ea), xb = ['fire', 'air'].includes(eb);
      rows.push(['Friends and social life', `${nA} is ${SOCIAL[ea]}.`, `${nB} is ${SOCIAL[eb]}.`, xa === xb ? (xa ? 'You both love going out — your calendar fills fast; protect time for just the two of you.' : 'You both prefer a small circle — cosy, but invite friends in now and then so you don’t become isolated.') : `${xa ? nA : nB} may want to stay at the party longer than ${xa ? nB : nA}. Arrive together and agree in advance when you will leave.`]); }
    // closeness
    { const ca = CLOSE[a('Venus')] + CLOSE[a('Moon')], cb = CLOSE[b('Venus')] + CLOSE[b('Moon')];
      rows.push(['Closeness and space', `${nA} ${ca > 0 ? 'wants a lot of closeness and reassurance' : ca < 0 ? 'needs plenty of personal space' : 'balances closeness and independence'}.`, `${nB} ${cb > 0 ? 'wants a lot of closeness and reassurance' : cb < 0 ? 'needs plenty of personal space' : 'balances closeness and independence'}.`, Math.abs(ca - cb) >= 2 ? `${ca > cb ? nA : nB} may feel ignored when ${ca > cb ? nB : nA} goes quiet or spends time alone, and ${ca > cb ? nB : nA} may feel smothered. A short daily check-in message solves most of this.` : 'Your needs for closeness are similar — neither of you will feel smothered or neglected.']); }
    return rows;
  }
  function areasHtml(get, nA, nB) {
    return `<section class="panel"><div class="ph"><h3>Your life together, in practice</h3></div>
      <p style="margin-top:0">What your charts suggest about everyday situations — money, arguments, affection and home — with concrete examples. These are tendencies to talk about, not fixed facts.</p>
      ${areas(get, nA, nB).map(([t, a, b, both]) => `<details class="rd"><summary><span class="rd-t">${t}</span><span class="rd-g">${both.split('. ')[0].replace(/\.$/, '')}.</span></summary><div class="rd-b"><ul class="facts"><li>${a}</li><li>${b}</li></ul><p><b>For the two of you:</b> ${both}</p></div></details>`).join('')}</section>`;
  }

  /* ---------- kootas in daily life ---------- */
  const VARNA_Q = { 4: 'what did we learn?', 3: 'did we have an adventure?', 2: 'did we spend wisely?', 1: 'did we help the family?' };
  const VARNA_FOCUS = { 4: 'what was learned or understood', 3: 'what was achieved or won', 2: 'what was earned or built', 1: 'who was helped and what got done' };
  function koota(x, nG, nB, gm, bm) {
    const v = x.v || {};
    switch (x.key) {
      case 'Varna': return v.vG === v.vB ? `You judge a good day the same way — by ${VARNA_FOCUS[v.vG]}.` : `${nG} judges a good day by ${VARNA_FOCUS[v.vG]}; ${nB} by ${VARNA_FOCUS[v.vB]}. For example, after a weekend ${nG} may ask “${VARNA_Q[v.vG]}” while ${nB} asks “${VARNA_Q[v.vB]}”. Value both.`;
      case 'Vashya': return x.pts >= 2 ? 'Decisions come naturally — you rarely fight over who chooses the restaurant or the holiday.' : x.pts >= 1 ? 'One of you naturally takes the lead in big choices (where to live, where to travel) and the other is mostly happy to follow — just check the follower really agrees.' : 'You both want to decide. Split the territory: for example, one handles money and paperwork, the other plans holidays and weekends.';
      case 'Tara': { const bad = [3, 5, 7]; const g = bad.includes(v.t1), b = bad.includes(v.t2); return !g && !b ? 'Being together tends to feel lucky and healthy for both of you — good things often happen when you do them together.' : `During ${g && b ? 'either of your' : g ? nG + '’s' : nB + '’s'} stressful periods the other may feel drained or unlucky too. Look after your own energy and don’t take each other’s bad days personally.`; }
      case 'Yoni': return ['Your physical rhythms differ a lot — for example, one wants affection in the morning, the other late at night, or one needs touch daily and the other less. Talk openly and kindly about it.', 'Your instincts differ — one may want more physical closeness or a different pace. Ask, don’t assume.', 'An ordinary physical fit: it grows with time, attention and good communication.', 'You feel comfortable with each other physically — sleeping, touching and relaxing together comes easily.', 'You are instinctively in tune — you often want the same things at the same time.'][x.pts];
      case 'Graha Maitri': return x.pts >= 4 ? 'You agree on most values — friends, family, how to spend free time — and enjoy simply talking.' : x.pts >= 3 ? 'You agree on the basics but see details differently; friendship deepens as you learn each other’s way of thinking.' : `You may see the world differently — politics, how to raise children, how to treat family. For example, ${nG} wants to plan the future carefully while ${nB} prefers to see what happens. Don’t try to convert each other; focus on shared goals.`;
      case 'Gana': return v.gG === v.gB ? 'You react at the same speed and intensity, so you rarely feel the other is overreacting or not caring.' : (v.gG === 'Rakshasa' || v.gB === 'Rakshasa') ? `${v.gG === 'Rakshasa' ? nG : nB} speaks up and confronts problems directly; ${v.gG === 'Rakshasa' ? nB : nG} prefers to keep the peace and can feel hurt by bluntness. Soft words from one, honest words from the other.` : `${v.gG === 'Deva' ? nG : nB} is gentler and more idealistic; ${v.gG === 'Deva' ? nB : nG} is more practical and worldly — together you balance dreams with reality.`;
      case 'Bhakoot': {
        const d = v.d; // bride’s Moon counted from groom’s
        const B2 = d === 2, B12 = d === 12;
        if (B2 || B12) { const spender = B12 ? nB : nG, saver = B12 ? nG : nB; return `${saver} tends to worry about the family budget and savings, while ${spender} spends or gives money away more easily — for example, ${spender} buys gifts or pays for friends while ${saver} counts what is left for rent. Keep money conversations calm and planned.`; }
        if (d === 6 || d === 8) { const s8 = d === 8 ? nB : nG, s6 = d === 8 ? nG : nB; return `${s8} may feel things more deeply or worry about health and security; ${s6} can come across as critical or busy with duties. Avoid keeping score — say thank you often.`; }
        if (d === 5 || d === 9) return 'You share humour, ideals and a love of learning; plans about children, faith or education may differ in the details — talk about them early.';
        if (d === 3 || d === 11) return 'You help each other reach goals — one encourages, the other gets things done.';
        if (d === 4 || d === 10) return `One of you tends to focus on home and family, the other on career and status — for example, ${nG} wants a promotion while ${nB} wants more evenings at home. Value both roles.`;
        if (d === 7) return 'Opposites attract — for example, one is a homebody and the other loves going out. You complete each other when you respect the difference.';
        return 'You have similar moods and needs — you understand each other instantly, but can also drag each other down on bad days. Take turns being the strong one.';
      }
      case 'Nadi': { const nm = ['restless (Vata) — irregular meals, light sleep, lots of ideas', 'fiery (Pitta) — strong appetite, quick temper, ambitious', 'calm (Kapha) — steady, slow to start, loves comfort']; return v.nG === v.nB ? `You share the same body rhythm: both ${nm[v.nG]}. That makes you understand each other, but you amplify the same imbalance — for example, both skipping meals and sleeping badly when stressed. Build shared healthy routines.` : `Your body rhythms balance each other: ${nG} is ${nm[v.nG]}; ${nB} is ${nm[v.nB]}. One steadies the other.`; }
      default: return '';
    }
  }

  /* ---------- partner’s planets in your houses ---------- */
  const AREA = ['self-image and looks', 'money, spending and family', 'daily chats, messages and siblings', 'home life and family', 'dates, fun, romance and children', 'chores, work routines and health', 'commitment and how you work as a couple', 'intimacy, shared money and trust', 'beliefs, travel and future plans', 'career and reputation', 'friends and long-term goals', 'private time, sleep and secrets'];
  const PL = { Sun: (x, o, a) => `${x} shines a light on ${o}’s ${a}; ${o} may admire ${x} here or feel a little overshadowed.`, Moon: (x, o, a) => `${o} feels emotionally at home with ${x} when it comes to ${a}; ${x} cares about this part of ${o}’s life.`, Mercury: (x, o, a) => `You talk, text and plan a lot about ${o}’s ${a}; ${x} gives advice here.`, Venus: (x, o, a) => `${x} makes ${o}’s ${a} sweeter — compliments, gifts and enjoyment; ${o} feels loved here.`, Mars: (x, o, a) => `${x} pushes ${o} into action around ${a} — motivating, but a common topic of arguments.`, Jupiter: (x, o, a) => `${x} encourages ${o} and brings growth or luck to ${a}.`, Saturn: (x, o, a) => `${x} makes ${o} more careful and serious about ${a} — supportive in the long run, but it can feel like criticism (for example, comments about how ${o} handles it).`, Rahu: (x, o, a) => `${x} brings excitement, ambition or the unusual into ${o}’s ${a}; it can feel addictive.`, Uranus: (x, o, a) => `${x} brings surprises and change into ${o}’s ${a} — exciting, sometimes unsettling.`, Ketu: (x, o, a) => `${x} brings a familiar, “known you before” feeling to ${o}’s ${a}, but sometimes distance or disinterest.`, Neptune: (x, o, a) => `${x} brings romance, dreams or confusion into ${o}’s ${a} — check facts, keep the magic.`, Pluto: (x, o, a) => `${x} has a deep, transforming effect on ${o}’s ${a}; watch for control or jealousy here.`, Node: (x, o, a) => `${x} feels fated in ${o}’s ${a}; together you grow in this area.`, ASC: (x, o, a) => `${x} feels very personal and noticeable in ${o}’s ${a}.` };
  const overlay = (key, h, nX, nO) => (PL[key] ? PL[key](nX, nO, AREA[h - 1]) : '');

  /* ---------- European contacts between the charts ---------- */
  const SYN = {
    'Mars-Venus': ['physical attraction comes easily — one pursues, the other enjoys being pursued', 'strong chemistry with friction — you may fight and make up passionately'],
    'Moon-Sun': ['one feels understood and supported, the other feels appreciated — like being on the same team', 'plans and feelings clash — for example, one wants to go out while the other needs a quiet evening at home'],
    'Moon-Moon': ['you feel at home together, with similar daily rhythms and moods', 'different emotional needs — one wants to talk it out, the other needs space'],
    'Mercury-Mercury': ['easy conversations, shared jokes and quick understanding', 'misunderstandings over words and details — “that’s not what I said”'],
    'Venus-Venus': ['similar taste in films, food, decor and dates', 'different ideas of romance and of what is worth spending money on'],
    'Mars-Mars': ['a great team for projects, sport and moving house', 'two strong wills — arguments over who decides and how fast'],
    'Sun-Sun': ['you respect each other’s goals and cheer each other on', 'competition for attention or different directions in life'],
    'Moon-Venus': ['small gestures mean a lot — one makes the other feel cherished', 'affection is there but not in the form the other hopes for'],
    'Sun-Venus': ['admiration and pleasure — you enjoy being seen together', 'taking each other for granted or arguing about style and spending'],
    'Mars-Moon': ['one energises and protects the other', 'one can hurt the other by being blunt; the other reacts emotionally'],
    'Mars-Sun': ['you motivate each other', 'competitive and quick to argue'],
    'Mercury-Moon': ['you can talk about feelings easily', 'one analyses feelings that the other just wants felt'],
    'Mercury-Venus': ['sweet words, compliments and flirting', 'words that sound cold to the other'],
  };
  const OUTER = { Saturn: ['brings stability and long-term commitment', 'can feel critical or restrictive — for example, commenting on how the other spends money or time'], Jupiter: ['encourages and believes in the other', 'pushes the other to overdo it or over-promise'], Uranus: ['brings excitement and fresh air', 'can feel unreliable — sudden changes of plan'], Neptune: ['brings romance and a spiritual connection', 'creates illusions — seeing what you wish to see'], Pluto: ['brings deep transformation', 'can bring jealousy or control issues'], Node: ['feels fated — you help each other grow', 'feels fated, sometimes uncomfortably so'], ASC: ['notices the other immediately — strong first attraction', 'notices the other immediately — sometimes rubbing them the wrong way'], MC: ['supports the other’s career and ambitions', 'can clash with the other’s ambitions'], Lilith: ['brings raw attraction', 'stirs jealousy or taboo desires'] };
  function syn(x, nA, nB) {
    const kind = W.ASP[x.type].kind, i = kind === 'soft' || kind === 'conj' ? 0 : 1;
    const key = [x.a, x.b].sort().join('-');
    if (SYN[key]) return WK.cap(SYN[key][i]) + '.';
    const outer = ['Pluto', 'Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Node', 'Lilith', 'ASC', 'MC'].find((k) => k === x.a || k === x.b);
    if (outer) { const who = outer === x.a ? nA : nB; return `${who}’s ${W.NAME[outer]} ${OUTER[outer][i]}.`; }
    return '';
  }
  return { areas, areasHtml, koota, overlay, syn, AREA };
})();
