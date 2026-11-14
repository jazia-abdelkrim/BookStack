import { useEffect, useState } from 'react';
import { adminApi } from '../api.js';
import { LoadState, Modal, ORDER_STATUSES, PAYMENT_STATUSES, PageHead, StatusBadge, fmtDateTime, money, shortId, useLoad, useToast } from '../components/ui.jsx';

function OrderModal({ order, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function update(patch) {
    setBusy(true);
    try { const next = await adminApi.updateOrder(order.id, patch); toast('Order updated.'); onChanged(next); }
    catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={`Order #${shortId(order.id)}`} onClose={onClose} wide footer={<button className="a-btn" onClick={onClose}>Close</button>}>
      <div className="a-detail">
        <div><small>Customer</small><strong>{order.customer.name}</strong><span className="a-muted">{order.customer.email}</span></div>
        <div><small>Placed</small><strong>{fmtDateTime(order.createdAt)}</strong></div>
        <label><small>Order status</small><select className="a-input" disabled={busy} value={order.status} onChange={(e) => update({ status: e.target.value })}>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><small>Payment</small><select className="a-input" disabled={busy} value={order.paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value })}>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <table className="a-table a-lines">
        <thead><tr><th>Item</th><th className="a-num">Unit</th><th className="a-num">Qty</th><th className="a-num">Total</th></tr></thead>
        <tbody>{order.items.map((l) => <tr key={l.bookId}><td>{l.title}</td><td className="a-num">{money(l.unitPrice)}</td><td className="a-num">{l.quantity}</td><td className="a-num">{money(l.lineTotal)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={3}>Total</td><td className="a-num"><strong>{money(order.total)}</strong></td></tr></tfoot>
      </table>
      {order.status === 'cancelled' && <p className="a-muted">Cancelled orders return their items to stock.</p>}
    </Modal>
  );
}

export default function Orders() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(t); }, [search]);
  const orders = useLoad(() => adminApi.orders({ ...(status && { status }), ...(debounced && { search: debounced }) }), [status, debounced]);
  const list = orders.data || [];

  function changed(next) {
    setOpen(next);
    orders.setData(list.map((o) => (o.id === next.id ? next : o)));
  }

  return (
    <>
      <PageHead title="Orders" subtitle="Review orders and move them through fulfilment."><button className="a-btn" onClick={orders.reload}>Refresh</button></PageHead>
      <div className="a-toolbar">
        <input className="a-input" type="search" placeholder="Search order ID, name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <div className="a-chips">{['', ...ORDER_STATUSES].map((s) => <button key={s || 'all'} className={'a-chip' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>{s || 'All'}</button>)}</div>
      </div>
      <LoadState loading={orders.loading} error={orders.error} onRetry={orders.reload} empty={orders.data && !list.length && 'No orders found.'}>
        {orders.data && <div className="a-card a-table-wrap"><table className="a-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th className="a-num">Items</th><th className="a-num">Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
          <tbody>{list.map((o) => (
            <tr key={o.id}>
              <td className="a-mono">#{shortId(o.id)}</td>
              <td><strong>{o.customer.name}</strong><small>{o.customer.email}</small></td>
              <td>{fmtDateTime(o.createdAt)}</td>
              <td className="a-num">{o.items.reduce((s, l) => s + l.quantity, 0)}</td>
              <td className="a-num">{money(o.total)}</td>
              <td><StatusBadge value={o.status} /></td>
              <td><StatusBadge value={o.paymentStatus} /></td>
              <td className="a-actions"><button className="a-btn a-btn-sm" onClick={() => setOpen(o)}>Manage</button></td>
            </tr>))}
          </tbody></table></div>}
      </LoadState>
      {open && <OrderModal order={open} onClose={() => setOpen(null)} onChanged={changed} />}
    </>
  );
}
