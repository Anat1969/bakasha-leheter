import { content } from '../content';
import { SourceLine } from '../components/common';

export default function Glossary({ onBack }: { onBack: () => void }) {
  return (
    <section className="stack-lg">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>מילון מונחים</h2>
        <button className="btn" onClick={onBack}>חזרה</button>
      </div>
      <dl className="gloss">
        {content.glossary.map((g) => (
          <div key={g.term}>
            <dt>{g.term}</dt>
            <dd className="stack">
              <span>{g.definition}</span>
              <SourceLine meta={g.meta} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
