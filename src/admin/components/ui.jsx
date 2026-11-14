import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export const money = (n) => `${Number(n || 0).toLocaleString()} DZD`;
export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const shortId = (id) => String(id).slice(0, 8).toUpperCase();
export const ORDER_STATUSES = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];

/** Load data on mount / when deps change. Returns { data, loading, error, reload, setData } */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try { setState({ data: await fnRef.current(), loading: false, error: '' }); }
    catch (error) { setState((s) => ({ ...s, loading: false, error: error.message })); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`a-badge a-badge-${tone}`}>{children}</span>;
}
const STATUS_TONE = { received: 'blue', processing: 'amber', shipped: 'violet', delivered: 'green', cancelled: 'red', unpaid: 'amber', paid: 'green', refunded: 'gray' };
export const StatusBadge = ({ value }) => <Badge tone={STATUS_TONE[value] || 'gray'}>{value}</Badge>;

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="a-modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'a-modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="a-modal-head"><h2>{title}</h2><button className="a-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="a-modal-body">{children}</div>
        {footer && <div className="a-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = 'Delete', busy, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="a-btn" onClick={onClose}>Cancel</button>
      <button className="a-btn a-btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>
      <p>{message}</p>
    </Modal>
  );
}

export function Field({ label, hint, children }) {
  return <label className="a-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function PageHead({ title, subtitle, children }) {
  return <div className="a-pagehead"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="a-pagehead-actions">{children}</div></div>;
}

export function LoadState({ loading, error, onRetry, empty, children }) {
  if (loading && !children) return <div className="a-state">Loading…</div>;
  if (error) return <div className="a-state a-state-error" role="alert">{error} <button className="a-link" onClick={onRetry}>Try again</button></div>;
  if (empty) return <div className="a-state">{empty}</div>;
  return children;
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return <ToastCtx.Provider value={push}>{children}<div className="a-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`a-toast ${t.tone}`}>{t.message}</div>)}</div></ToastCtx.Provider>;
}
