import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, logout, validateSession } from '../services/auth.js';
import { ToastProvider } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Books from './pages/Books.jsx';
import Authors from './pages/Authors.jsx';
import Orders from './pages/Orders.jsx';
import Customers from './pages/Customers.jsx';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { to: '/admin/orders', label: 'Orders', icon: 'M6 2h12l2 5H4l2-5zM4 7v13h16V7M9 12h6' },
  { to: '/admin/books', label: 'Books', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM8 7h7' },
  { to: '/admin/authors', label: 'Authors', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
  { to: '/admin/customers', label: 'Customers', icon: 'M16 11a3 3 0 1 0 0-6M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 14a5 5 0 0 1 4 5' },
];
const Icon = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

function Shell({ user }) {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  async function signOut() { await logout(); window.dispatchEvent(new Event('auth-change')); navigate('/admin/login'); }
  return (
    <div className="a-shell">
      <aside className={'a-side' + (menu ? ' open' : '')}>
        <Link to="/admin" className="a-brand" onClick={() => setMenu(false)}><span className="a-brand-mark">{'</>'}</span><span>BookStack <em>Admin</em></span></Link>
        <nav aria-label="Admin navigation">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={({ isActive }) => 'a-nav' + (isActive ? ' active' : '')}><Icon d={n.icon} />{n.label}</NavLink>)}
        </nav>
        <div className="a-side-foot">
          <Link to="/" className="a-nav" target="_blank" rel="noreferrer"><Icon d="M14 4h6v6M20 4l-9 9M10 6H5v13h13v-5" />View storefront</Link>
          <div className="a-user"><div className="a-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
          <button className="a-btn a-btn-block" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      {menu && <div className="a-scrim" onClick={() => setMenu(false)} />}
      <div className="a-main">
        <div className="a-topbar"><button className="a-icon-btn" onClick={() => setMenu(true)} aria-label="Open menu">☰</button><span className="a-brand-mark">{'</>'}</span><strong>BookStack Admin</strong></div>
        <main className="a-content">
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/books" element={<Books />} />
            <Route path="/admin/authors" element={<Authors />} />
            <Route path="/admin/customers" element={<Customers />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState(getStoredUser);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    validateSession().then((u) => { if (active) { setUser(u); setChecked(true); } });
    const kick = () => { setUser(null); navigate('/admin/login'); };
    window.addEventListener('admin-unauthorized', kick);
    return () => { active = false; window.removeEventListener('admin-unauthorized', kick); };
  }, [navigate]);

  const isLogin = pathname.replace(/\/$/, '') === '/admin/login';
  if (isLogin) return <ToastProvider><Login onLogin={setUser} /></ToastProvider>;
  if (!checked) return <div className="a-fullstate">Checking your session…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') {
    return (
      <div className="a-fullstate">
        <div className="a-card a-narrow">
          <h1>No admin access</h1>
          <p>You are signed in as {user.email}, which is not an administrator account.</p>
          <div className="a-row"><Link className="a-btn" to="/">Back to store</Link><button className="a-btn a-btn-primary" onClick={async () => { await logout(); setUser(null); navigate('/admin/login'); }}>Switch account</button></div>
        </div>
      </div>
    );
  }
  return <ToastProvider><Shell user={user} /></ToastProvider>;
}
