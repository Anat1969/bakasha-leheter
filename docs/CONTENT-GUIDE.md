# מדריך תוכן

כל התוכן נמצא ב-`src/content/`. אפשר לערוך בלי לגעת בקוד. אחרי כל שינוי: `npm run check-content`.

## סטטוסים
| סטטוס | מתי | מוצג למשתמש |
|---|---|---|
| `verified` | מבוסס על מקור רשמי או מקצועי עדכני | "מאומת" |
| `pending` | מקור ישן (למשל אוגדן 2019), משני, או חסר פרט | "ממתין לאימות" |
| `illustrative` | תרחיש משחקי, לא טענה עובדתית | "תרחיש להמחשה" |

כלל: **אין מספר, מועד או דרישה בלי מקור.** אם אין — `pending` עם `note` שמסביר מה חסר.

## מבנה `meta`
```json
{ "status": "pending", "source": "שם המקור", "sourceUrl": "https://...", "dateChecked": "2026-09-25", "note": "מה לאמת" }
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
  "meta": { "status": "pending", "source": "...", "dateChecked": "..." }
}
```
כדי שתחנת גורם תופיע, הוסיפו את ה-`id` שלה ל-`agencies` של המגרשים הרלוונטיים ב-`plots.json`.

## הוספת כרטיס (`cards.json`)
חפיסות: `event`, `knowledge`, `neighborhood`, `responsibility`.
השפעות: `budget`, `months`, `trust`, `city`, `shields`. פעולה מיוחדת: `"action": "backToRegularTrack"`.
הגבלה לדרך: `"onlyPaths": ["murshe"]`.

## הוספת מגרש (`plots.json`)
כל שדות המגרש משפיעים על המשחק: `residentialPct`, `floors`, `units`, `controlInstitute`, `preservation`, `allOwnersSigned` קובעים את שער המורשה. `buildingAge` ו-`demolition` קובעים את דרך תיקון 160. `requiresDesignPlan` מוסיף תוכנית עיצוב ובינוי.

## רשימת אימות מול מחלקת הרישוי
1. אוגדן ההנחיות, גרסת 29-09-2025 — לעדכן את תחנות הגורמים (כבישים, נטיעות, נכסים, ניקוז, מים) ולהוסיף כבאות, פיקוד העורף, איכות הסביבה, אשפה.
2. נספח א' — "דגשים לעקרונות תכנון אדריכלי עירוני" — לבנות ממנו כרטיסי הערה לתחנת תוכנית עיצוב ובינוי.
3. זמן מסירת תיק מידע באשדוד: 45 או 30 ימי עבודה.
4. האם הסדר מורשה להיתר זהה באשדוד, והאם יש בקשות במסלול.
5. אילו סוגי בקשות באשדוד עוברים במכון בקרה.
6. ההנחיות המרחביות העדכניות.
7. רשימת נושאי הגמישות המדויקת בתקנות.
