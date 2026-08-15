// ============================================
// MAPKIT AUTH
// ============================================
// Generated via scripts/generate-mapkit-token.js — replace after running it.
// See the "Places Page" section in README.md for regeneration instructions.
const MAPKIT_JWT = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IkcyQlVOUVpaVFoiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiIzODc1TTk0M0I0IiwiaWF0IjoxNzg2ODE0MjU5LCJleHAiOjE4MTAxNDIyNTl9.X8LCYb8rma3lCFOTCs9BCcTHH1tQmdYrcGrSe8cvI1kLXbwwPJknCqqx40FL_eiSvRY2CuuQnWh-i4QUN81oAA'; // expires: 2027-05-12

// ============================================
// DARK MODE (copied from script.js — this page doesn't load script.js
// since its DOMContentLoaded handler wires up elements that don't exist here)
// ============================================

function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        html.classList.add('dark');
    }

    darkModeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (map) {
            map.colorScheme = isDark ? mapkit.Map.ColorSchemes.Dark : mapkit.Map.ColorSchemes.Light;
        }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            html.classList.toggle('dark', e.matches);
            if (map) {
                map.colorScheme = e.matches ? mapkit.Map.ColorSchemes.Dark : mapkit.Map.ColorSchemes.Light;
            }
        }
    });
}

// ============================================
// MAP
// ============================================

let map;
let allAnnotations = [];
const activeBuckets = new Set();

function initMap() {
    mapkit.init({
        authorizationCallback: (done) => done(MAPKIT_JWT)
    });

    map = new mapkit.Map('map-container', {
        colorScheme: document.documentElement.classList.contains('dark')
            ? mapkit.Map.ColorSchemes.Dark
            : mapkit.Map.ColorSchemes.Light,
        showsMapTypeControl: false
    });

    // MapKit auto-clusters any annotations sharing a clusteringIdentifier once
    // they'd overlap on screen, and re-clusters live as the map zooms/pans —
    // no manual bucketing by zoom level needed. This callback only styles the
    // cluster marker MapKit builds for us.
    map.annotationForCluster = (clusterAnnotation) => {
        const count = clusterAnnotation.memberAnnotations.length;
        clusterAnnotation.title = `${count} places`;
        clusterAnnotation.subtitle = ''; // clear MapKit's default "+N more" subtitle
        clusterAnnotation.color = '#2C2C2C';
        clusterAnnotation.glyphText = String(count);
        clusterAnnotation.calloutEnabled = false;
        clusterAnnotation.addEventListener('select', () => {
            map.showItems(clusterAnnotation.memberAnnotations, { animate: true });
        });
    };
}

const BUCKET_EMOJI = {
    Restaurants: '🍴',
    Cafe: '☕',
    Bar: '🍸',
    Shopping: '👔',
    Other: '📍'
};
const BUCKET_PRIORITY = ['Restaurants', 'Cafe', 'Bar', 'Shopping', 'Other'];

function glyphForPlace(place) {
    if (place.emoji) return place.emoji;
    const bucket = BUCKET_PRIORITY.find((b) => place.buckets.includes(b)) || 'Other';
    return BUCKET_EMOJI[bucket];
}

// A custom-element annotation (vs. the built-in MarkerAnnotation balloon)
// so the badge can be sized larger — these are Luke's picks, not generic
// map POIs, and should read as more prominent than Apple's own labels.
function createPlaceMarkerElement(place) {
    const el = document.createElement('div');
    el.className = 'place-marker';
    el.textContent = glyphForPlace(place);
    return el;
}

async function loadPlaces() {
    const res = await fetch('places.json');
    const places = await res.json();

    allAnnotations = places.map((place) => {
        const coordinate = new mapkit.Coordinate(place.lat, place.lng);
        const annotation = new mapkit.Annotation(coordinate, () => createPlaceMarkerElement(place), {
            title: place.name,
            calloutEnabled: false,
            clusteringIdentifier: 'place'
        });
        annotation.data = place;
        annotation.addEventListener('select', () => {
            window.open(place.mapsUrl, '_blank', 'noopener,noreferrer');
        });
        return annotation;
    });

    map.addAnnotations(allAnnotations);
    map.showItems(allAnnotations);

    renderChips(places);
}

// ============================================
// FILTER CHIPS
// ============================================

function chipClasses(active) {
    const base = 'px-4 py-1.5 rounded-full text-sm border transition-colors cursor-pointer';
    return active
        ? `${base} bg-charcoal text-ivory dark:bg-ivory dark:text-charcoal border-charcoal dark:border-ivory`
        : `${base} border-charcoal/20 dark:border-ivory/20 text-warm-gray hover:text-charcoal dark:hover:text-ivory`;
}

function applyFilters() {
    // Annotations are added/removed from the map (not just toggled via
    // `.visible`) because MapKit's clustering counts hidden-but-still-added
    // annotations too — leaving a filtered-out place invisible but still
    // padding a nearby cluster's number.
    const isMatch = (a) => activeBuckets.size === 0 || a.data.buckets.some((b) => activeBuckets.has(b));
    map.removeAnnotations(allAnnotations.filter((a) => !isMatch(a)));
    map.addAnnotations(allAnnotations.filter(isMatch));
}

function renderChips(places) {
    const counts = new Map();
    places.forEach((p) => p.buckets.forEach((b) => counts.set(b, (counts.get(b) || 0) + 1)));

    const orderedBuckets = [...counts.entries()]
        .filter(([b]) => b !== 'Other')
        .sort((a, b) => b[1] - a[1])
        .map(([b]) => b);
    if (counts.has('Other')) orderedBuckets.push('Other');

    const bar = document.getElementById('chip-bar');
    orderedBuckets.forEach((bucket) => {
        const chip = document.createElement('button');
        chip.textContent = `${bucket} (${counts.get(bucket)})`;
        chip.className = chipClasses(false);
        chip.addEventListener('click', () => {
            if (activeBuckets.has(bucket)) {
                activeBuckets.delete(bucket);
            } else {
                activeBuckets.add(bucket);
            }
            chip.className = chipClasses(activeBuckets.has(bucket));
            applyFilters();
        });
        bar.appendChild(chip);
    });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initMap();
    loadPlaces();
});
