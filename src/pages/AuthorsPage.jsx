import { useEffect, useState } from 'react';
import { AuthorCard } from '../components/Authors.jsx';
import { getAuthors } from '../services/api.js';
export default function AuthorsPage() {
  const [authors, setAuthors] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; getAuthors().then((data) => { if (active) setAuthors(data); }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <section className="page container"><h1 className="page-title">Authors</h1><p className="lead">The engineers and researchers behind the books on our shelf.</p>{loading ? <p className="empty">Loading authors…</p> : error ? <p className="empty" role="alert">{error} Make sure the API server is running.</p> : <div className="grid grid-3">{authors.map((author) => <AuthorCard key={author.id} author={author}/>)}</div>}</section>;
}
