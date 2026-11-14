import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, logout } from '../../services/auth.js';
import { Field } from '../components/ui.jsx';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { user } = await login(email, password);
      if (user.role !== 'admin') { await logout(); throw new Error('This account does not have administrator access.'); }
      onLogin(user);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/admin', { replace: true });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="a-fullstate">
      <form className="a-card a-narrow" onSubmit={submit}>
        <div className="a-brand" style={{ marginBottom: 18 }}><span className="a-brand-mark">{'</>'}</span><span>BookStack <em>Admin</em></span></div>
        <h1>Sign in</h1>
        <p className="a-muted">Administrator access only.</p>
        <Field label="Email"><input className="a-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
        <Field label="Password"><input className="a-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="a-error" role="alert">{error}</p>}
        <button className="a-btn a-btn-primary a-btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="a-muted a-center"><Link to="/">← Back to storefront</Link></p>
      </form>
    </div>
  );
}
