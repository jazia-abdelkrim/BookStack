import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth.js';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/', { replace: true });
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <section className="page container auth">
      <h1 className="page-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <p className="lead">{isRegister ? 'Join the BookStack reading community.' : 'Sign in to continue to your BookStack account.'}</p>
      <form className="auth-form" onSubmit={submit}>
        {isRegister && <label>Full name<input className="input" autoComplete="name" maxLength={80} required value={form.name} onChange={update('name')} /></label>}
        <label>Email<input className="input" type="email" autoComplete="email" required value={form.email} onChange={update('email')} /></label>
        <label>Password<input className="input" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required value={form.password} onChange={update('password')} /></label>
        {error && <p className="form-msg" role="alert">{error}</p>}
        <button className="btn btn-dark btn-lg full" type="submit" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
        <p className="muted">{isRegister ? 'Already have an account? ' : 'New to BookStack? '}<Link className="text-link" to={isRegister ? '/sign-in' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
      </form>
    </section>
  );
}
