import { useMemo, useState } from 'react';
import { adminApi } from '../api.js';
import { ConfirmModal, Field, LoadState, Modal, PageHead, useLoad, useToast } from '../components/ui.jsx';

const EMPTY = { name: '', bio: '', imageUrl: '', profileUrl: '' };

function AuthorForm({ author, onClose, onSaved }) {
  const [form, setForm] = useState(author ? { ...EMPTY, ...author } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await adminApi.saveAuthor(form); toast(author ? 'Author updated.' : 'Author created.'); onSaved(); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={author ? 'Edit author' : 'Add author'} onClose={onClose} footer={<>
      <button type="button" className="a-btn" onClick={onClose}>Cancel</button>
      <button form="author-form" className="a-btn a-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save author'}</button>
    </>}>
      <form id="author-form" className="a-form" onSubmit={submit}>
        <Field label="Name"><input className="a-input" required maxLength={120} value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Short bio"><textarea className="a-input" rows={2} maxLength={500} value={form.bio} onChange={set('bio')} /></Field>
        <Field label="Photo URL" hint="Optional. Direct https:// link to an image."><input className="a-input" type="url" value={form.imageUrl} onChange={set('imageUrl')} /></Field>
        <Field label="Profile link" hint="Optional. Website or Wikipedia page."><input className="a-input" type="url" value={form.profileUrl} onChange={set('profileUrl')} /></Field>
        {error && <p className="a-error" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function Authors() {
  const authors = useLoad(adminApi.authors);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const list = authors.data || [];
  const shown = useMemo(() => list.filter((a) => !q || `${a.name} ${a.bio}`.toLowerCase().includes(q.toLowerCase())), [list, q]);

  async function remove() {
    setBusy(true);
    try { await adminApi.deleteAuthor(deleting.id); toast('Author deleted.'); setDeleting(null); authors.reload(); }
    catch (e) { toast(e.message, 'err'); setDeleting(null); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHead title="Authors" subtitle={`${list.length} authors.`}><button className="a-btn a-btn-primary" onClick={() => setEditing('new')}>+ Add author</button></PageHead>
      <div className="a-toolbar"><input className="a-input" type="search" placeholder="Search authors…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search authors" /></div>
      <LoadState loading={authors.loading} error={authors.error} onRetry={authors.reload} empty={authors.data && !shown.length && 'No authors found.'}>
        {authors.data && <div className="a-card a-table-wrap"><table className="a-table">
          <thead><tr><th>Author</th><th>Bio</th><th className="a-num">Books</th><th /></tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id}>
              <td><div className="a-cell-media">{a.imageUrl ? <img className="round" src={a.imageUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="a-avatar sm">{a.name.slice(0, 1)}</span>}<strong>{a.name}</strong></div></td>
              <td className="a-muted a-clamp">{a.bio || '—'}</td>
              <td className="a-num">{a.bookIds.length}</td>
              <td className="a-actions"><button className="a-btn a-btn-sm" onClick={() => setEditing(a)}>Edit</button><button className="a-btn a-btn-sm a-btn-danger-o" onClick={() => setDeleting(a)}>Delete</button></td>
            </tr>))}
          </tbody></table></div>}
      </LoadState>
      {editing && <AuthorForm author={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); authors.reload(); }} />}
      {deleting && <ConfirmModal title="Delete author" message={deleting.bookIds.length ? `“${deleting.name}” still has ${deleting.bookIds.length} book(s). Reassign or delete those first.` : `Delete “${deleting.name}”? This cannot be undone.`} busy={busy} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </>
  );
}
