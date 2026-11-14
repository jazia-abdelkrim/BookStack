
import fs from "node:fs/promises";

const DB_PATH = "./data/db.json";
const db = JSON.parse(await fs.readFile(DB_PATH, "utf8"));

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

for (const author of db.authors) {
    if (author.imageUrl) {
        console.log(`Already has image: ${author.name}`);
        continue;
    }

    try {
        // Search for the author
        const searchUrl =
            `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(author.name)}&limit=5`;

        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        const match = searchData.docs?.find(
            item => normalize(item.name) === normalize(author.name)
        );

        if (!match) {
            console.log(`No matching record: ${author.name}`);
            continue;
        }

        // Get the author's photo IDs
        const detailsResponse = await fetch(
            `https://openlibrary.org${match.key}.json`
        );

        const details = await detailsResponse.json();
        const photoId = details.photos?.find(id => id > 0);

        if (!photoId) {
            console.log(`No portrait available: ${author.name}`);
            continue;
        }

        author.imageUrl =
            `https://covers.openlibrary.org/b/id/${photoId}-L.jpg`;

        console.log(`Image added: ${author.name}`);

        await sleep(1100);
    } catch (error) {
        console.error(`Error for ${author.name}:`, error.message);
    }
}

await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));

console.log("Author image update completed!");
