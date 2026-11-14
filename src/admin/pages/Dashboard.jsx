import { Link } from 'react-router-dom';
import { adminApi } from '../api.js';
import { LoadState, PageHead, StatusBadge, ORDER_STATUSES, fmtDateTime, money, shortId, useLoad } from '../components/ui.jsx';

function Stat({ label, value, sub, to }) {
  const body = <><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</>;
  return to ? <Link to={to} className="a-stat">{body}</Link> : <div className="a-stat">{body}</div>;
}

function RevenueChart({ daily }) {
  const W = 640, H = 220, P = { t: 12, r: 8, b: 26, l: 8 };
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const bw = (W - P.l - P.r) / daily.length;
  const total = daily.reduce((s, d) => s + d.revenue, 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="a-chart" role="img" aria-label={`Revenue over the last 14 days: ${money(total)}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={P.l} x2={W - P.r} y1={P.t + (H - P.t - P.b) * (1 - f)} y2={P.t + (H - P.t - P.b) * (1 - f)} className="a-grid" />)}
        {daily.map((d, i) => {
          const h = ((H - P.t - P.b) * d.revenue) / max;
          const x = P.l + i * bw + bw * 0.18;
          return (
            <g key={d.date}>
              <rect x={x} y={H - P.b - h} width={bw * 0.64} height={Math.max(h, d.revenue ? 2 : 0)} rx="3" className="a-bar"><title>{`${d.date}: ${money(d.revenue)} · ${d.orders} order(s)`}</title></rect>
              {i % 2 === 1 && <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" className="a-axis">{d.date.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
      {total === 0 && <p className="a-muted a-center">No orders in the last 14 days yet.</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: s, loading, error, reload } = useLoad(adminApi.stats);
  return (
    <>
      <PageHead title="Dashboard" subtitle="Store performance at a glance."><button className="a-btn" onClick={reload}>Refresh</button></PageHead>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {s && <>
          <div className="a-stats">
            <Stat label="Revenue" value={money(s.revenue)} sub={`${money(s.paidRevenue)} paid`} />
            <Stat label="Orders" value={s.orders} sub={`${s.openOrders} open`} to="/admin/orders" />
            <Stat label="Customers" value={s.customers} to="/admin/customers" />
            <Stat label="Catalogue" value={`${s.books} books`} sub={`${s.authors} authors`} to="/admin/books" />
          </div>
          <div className="a-grid-2">
            <section className="a-card"><h2>Revenue · last 14 days</h2><RevenueChart daily={s.daily} /></section>
            <section className="a-card">
              <h2>Orders by status</h2>
              <ul className="a-list">{ORDER_STATUSES.map((st) => <li key={st}><StatusBadge value={st} /><strong>{s.statusCounts[st]}</strong></li>)}</ul>
            </section>
          </div>
          <div className="a-grid-3">
            <section className="a-card">
              <h2>Recent orders</h2>
              {s.recentOrders.length === 0 ? <p className="a-muted">No orders yet.</p> : <ul className="a-list">{s.recentOrders.map((o) => <li key={o.id}><div><Link to="/admin/orders" className="a-mono">#{shortId(o.id)}</Link><small>{o.customer.name} · {fmtDateTime(o.createdAt)}</small></div><div className="a-right"><strong>{money(o.total)}</strong><StatusBadge value={o.status} /></div></li>)}</ul>}
            </section>
            <section className="a-card">
              <h2>Top sellers</h2>
              {s.topBooks.length === 0 ? <p className="a-muted">Sales data appears after the first order.</p> : <ul className="a-list">{s.topBooks.map((b) => <li key={b.bookId}><span className="a-clip">{b.title}</span><strong>{b.units} sold</strong></li>)}</ul>}
            </section>
            <section className="a-card">
              <h2>Low stock <small className="a-muted">(≤ 5)</small></h2>
              {s.lowStock.length === 0 ? <p className="a-muted">All books are well stocked.</p> : <ul className="a-list">{s.lowStock.map((b) => <li key={b.id}><span className="a-clip">{b.title}</span><span className={'a-badge ' + (b.stock === 0 ? 'a-badge-red' : 'a-badge-amber')}>{b.stock === 0 ? 'Out of stock' : `${b.stock} left`}</span></li>)}</ul>}
            </section>
          </div>
        </>}
      </LoadState>
    </>
  );
}
