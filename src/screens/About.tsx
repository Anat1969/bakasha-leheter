import { content } from '../content';
import { STATUS_LABEL } from '../components/common';
import type { ContentStatus, Meta } from '../engine/types';

interface Row {
  kind: string;
  title: string;
  meta: Meta;
}

export default function About({ onBack }: { onBack: () => void }) {
  const rows: Row[] = [
    ...content.stations.map((s) => ({ kind: 'תחנה', title: s.title, meta: s.meta })),
    ...content.paths.map((p) => ({ kind: 'דרך', title: p.title, meta: p.meta })),
    ...content.cards.map((c) => ({ kind: 'כרטיס', title: c.title, meta: c.meta })),
  ];
  const count = (s: ContentStatus) => rows.filter((r) => r.meta.status === s).length;

  return (
    <section className="stack-lg">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>מקורות ואימות</h2>
        <button className="btn" onClick={onBack}>חזרה</button>
      </div>
      <p className="lead">
        כל פריט במשחק מסומן לפי רמת האמינות שלו. זו גרסת MVP: פריטים שממתינים לאימות יש לבדוק מול מחלקת הרישוי
        בעיריית אשדוד לפני שימוש ציבורי. אין לראות במשחק ייעוץ משפטי או תחליף לתיק המידע.
      </p>
      <div className="row">
        {(['verified', 'pending', 'illustrative'] as ContentStatus[]).map((s) => (
          <span key={s} className={`chip ${s}`}>
            {STATUS_LABEL[s]}: {count(s)}
          </span>
        ))}
      </div>
      <div className="table-wrap">
        <table className="src-table">
          <thead>
            <tr>
              <th>סוג</th>
              <th>פריט</th>
              <th>סטטוס</th>
              <th>מקור</th>
              <th>הערה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.kind}</td>
                <td>{r.title}</td>
                <td><span className={`chip ${r.meta.status}`}>{STATUS_LABEL[r.meta.status]}</span></td>
                <td>
                  {r.meta.sourceUrl ? (
                    <a href={r.meta.sourceUrl} target="_blank" rel="noreferrer">{r.meta.source ?? 'מקור'}</a>
                  ) : (
                    r.meta.source ?? '—'
                  )}
                </td>
                <td>{r.meta.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lead">
        בהשראת משחק הלוח "החבילה הגיעה" של אפרים קישון (1964). השם והמותג של המשחק המקורי שייכים לעיזבון.
      </p>
    </section>
  );
}
