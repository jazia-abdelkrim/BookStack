import { useEffect, useMemo, useState } from 'react';
import BookCard from '../components/BookCard.jsx';
import { getBooks } from '../services/api.js';
export default function Library() {
  const [q, setQ] = useState(''); const [tag, setTag] = useState('All');
  const [books, setBooks] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; getBooks().then((data) => { if (active) setBooks(data); }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const tags = useMemo(() => ['All', ...new Set(books.map((book) => book.category).filter(Boolean))], [books]);
  const list = useMemo(() => { const search = q.trim().toLowerCase(); return books.filter((book) => (tag === 'All' || book.category === tag) && (!search || `${book.title} ${book.authorName} ${book.description}`.toLowerCase().includes(search))); }, [books, q, tag]);
  return <section className="page container"><h1 className="page-title">Library</h1><p className="lead">Browse every title by skill, author or keyword.</p>
    <div className="toolbar"><input className="input" type="search" placeholder="Search title or author" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search books"/><div className="chips">{tags.map((item) => <button key={item} className={'chip' + (item === tag ? ' on' : '')} onClick={() => setTag(item)}>{item}</button>)}</div></div>
    {loading ? <p className="empty">Loading the library…</p> : error ? <p className="empty" role="alert">{error} Make sure the API server is running.</p> : list.length ? <div className="grid">{list.map((book) => <BookCard key={book.id} book={book}/>)}</div> : <p className="empty">No books match that search. Clear the filter or try another keyword.</p>}
  </section>;
}
