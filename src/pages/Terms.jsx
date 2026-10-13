import { Link } from 'react-router-dom'
import { TERMS, TERMS_UPDATED } from '../lib/terms.js'

// The community rules. Open to everyone, signed in or not (the sign-up form links here).
export default function Terms() {
  return (
    <div className="narrow terms-page">
      <h1>Community rules</h1>
      <p className="muted small">Last updated {TERMS_UPDATED}. These are the house rules for our group. They are written in plain language and are not legal advice.</p>
      {TERMS.map(s => (
        <section key={s.title} className="card terms-section">
          <h2>{s.title}</h2>
          {s.body.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
      <p className="muted small"><Link to="/">Back to LOCK IN</Link></p>
    </div>
  )
}
