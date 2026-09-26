# פרומפטים ל-Claude Code

העתיקו לפי הצורך. Claude Code קורא את `CLAUDE.md` אוטומטית.

## 0. התחלה
```
Read CLAUDE.md, README.md and docs/SPEC.md. Run npm install, npm test and npm run build.
Report what passes, then start the dev server and summarize the game flow in 5 lines. Do not change code yet.
```

## 1. שילוב אוגדן ההנחיות (אחרי שמעלים את ה-PDF לתיקייה docs/sources)
```
Read docs/sources/ogdan-29-09-2025.pdf. For each agency (roads/parking, trees, properties, drainage,
water, fire, home front command, environment, waste), extract the concrete planning requirements.
Update or add stations in src/content/stations.json following docs/CONTENT-GUIDE.md.
Every requirement must cite the section number in meta.note and set status "source" with the source.
Do not invent requirements. Add new agency ids to the relevant plots. Run npm test.
```

## 2. כרטיסי הערה של אדריכלית העיר (נספח א')
```
Read docs/sources/nispach-alef.pdf. Create a new deck "cityArchitect" in cards.json with one card per
design principle. When a player resolves station "design-plan", draw 3 cityArchitect cards; each card
is a mini-decision (address / ignore). Addressing raises city index; ignoring adds 1 month.
Extend types.ts, game.ts and tests. Keep the engine pure.
```

## 3. צמדים מתנגשים
```
Add a "conflict" card deck: each card names two agencies with competing demands and offers 3 design
solutions: one serves agency A, one serves agency B, one serves both at a higher cost. Only the
balanced solution raises city index. Add 4 conflict cards marked "rule" and tests.
```

## 4. מצב סדנה
```
Add a Workshop mode: full-screen board for a projector, 2-6 teams, a facilitator control bar
(next turn, reveal answer, pause), large type (min 28px), and a final results screen. Reuse the engine.
```

## 5. פריסה
```
Prepare the app for static hosting (Vercel or Netlify): verify vite base path, add a 404 fallback,
and write DEPLOY.md in Hebrew with the exact steps.
```
