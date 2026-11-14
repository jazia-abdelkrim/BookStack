import BookCover from './BookCover.jsx';
import { useCart } from '../context/CartContext.jsx';
export default function BookCard({ book }) {
  const { add } = useCart();
  const viewBook = { ...book, author: book.author || book.authorName, coverImage: book.coverImage || book.coverUrl, skill: book.skill || book.category || 'Technology', blurb: book.blurb || book.description || '' };
  return <article className="book-card">
    <BookCover book={viewBook} />
    <div className="book-info"><h3>{viewBook.title}</h3><p className="muted">{viewBook.author}</p><p className="book-blurb">{viewBook.blurb}</p>
      <div className="book-foot"><span className="price">{Number(viewBook.price || 0).toLocaleString()} DZD</span><button className="btn btn-outline btn-sm" onClick={() => add(viewBook)}>Add to cart</button></div>
    </div>
  </article>;
}
