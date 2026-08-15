// Pulls visited NYC places from the Notion "Directory" database and writes places.json.
// Usage: node --env-file=.env scripts/sync-places.js
// Requires NOTION_API_KEY (create an internal integration at notion.so/my-integrations,
// then share the "📍 Places" page with it).

const fs = require('fs');
const path = require('path');

const DATA_SOURCE_ID = '1babd595-22bc-4d1e-88e7-28c98cf2f0ca';
const NOTION_VERSION = '2025-09-03';

const CATEGORY_RULES = {
    Restaurants: ['Restaurants', 'Dinner', 'Lunch', 'Breakfast', 'Pizza', 'Italian', 'Mexican', 'Japanese', 'American', 'Quick food', 'Takeout'],
    Bar: ['Bar', 'Cocktail Bar', 'Sports Bar', 'Wine Bar', 'Drinks'],
    'Coffee/Cafe': ['Coffee', 'Cafe', 'Pastries'],
    Shopping: ['Shopping', 'Fashion', 'Menswear', 'Multi-brand']
};

function bucketsForTags(tags) {
    const buckets = Object.entries(CATEGORY_RULES)
        .filter(([, tagList]) => tagList.some((t) => tags.includes(t)))
        .map(([bucket]) => bucket);
    return buckets.length ? buckets : ['Other'];
}

function extractLatLng(mapsUrl) {
    if (!mapsUrl) return { error: 'missing Maps url' };
    if (!mapsUrl.includes('maps.apple.com')) return { error: 'non-Apple Maps link' };
    const match = mapsUrl.match(/[?&](?:ll|coordinate)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i);
    if (!match) return { error: 'no ll= or coordinate= param found' };
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

function titleText(page) {
    const prop = page.properties['Name'];
    return (prop?.title || []).map((t) => t.plain_text).join('');
}

async function queryAllPages(apiKey) {
    const results = [];
    let cursor;

    do {
        const res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    and: [
                        { property: 'City/Town', select: { equals: 'NYC' } },
                        { property: 'Been?', checkbox: { equals: true } }
                    ]
                },
                page_size: 100,
                ...(cursor ? { start_cursor: cursor } : {})
            })
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Notion API error ${res.status}: ${body}`);
        }

        const data = await res.json();
        results.push(...data.results);
        cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    return results;
}

async function main() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
        console.error('Missing NOTION_API_KEY. Run with: node --env-file=.env scripts/sync-places.js');
        process.exit(1);
    }

    const pages = await queryAllPages(apiKey);

    const places = [];
    const skipped = [];
    const tagCounts = new Map();

    for (const page of pages) {
        const name = titleText(page);
        const mapsUrl = page.properties['Maps']?.url || null;
        const neighborhoods = (page.properties['Neighborhood']?.multi_select || []).map((o) => o.name);
        const tags = (page.properties['Tags']?.multi_select || []).map((o) => o.name);

        const coords = extractLatLng(mapsUrl);
        if (coords.error) {
            skipped.push({ name, reason: coords.error });
            continue;
        }

        tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));

        places.push({
            name,
            lat: coords.lat,
            lng: coords.lng,
            neighborhoods,
            tags,
            buckets: bucketsForTags(tags),
            mapsUrl
        });
    }

    const outPath = path.join(__dirname, '..', 'places.json');
    fs.writeFileSync(outPath, JSON.stringify(places, null, 2) + '\n');

    console.log(`Synced ${places.length} places, skipped ${skipped.length}.`);
    if (skipped.length) {
        console.log('Skipped:');
        skipped.forEach((s) => console.log(`  - ${s.name || '(untitled)'}: ${s.reason}`));
    }

    console.log('\nTag frequency (useful for tuning CATEGORY_RULES):');
    [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([tag, count]) => console.log(`  ${count}\t${tag}`));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
