import css from '../styles.css?raw';

/** DESIGN.md סעיף 10: כל משטח לחיצה בגודל 44×44 פיקסלים לפחות */
function block(selector: string): string {
  const i = css.indexOf(`\n${selector} {`);
  if (i < 0) throw new Error(`לא נמצא ${selector}`);
  return css.slice(i, css.indexOf('}', i));
}

describe('משטחי מגע', () => {
  it.each(['.btn', '.option', '.choice', '.filecard', '.disc-pick', '.masthead .brand'])('%s מגדיר גובה מינימלי 44', (sel) => {
    const m = block(sel).match(/min-height:\s*(\d+)px/);
    expect(m, `${sel} בלי min-height`).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(44);
  });

  it('גם כפתור רפאים, שמשמש בניווט העליון', () => {
    const m = css.match(/\.btn\.ghost \{[^}]*min-height:\s*(\d+)px/);
    expect(m).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(44);
  });
});
