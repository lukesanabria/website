// Pulls all visited places from the Notion "Directory" database and writes places.json.
// Usage: node --env-file=.env scripts/sync-places.js
// Requires NOTION_API_KEY (create an internal integration at notion.so/my-integrations,
// then share the "📍 Places" page with it).

const fs = require('fs');
const path = require('path');

const DATA_SOURCE_ID = '1babd595-22bc-4d1e-88e7-28c98cf2f0ca';
const NOTION_VERSION = '2025-09-03';

const RESTAURANT_TAGS = ['Restaurants', 'Dinner', 'Lunch', 'Breakfast', 'Pizza', 'Italian', 'Mexican', 'Japanese', 'American', 'Quick food', 'Takeout'];
const CAFE_TAGS = ['Coffee', 'Cafe', 'Pastries'];
const BAR_TAGS = ['Bar', 'Cocktail Bar', 'Sports Bar', 'Wine Bar', 'Drinks'];
const SHOPPING_TAGS = ['Shopping', 'Fashion', 'Menswear', 'Multi-brand'];

// Restaurants and Cafe are mutually exclusive (Luke's call). A handful of places
// are tagged with signals for both — resolved here by name pending his confirmation;
// anything not listed defaults to Cafe and gets a console warning so new ambiguous
// places surface on future syncs instead of silently picking a side.
const RESTAURANT_CAFE_OVERRIDES = {
    'Stratford Court Cafe': 'Restaurants',
    'Leon’s Bagels': 'Cafe',
    "Edith's Sandwich Counter": 'Cafe',
    'Dolce Delight': 'Cafe',
    'Hutch + Waldo': 'Cafe',
    'Win Son Bakery': 'Restaurants',
    'The Epicurean': 'Cafe',
    'Phoenicia Diner': 'Restaurants'
};

function bucketsForTags(tags, name) {
    const buckets = [];

    const isCafe = CAFE_TAGS.some((t) => tags.includes(t));
    const isRestaurant = RESTAURANT_TAGS.some((t) => tags.includes(t));

    if (isCafe && isRestaurant) {
        const resolved = RESTAURANT_CAFE_OVERRIDES[name];
        if (!resolved) {
            console.warn(`  ⚠ "${name}" is tagged as both Restaurant and Cafe signals — defaulting to Cafe. Add it to RESTAURANT_CAFE_OVERRIDES to change.`);
        }
        buckets.push(resolved || 'Cafe');
    } else if (isCafe) {
        buckets.push('Cafe');
    } else if (isRestaurant) {
        buckets.push('Restaurants');
    }

    if (BAR_TAGS.some((t) => tags.includes(t))) buckets.push('Bar');
    if (SHOPPING_TAGS.some((t) => tags.includes(t))) buckets.push('Shopping');

    return buckets.length ? buckets : ['Other'];
}

// A plain fetch() gets blocked/404s on Apple's short-link redirector without a browser UA.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

async function extractLatLng(mapsUrl) {
    if (!mapsUrl) return { error: 'missing Maps url' };
    if (!mapsUrl.includes('maps.apple.com') && !mapsUrl.includes('maps.apple/')) {
        return { error: 'non-Apple Maps link' };
    }

    const directMatch = mapsUrl.match(/[?&](?:ll|coordinate)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i);
    if (directMatch) {
        return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
    }

    // Newer maps.apple/p/... short links carry no coordinates in the URL itself —
    // resolve the redirect and read the destination page's Open Graph place meta tags.
    try {
        const res = await fetch(mapsUrl, { headers: { 'User-Agent': BROWSER_USER_AGENT } });
        if (!res.ok) return { error: `short-link resolve failed (HTTP ${res.status})` };
        const html = await res.text();
        const lat = html.match(/place:location:latitude"\s*content="(-?\d+(?:\.\d+)?)"/);
        const lng = html.match(/place:location:longitude"\s*content="(-?\d+(?:\.\d+)?)"/);
        if (!lat || !lng) return { error: 'no coordinates found after resolving short link' };
        return { lat: parseFloat(lat[1]), lng: parseFloat(lng[1]) };
    } catch (err) {
        return { error: `short-link resolve error: ${err.message}` };
    }
}

function titleText(page) {
    const prop = page.properties['Name'];
    return (prop?.title || []).map((t) => t.plain_text).join('').trim();
}

// Fetches every row unfiltered (Notion's server-side "Been?" filter was observed
// silently excluding rows whose checkbox reads true in every direct fetch — a
// stale-index quirk on Notion's end) and filters for Been?=true client-side.
//
// page_size is deliberately well under Notion's max of 100 — at 100, its cursor
// pagination was reproducibly dropping specific rows at page boundaries
// (confirmed by re-querying at several page sizes: the drop was consistent at
// 100 and consistently absent at 50/25/10). More requests, but reliable.
const PAGE_SIZE = 25;

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
                page_size: PAGE_SIZE,
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

    return results.filter((page) => page.properties['Been?']?.checkbox === true);
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

        const coords = await extractLatLng(mapsUrl);
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
            buckets: bucketsForTags(tags, name),
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
