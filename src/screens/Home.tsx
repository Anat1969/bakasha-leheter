interface Props {
  canContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
  onQuiz: () => void;
}

/** שלושת הצעדים, לפי DESIGN.md סעיף 8 פריט 1 */
const STEPS = [
  { n: '1', t: 'בוחרים מה בונים', d: 'תוספת, בית, בניין או ממ"ד. כל מסלול והמגרש שלו.' },
  { n: '2', t: 'עוברים תחנה אחר תחנה', d: 'מטילים קובייה. בכל תחנה עונים, ולומדים למה היא קיימת.' },
  { n: '3', t: 'מגיעים להיתר', d: 'הציון סופר גם את הרחוב, לא רק את המהירות.' },
];

export default function Home({ canContinue, onNew, onContinue, onQuiz }: Props) {
  return (
    <section className="stack-lg">
      {/* מכסה הקופסה */}
      <div className="boxlid">
        <LidArt />
        <div className="lid-text">
          <span className="eyebrow">משחק לשיתוף ציבור · בהשראת "החבילה הגיעה" של אפרים קישון</span>
          <h1>בקשה להיתר</h1>
          <p className="lead">
            מחדר נוסף ועד בניין שלם. אצל קישון כל מכשול היה אבסורד. כאן לכל מכשול יש סיבה, ומי שמבין אותה מתקדם מהר
            יותר.
          </p>
          <div className="row lid-actions">
            <button className="btn primary" onClick={onNew}>
              משחק חדש
            </button>
            <button className="btn" onClick={onQuiz}>
              צריך היתר?
            </button>
            {canContinue && (
              <button className="btn" onClick={onContinue}>
                המשך
              </button>
            )}
          </div>
          <p className="disclaimer">המשחק מלמד עקרונות. לפני בנייה בודקים את תיק המידע של המגרש.</p>
        </div>
      </div>

      {/* איך משחקים — שלושה צעדים */}
      <div className="steps">
        {STEPS.map((s) => (
          <div className="step" key={s.n}>
            <span className="step-n">{s.n}</span>
            <div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="triad">
        <div className="sheet flat">
          <span className="chip must">חובה</span>
          <h3>מה שהחוק מחייב</h3>
          <p>תב"ע, קווי בניין, בטיחות, מיגון ותשלומי חובה. אין עליהם משא ומתן.</p>
        </div>
        <div className="sheet flat">
          <span className="chip need">צריך</span>
          <h3>מה שהעיר צריכה</h3>
          <p>הצללה, ניקוז, חזית לרחוב וגישה בטוחה. כך בניין אחד משפר את כל הרחוב.</p>
        </div>
        <div className="sheet flat">
          <span className="chip want">רוצים</span>
          <h3>מה שאתם חולמים עליו</h3>
          <p>מרפסת, קומה, חדר נוסף. כל חלום מוסיף ערך, וגם סיכון וזמן.</p>
        </div>
      </div>
    </section>
  );
}

/** רחוב וים, מופשט. רמז לעיר חוף — לא מפה. */
function LidArt() {
  return (
    <svg className="lid-art" viewBox="0 0 420 260" role="img" aria-label="איור מופשט של רחוב מול הים">
      <rect x="0" y="0" width="420" height="260" className="la-sky" />
      {/* הים מימין, כמו בלוח המשחק */}
      <g transform="translate(420, 0) scale(-1, 1)">
        <rect x="0" y="0" width="86" height="260" className="la-sea" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M 8 ${34 + i * 52} q 17 -11 34 0 t 34 0`} className="la-wave" />
        ))}
        <rect x="86" y="0" width="22" height="260" className="la-sand" />
      </g>
      {/* רחוב: שורת מבנים בגבהים משתנים, ועצים בין הבתים */}
      <g className="la-street">
        <rect x="120" y="150" width="54" height="110" rx="2" />
        <rect x="186" y="96" width="64" height="164" rx="2" />
        <rect x="262" y="132" width="48" height="128" rx="2" />
        <rect x="322" y="74" width="74" height="186" rx="2" />
      </g>
      <g className="la-windows">
        {[
          [132, 168],
          [152, 168],
          [132, 196],
          [198, 116],
          [222, 116],
          [198, 148],
          [222, 148],
          [274, 152],
          [292, 152],
          [336, 96],
          [362, 96],
          [336, 132],
          [362, 132],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="13" height="17" rx="1" />
        ))}
      </g>
      <g className="la-trees">
        {[176, 254, 314].map((x, i) => (
          <g key={i} transform={`translate(${x}, 236)`}>
            <rect x="-2" y="0" width="4" height="22" className="la-trunk" />
            <circle cx="0" cy="-6" r="14" className="la-canopy" />
          </g>
        ))}
      </g>
      <rect x="108" y="248" width="312" height="12" className="la-road" />
    </svg>
  );
}
