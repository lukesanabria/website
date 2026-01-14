// ============================================
// DARK MODE FUNCTIONALITY
// ============================================

function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;

    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply initial theme
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        html.classList.add('dark');
    }

    // Toggle dark mode on button click
    darkModeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }
    });
}

// ============================================
// RSS FEED FETCHING AND PARSING
// ============================================

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// RSS feed URLs
const RSS_FEEDS = {
    ff: 'https://fantasyfutbol.substack.com/feed',
    tim: 'https://rss.beehiiv.com/feeds/wWbdOQdMnB.xml'
};

// Use RSS2JSON service as a CORS proxy (free tier: 10,000 requests/day)
function getRSSUrl(feedUrl) {
    return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
}

// Format date as "Jan 9, 2026"
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Truncate text to specified length
function truncateText(text, maxLength) {
    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
}

// Get cached feed or null if expired
function getCachedFeed(feedKey) {
    try {
        const cached = sessionStorage.getItem(feedKey);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp > CACHE_DURATION) {
            sessionStorage.removeItem(feedKey);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

// Cache feed data
function cacheFeed(feedKey, data) {
    try {
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        sessionStorage.setItem(feedKey, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error writing cache:', error);
    }
}

// Fetch RSS feed
async function fetchRSSFeed(feedKey, feedUrl) {
    // Check cache first
    const cached = getCachedFeed(feedKey);
    if (cached) {
        console.log(`Using cached data for ${feedKey}`);
        return cached;
    }

    try {
        const response = await fetch(getRSSUrl(feedUrl));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error('RSS feed returned error status');
        }

        // Cache the successful response
        cacheFeed(feedKey, data);

        return data;
    } catch (error) {
        console.error(`Error fetching ${feedKey} feed:`, error);
        throw error;
    }
}

// Create post card HTML
function createPostCard(post, color) {
    const title = post.title;
    const link = post.link;
    const pubDate = formatDate(post.pubDate);
    const description = truncateText(post.description || post.content || '', 150);

    return `
        <article class="post-card bg-ivory dark:bg-charcoal border border-charcoal/10 dark:border-ivory/10 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <h4 class="font-semibold text-lg mb-2 leading-tight">
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="hover:opacity-70 transition-opacity">
                    ${title}
                </a>
            </h4>
            <time class="text-sm text-warm-gray mb-3 block">${pubDate}</time>
            <p class="text-sm text-warm-gray mb-4 leading-relaxed">${description}</p>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="text-sm font-medium inline-flex items-center gap-1 hover:opacity-70 transition-opacity" style="color: ${color}">
                Read More →
            </a>
        </article>
    `;
}

// Display posts in the container
function displayPosts(containerId, posts, color) {
    const container = document.getElementById(containerId);

    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-warm-gray">
                No posts available at the moment.
            </div>
        `;
        return;
    }

    // Take only the first 3 posts
    const recentPosts = posts.slice(0, 3);

    // Create HTML for each post
    const postsHTML = recentPosts.map(post => createPostCard(post, color)).join('');

    // Fade in animation
    container.style.opacity = '0';
    container.innerHTML = postsHTML;

    setTimeout(() => {
        container.style.transition = 'opacity 0.5s ease-in';
        container.style.opacity = '1';
    }, 50);
}

// Display error message
function displayError(containerId, newsletterName, newsletterUrl) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="col-span-full text-center text-warm-gray">
            Unable to load posts.
            <a href="${newsletterUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-70 transition-opacity">
                Visit ${newsletterName} directly
            </a>
        </div>
    `;
}

// Load Fantasy Futbol posts
async function loadFantasyFutbolPosts() {
    try {
        const data = await fetchRSSFeed('ff-feed', RSS_FEEDS.ff);
        displayPosts('ff-posts', data.items, '#39FF14');
    } catch (error) {
        console.error('Failed to load Fantasy Futbol posts:', error);
        displayError('ff-posts', 'Fantasy Futbol', 'https://fantasyfutbol.substack.com/');
    }
}

// Load Today in Menswear posts
async function loadTodayInMenswearPosts() {
    try {
        const data = await fetchRSSFeed('tim-feed', RSS_FEEDS.tim);
        displayPosts('tim-posts', data.items, '#2C2C2C');
    } catch (error) {
        console.error('Failed to load Today in Menswear posts:', error);
        displayError('tim-posts', 'Today in Menswear', 'https://www.todayinmenswear.com/');
    }
}

// Load all RSS feeds
function loadAllFeeds() {
    loadFantasyFutbolPosts();
    loadTodayInMenswearPosts();
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-visible');
            }
        });
    }, observerOptions);

    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// SMOOTH SCROLL FOR NAVIGATION
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = document.querySelector('nav').offsetHeight;
                const targetPosition = targetElement.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// NAVIGATION BACKGROUND ON SCROLL
// ============================================

function initNavScroll() {
    const nav = document.querySelector('nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        } else {
            nav.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// INITIALIZE ALL FUNCTIONALITY
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Luke Sanabria website...');

    // Initialize features
    initDarkMode();
    initSmoothScroll();
    initScrollAnimations();
    initNavScroll();

    // Load RSS feeds
    loadAllFeeds();

    console.log('Website initialized successfully!');
});

// Handle page visibility changes (reload feeds when user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Check if cache is expired and reload if necessary
        const ffCached = getCachedFeed('ff-feed');
        const timCached = getCachedFeed('tim-feed');

        if (!ffCached) loadFantasyFutbolPosts();
        if (!timCached) loadTodayInMenswearPosts();
    }
});
