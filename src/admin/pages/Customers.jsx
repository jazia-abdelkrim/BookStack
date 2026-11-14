import { useMemo, useState } from 'react';
import { adminApi } from '../api.js';
import { Badge, LoadState, PageHead, fmtDate, money, useLoad } from '../components/ui.jsx';

export default function Customers() {
  const customers = useLoad(adminApi.customers);
  const [q, setQ] = useState('');
  const list = customers.data || [];
  const shown = useMemo(() => list.filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())), [list, q]);
  return (
    <>
      <PageHead title="Customers" subtitle={`${list.length} registered accounts.`} />
      <div className="a-toolbar"><input className="a-input" type="search" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></div>
      <LoadState loading={customers.loading} error={customers.error} onRetry={customers.reload} empty={customers.data && !shown.length && 'No customers found.'}>
        {customers.data && <div className="a-card a-table-wrap"><table className="a-table">
          <thead><tr><th>Customer</th><th>Role</th><th>Joined</th><th className="a-num">Orders</th><th className="a-num">Total spent</th><th>Last order</th></tr></thead>
          <tbody>{shown.map((c) => (
            <tr key={c.id}>
              <td><div className="a-cell-media"><span className="a-avatar sm">{c.name.slice(0, 1).toUpperCase()}</span><div><strong>{c.name}</strong><small>{c.email}</small></div></div></td>
              <td><Badge tone={c.role === 'admin' ? 'violet' : 'gray'}>{c.role}</Badge></td>
              <td>{fmtDate(c.createdAt)}</td>
              <td className="a-num">{c.orderCount}</td>
              <td className="a-num">{money(c.totalSpent)}</td>
              <td>{fmtDate(c.lastOrderAt)}</td>
            </tr>))}
          </tbody></table></div>}
      </LoadState>
    </>
  );
}
