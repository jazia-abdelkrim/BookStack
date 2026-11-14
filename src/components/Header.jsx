import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { getStoredUser, logout, validateSession } from '../services/auth.js';

export default function Header() {
  const { count, setOpen } = useCart();
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();
  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    validateSession().then(setUser);
    window.addEventListener('auth-change', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('auth-change', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const link = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');
  async function handleLogout() {
    await logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  }
  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="BookStack home"><span className="brand-mark">{'</>'}</span><span className="brand-name">BookStack</span></Link>
      <nav className="nav" aria-label="Main navigation">
        <NavLink to="/" end className={link}>Home</NavLink><NavLink to="/library" className={link}>Library</NavLink><NavLink to="/authors" className={link}>Authors</NavLink>
      </nav>
      <div className="header-actions">
        {user ? <>{user.role === 'admin' && <Link to="/admin" className="nav-link hide-sm">Admin</Link>}<span className="nav-link hide-sm">Hi, {user.name.split(' ')[0]}</span><button className="nav-link hide-sm" onClick={handleLogout}>Sign out</button></> : <><Link to="/sign-in" className="nav-link hide-sm">Sign in</Link><Link to="/register" className="btn btn-dark btn-sm hide-sm">Register</Link></>}
        <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open cart, ${count} items`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.5L20 8H6"/><circle cx="10" cy="20.5" r="1"/><circle cx="17" cy="20.5" r="1"/></svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </div>
    </header>
  );
}
