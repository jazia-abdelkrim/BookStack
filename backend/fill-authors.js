
import fs from "node:fs/promises";

const path = "./data/db.json";
const db = JSON.parse(await fs.readFile(path, "utf8"));

const authorsData = [
    ["Martin Kleppmann", "Researcher, distributed systems", "https://covers.openlibrary.org/a/olid/OL7477772A-M.jpg", ["ddia"]],
    ["Robert C. Martin", "Software craftsman", "https://covers.openlibrary.org/a/olid/OL2653686A-M.jpg", ["cc"]],
    ["Andrew Hunt", "Co-author of The Pragmatic Programmer", "https://www.amazon.in/Andrew-Hunt/e/B001HMRWA6", ["pp"]],
    ["David Thomas", "Co-author of The Pragmatic Programmer", "https://en.wikipedia.org/wiki/Dave_Thomas_(programmer)", ["pp"]],
    ["Harold Abelson", "MIT computer scientist and educator", "https://en.wikipedia.org/wiki/Hal_Abelson", ["sicp"]],
    ["Gerald Jay Sussman", "MIT professor and computer scientist", "https://www.computer.org/profiles/gerald-jay-sussman", ["sicp"]],
    ["Brian Kernighan", "Computer scientist and co-author of The C Programming Language", "https://covers.openlibrary.org/a/olid/OL946967A-M.jpg", ["kr"]],
    ["Dennis Ritchie", "Creator of the C programming language", "https://en.wikipedia.org/wiki/Dennis_Ritchie", ["kr"]],
    ["Eric Evans", "Domain-driven design pioneer", "", ["ddd"]],
    ["Erich Gamma", "Co-author of Design Patterns", "https://alchetron.com/Erich-Gamma", ["gof"]],
    ["Richard Helm", "Co-author of Design Patterns", "https://en.wikipedia.org/wiki/Richard_Helms", ["gof"]],
    ["Ralph Johnson", "Co-author of Design Patterns", "https://news.uchicago.edu/story/w-ralph-johnson-pre-eminent-uchicago-critic-latin-poetry-1933-2024", ["gof"]],
    ["John Vlissides", "Co-author of Design Patterns", "http://c2.com/ppr/wiki/ComponentDesignPatterns/JohnVlissides.html", ["gof"]],
    ["Thomas H. Cormen", "Co-author of Introduction to Algorithms", "https://web.cs.dartmouth.edu/news/2013/08/algorithm-ninth-century-term-21st-century-computing", ["clrs"]],
    ["Charles E. Leiserson", "Co-author of Introduction to Algorithms", "https://www.eecs.mit.edu/people/charles-leiserson/", ["clrs"]],
    ["Ronald L. Rivest", "Co-author of Introduction to Algorithms", "https://en.wikipedia.org/wiki/Ron_Rivest", ["clrs"]],
    ["Clifford Stein", "Co-author of Introduction to Algorithms", "https://ieor.columbia.edu/content/clifford-stein", ["clrs"]]
];

// Only these supplied URLs are direct image URLs.
const directImageAuthors = new Set([
    "Martin Kleppmann",
    "Robert C. Martin",
    "Brian Kernighan"
]);

const slug = name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

db.authors = authorsData.map(([name, bio, photo, bookIds]) => {
    const existing = db.authors?.find(
        author => author.name.toLowerCase() === name.toLowerCase()
    );

    return {
        id: existing?.id || `author-${slug(name)}`,
        name,
        bio,
        imageUrl: directImageAuthors.has(name) ? photo : "",
        profileUrl: directImageAuthors.has(name) ? "" : photo,
        bookIds
    };
});

await fs.writeFile(path, JSON.stringify(db, null, 2));

console.log(`Updated ${db.authors.length} authors successfully!`);
