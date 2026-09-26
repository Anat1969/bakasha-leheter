interface Props {
  canContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
}

export default function Home({ canContinue, onNew, onContinue }: Props) {
  return (
    <section className="cover">
      <div className="stack">
        <span className="eyebrow">משחק לשיתוף ציבור · בהשראת "החבילה הגיעה" של אפרים קישון</span>
        <h1>בקשה להיתר</h1>
        <p className="lead">
          מחדר נוסף ועד בניין שלם: עוברים את הדרך מהחלום להיתר, תחנה אחר תחנה. אצל קישון כל מכשול היה אבסורד. כאן לכל
          מכשול יש סיבה, ומי שמבין אותה מתקדם מהר יותר.
        </p>
        <div className="row">
          <button className="btn primary" onClick={onNew}>
            משחק חדש
          </button>
          {canContinue && (
            <button className="btn" onClick={onContinue}>
              המשך משחק שמור
            </button>
          )}
        </div>
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

      <div className="sheet flat stack">
        <h3>איך משחקים</h3>
        <p>
          מטילים קובייה ומתקדמים במסלול. כל תחנה היא שער: עוצרים ועונים. תשובה נכונה מעבירה הלאה, טעות עולה בזמן.
          בדרך נשלפים כרטיסי אירוע, ידע ושכונה. מנצח מי שמגיע להיתר עם הציון הגבוה ביותר, והציון כולל גם את התרומה
          לרחוב ואת אמון השכנים. היתר טוב הוא לא רק היתר מהיר.
        </p>
      </div>
    </section>
  );
}
