# מדריך תוכן

כל התוכן נמצא ב-`src/content/`. אפשר לערוך בלי לגעת בקוד. אחרי כל שינוי: `npm run check-content`.

## תוויות
התוכן שייך למשחק. יש שתי תוויות בלבד:

| תווית | מתי | מוצג למשתמש |
|---|---|---|
| `source` | הפריט מבוסס על מקור, והמקור מצוין | "לפי מקור" |
| `rule` | כלל שנקבע לצורך המשחק: הדין אינו ודאי, או שזה תרחיש להמחשה | "חוק משחק" |

כלל: **אין מספר, מועד או דרישה בלי מקור.** אם אין מקור — `rule`, והפריט מנוסח ככלל משחק ולא כטענה על הדין.

## מבנה `meta`
```json
{ "status": "source", "source": "שם המקור", "sourceUrl": "https://...", "dateChecked": "2026-09-25", "note": "סעיף 2.2.4" }
```

## הוספת תחנה (`stations.json`)
```json
{
  "id": "agency-fire",
  "title": "שולחן כבאות",
  "kind": "question",            // question = תשובה נכונה אחת; decision = כמה בחירות לגיטימיות
  "category": "must",            // must | need | want | process
  "agency": "כבאות והצלה",
  "prompt": "השאלה",
  "options": [
    { "id": "a", "text": "...", "correct": true, "feedback": "..." },
    { "id": "b", "text": "...", "correct": false, "feedback": "...", "effects": { "months": 1 } }
  ],
  "why": "למה הדרישה קיימת — משפט או שניים",
  "baseMonths": 1,
  "meta": { "status": "source", "source": "...", "dateChecked": "..." }
}
```
כדי שתחנת גורם תופיע, הוסיפו את ה-`id` שלה ל-`agencies` של המגרשים הרלוונטיים ב-`plots.json`.

## הוספת כרטיס (`cards.json`)
חפיסות: `event`, `knowledge`, `neighborhood`, `responsibility`.
השפעות: `budget`, `months`, `trust`, `city`, `shields`. פעולה מיוחדת: `"action": "backToRegularTrack"`.
הגבלה לדרך: `"onlyPaths": ["murshe"]`.

## הוספת מגרש (`plots.json`)
כל שדות המגרש משפיעים על המשחק: `residentialPct`, `floors`, `units`, `controlInstitute`, `preservation`, `allOwnersSigned` קובעים את שער המורשה. `buildingAge` ו-`demolition` קובעים את דרך תיקון 160. `requiresDesignPlan` מוסיף תוכנית עיצוב ובינוי.

## מקורות שבתיקייה docs/sources
- `hanchayot-merhaviot-ed18.pdf` — הנחיות מרחביות לעיר אשדוד, מהדורה 18 (12/2024), נוסח להשגות הציבור. בסיס לתחנות העיצוב ולשאלון "צריך היתר?".
- `nispach-alef-design-principles.pdf` — נספח א', דגשים לעקרונות תכנון אדריכלי עירוני (07/2024). בסיס לכרטיסי "הערת אדריכלית העיר".
- `nispach-bet-source-guidelines.pdf` — נספח ב', הנחיות מקור (07/2024). כרטיסים כמותיים (תמהיל, עצים, חניה).
- לכל PDF יש קובץ `.txt` מחולץ לחיפוש מהיר.

## טבלת המקורות
`docs/sources-table.csv` (נפתחת באקסל) מרכזת כל פריט תוכן, את התווית שלו ואת המקור.
שימושית כשמעדכנים מקור: מחפשים בעמודת המקור ורואים אילו פריטים מושפעים.

נושאים שבהם התוכן מנוסח כ`rule` מפני שהדין אינו ודאי:
1. **הוראת השעה לממ"ד פטור מהיתר** — נקבעה ב-26.10.2023 לשנה, ותוקפה היום אינו ודאי.
2. **תחולת נספח ב'** — אם יתברר שההנחיות הכמותיות חלות ישירות על בקשה להיתר, אפשר להעביר ל`source`.

