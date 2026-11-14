import { useMemo, useState } from 'react';
import { adminApi } from '../api.js';
import { Badge, ConfirmModal, Field, LoadState, Modal, PageHead, money, useLoad, useToast } from '../components/ui.jsx';

const EMPTY = { title: '', authorId: '', category: '', description: '', coverUrl: '', publishedYear: '', price: '', stock: '', color: '#2f5bff' };

function BookForm({ book, authors, categories, onClose, onSaved }) {
  const [form, setForm] = useState(book ? { ...EMPTY, ...book, publishedYear: book.publishedYear ?? '' } : { ...EMPTY, authorId: authors[0]?.id || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await adminApi.saveBook({ ...form, price: Number(form.price), stock: Number(form.stock) }); toast(book ? 'Book updated.' : 'Book created.'); onSaved(); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={book ? 'Edit book' : 'Add book'} onClose={onClose} wide footer={<>
      <button type="button" className="a-btn" onClick={onClose}>Cancel</button>
      <button form="book-form" className="a-btn a-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save book'}</button>
    </>}>
      <form id="book-form" className="a-form" onSubmit={submit}>
        <Field label="Title"><input className="a-input" required maxLength={200} value={form.title} onChange={set('title')} /></Field>
        <div className="a-form-row">
          <Field label="Author"><select className="a-input" required value={form.authorId} onChange={set('authorId')}><option value="" disabled>Select an author</option>{authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Category"><input className="a-input" list="categories" maxLength={60} value={form.category} onChange={set('category')} /><datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
        </div>
        <div className="a-form-row three">
          <Field label="Price (DZD)"><input className="a-input" type="number" min="0" step="1" required value={form.price} onChange={set('price')} /></Field>
          <Field label="Stock"><input className="a-input" type="number" min="0" step="1" required value={form.stock} onChange={set('stock')} /></Field>
          <Field label="Year"><input className="a-input" type="number" min="1400" step="1" value={form.publishedYear} onChange={set('publishedYear')} /></Field>
        </div>
        <Field label="Cover image URL" hint="Optional. A direct https:// link to an image."><input className="a-input" type="url" value={form.coverUrl} onChange={set('coverUrl')} /></Field>
        <Field label="Description"><textarea className="a-input" rows={3} maxLength={2000} value={form.description} onChange={set('description')} /></Field>
        <Field label="Accent colour" hint="Used on the storefront when no cover image is available."><input className="a-input a-color" type="color" value={form.color} onChange={set('color')} /></Field>
        {error && <p className="a-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function Books() {
  const books = useLoad(adminApi.books);
  const authors = useLoad(adminApi.authors);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | book
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const list = books.data || [];
  const categories = useMemo(() => [...new Set(list.map((b) => b.category).filter(Boolean))].sort(), [list]);
  const shown = useMemo(() => list.filter((b) => (!cat || b.category === cat) && (!q || `${b.title} ${b.authorName}`.toLowerCase().includes(q.toLowerCase()))), [list, q, cat]);

  async function remove() {
    setBusy(true);
    try { await adminApi.deleteBook(deleting.id); toast('Book deleted.'); setDeleting(null); books.reload(); authors.reload(); }
    catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  }
  const saved = () => { setEditing(null); books.reload(); authors.reload(); };

  return (
    <>
      <PageHead title="Books" subtitle={`${list.length} titles in the catalogue.`}><button className="a-btn a-btn-primary" onClick={() => setEditing('new')} disabled={!authors.data?.length}>+ Add book</button></PageHead>
      <div className="a-toolbar">
        <input className="a-input" type="search" placeholder="Search title or author…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search books" />
        <select className="a-input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <LoadState loading={books.loading} error={books.error} onRetry={books.reload} empty={books.data && !shown.length && 'No books match your filters.'}>
        {books.data && <div className="a-card a-table-wrap"><table className="a-table">
          <thead><tr><th>Book</th><th>Category</th><th className="a-num">Price</th><th className="a-num">Stock</th><th /></tr></thead>
          <tbody>{shown.map((b) => (
            <tr key={b.id}>
              <td><div className="a-cell-media">{b.coverUrl ? <img src={b.coverUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="a-swatch" style={{ background: b.color }} />}<div><strong>{b.title}</strong><small>{b.authorName}{b.publishedYear ? ` · ${b.publishedYear}` : ''}</small></div></div></td>
              <td>{b.category ? <Badge>{b.category}</Badge> : '—'}</td>
              <td className="a-num">{money(b.price)}</td>
              <td className="a-num"><Badge tone={b.stock === 0 ? 'red' : b.stock <= 5 ? 'amber' : 'green'}>{b.stock}</Badge></td>
              <td className="a-actions"><button className="a-btn a-btn-sm" onClick={() => setEditing(b)}>Edit</button><button className="a-btn a-btn-sm a-btn-danger-o" onClick={() => setDeleting(b)}>Delete</button></td>
            </tr>))}
          </tbody></table></div>}
      </LoadState>
      {editing && authors.data && <BookForm book={editing === 'new' ? null : editing} authors={authors.data} categories={categories} onClose={() => setEditing(null)} onSaved={saved} />}
      {deleting && <ConfirmModal title="Delete book" message={`Delete “${deleting.title}”? This cannot be undone. Past orders keep their line items.`} busy={busy} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </>
  );
}
