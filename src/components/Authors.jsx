
import { useEffect, useState } from "react";
import { getAuthors } from "../services/api";
import "../authors.css";

export function AuthorCard({ author }) {
    const [imageError, setImageError] = useState(false);

    const initials = author.name
        .split(" ")
        .map(word => word[0])
        .join("");

    return (
        <article className="author-card">
            <div className="author-image">
                {author.imageUrl && !imageError ? (
                    <img
                        src={author.imageUrl}
                        alt={author.name}
                        loading="lazy"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="author-placeholder">
                        {initials}
                    </div>
                )}
            </div>

            <div className="author-info">
                <h3>{author.name}</h3>
                <p>{author.bio}</p>

                {author.profileUrl && (
                    <a
                        href={author.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View profile ↗
                    </a>
                )}
            </div>
        </article>
    );
}

function Authors() {
    const [authors, setAuthors] = useState([]);

    useEffect(() => {
        getAuthors()
            .then(data => {
                setAuthors(data);
            })
            .catch(error => {
                console.error("Authors fetch error:", error);
            });
    }, []);

    return (
        <section className="authors-page">
            <div className="authors-header">
                <h1>Authors</h1>
                <p>
                    The engineers and researchers behind the books on our shelf.
                </p>
            </div>

            <div className="authors-grid">
                {authors.map(author => (
                    <AuthorCard key={author.id} author={author} />
                ))}
            </div>
        </section>
    );
}

export default Authors;
