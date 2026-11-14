import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { createOrder } from '../services/api.js';
import { getStoredUser } from '../services/auth.js';
export default function CartDrawer() {
  const { open, setOpen, lines, total, inc, dec, remove, clear } = useCart();
  const [message, setMessage] = useState(''); const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const onKey = (event) => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [setOpen]);
  useEffect(() => { if (!open) setMessage(''); }, [open]);
  async function checkout() {
    if (!getStoredUser()) { setOpen(false); navigate('/sign-in'); return; }
    setSubmitting(true); setMessage('');
    try {
      const result = await createOrder(lines.map(({ book, qty }) => ({ bookId: book.id, quantity: qty })));
      setMessage(`${result.message} Order #${result.order.id.slice(0, 8)}.`); clear();
    } catch (error) { setMessage(error.message); }
    finally { setSubmitting(false); }
  }
  return <>
    <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)}/>
    <aside className={'drawer' + (open ? ' open' : '')} aria-hidden={!open} aria-label="Cart">
      <div className="drawer-head"><h2>Your cart</h2><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close cart">×</button></div>
      <div className="drawer-body">{message && <p className="form-msg" role="status">{message}</p>}{lines.length === 0 ? <p className="empty">Your cart is empty. Add a book from the library.</p> : lines.map(({ book, qty }) => <div className="line" key={book.id}><span className="line-swatch" style={{ background: book.color || '#344054' }}/><div className="line-info"><strong>{book.title}</strong><span className="muted">{Number(book.price || 0).toLocaleString()} DZD each</span><div className="qty"><button onClick={() => dec(book.id)} aria-label="Decrease quantity">−</button><span>{qty}</span><button onClick={() => inc(book)} aria-label="Increase quantity">+</button><button className="text-link remove" onClick={() => remove(book.id)}>Remove</button></div></div><span className="price">{(Number(book.price || 0) * qty).toLocaleString()} DZD</span></div>)}</div>
      {lines.length > 0 && <div className="drawer-foot"><div className="total"><span>Subtotal</span><strong>{total.toLocaleString()} DZD</strong></div><button className="btn btn-dark btn-lg full" onClick={checkout} disabled={submitting}>{submitting ? 'Submitting…' : getStoredUser() ? 'Place order request' : 'Sign in to continue'}</button><p className="muted">Demo MVP: no online payment is collected.</p></div>}
    </aside>
  </>;
}
