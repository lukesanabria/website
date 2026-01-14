# Luke Sanabria - Personal Website

A modern, professional personal website showcasing projects, writing, and professional interests. Built with clean, maintainable code and optimized for performance.

## Features

- **Modern Design**: Clean, minimalist aesthetic with subtle luxury fashion influence
- **Dark Mode**: System preference detection with manual toggle
- **RSS Integration**: Automatically fetches and displays latest posts from Fantasy Futbol and Today in Menswear
- **Responsive**: Mobile-first design that works beautifully on all devices
- **Performance Optimized**: Fast Time to Interactive (< 2 seconds)
- **SEO Optimized**: Proper meta tags, Open Graph, and Schema.org markup
- **Accessible**: WCAG AA compliant with keyboard navigation support

## Tech Stack

- **HTML5**: Semantic elements for better accessibility and SEO
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Vanilla JavaScript**: No frameworks, keeping it simple and performant
- **RSS2JSON**: For fetching RSS feeds without CORS issues

## Project Structure

```
lukesanabria-website/
├── index.html          # Main HTML file
├── style.css           # Custom CSS beyond Tailwind
├── script.js           # JavaScript for RSS, dark mode, animations
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Key Sections

### Hero & About
Personal introduction with social links and professional background.

### Projects
- **Fantasy Futbol**: A fantasy soccer mobile game (in App Store final review)
- **Today in Menswear**: A menswear newsletter with multi-platform distribution

### Writing
Displays the 3 most recent posts from both newsletters using RSS feeds:
- Fantasy Futbol: https://fantasyfutbol.substack.com/feed
- Today in Menswear: https://rss.beehiiv.com/feeds/wWbdOQdMnB.xml

### Skills & Interests
Professional interests, personal hobbies, and technology stack.

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/lukesanabria/lukesanabria-website.git
   cd lukesanabria-website
   ```

2. **Open in browser**
   ```bash
   # Using Python's built-in server
   python -m http.server 8000

   # Or using Node.js
   npx serve
   ```

3. **Visit** `http://localhost:8000` in your browser

## Deployment

### Vercel (Recommended)

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy via GitHub** (recommended)
   - Push your code to GitHub
   - Visit https://vercel.com
   - Import your GitHub repository
   - Vercel will automatically deploy

3. **Deploy via CLI**
   ```bash
   vercel
   ```

4. **Configuration**
   Vercel will automatically detect this as a static site. No configuration needed!

### Netlify

1. **Deploy via GitHub**
   - Push your code to GitHub
   - Visit https://netlify.com
   - Connect your GitHub repository
   - Deploy automatically

2. **Deploy via drag-and-drop**
   - Visit https://app.netlify.com/drop
   - Drag your project folder
   - Done!

### GitHub Pages

1. **Enable GitHub Pages**
   - Go to repository Settings > Pages
   - Select branch (main) and folder (root)
   - Save

2. **Access your site**
   - Visit `https://lukesanabria.github.io/lukesanabria-website`

## Environment Variables

This project does not require any environment variables or API keys. All external services are accessed via public APIs:
- RSS2JSON (free tier: 10,000 requests/day)
- Google Fonts
- Tailwind CSS CDN

## RSS Feed Caching

The site implements sessionStorage caching for RSS feeds:
- **Cache Duration**: 1 hour
- **Benefits**: Reduces API calls and improves performance
- **Automatic**: Clears on browser close or after expiration

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Lazy loading for below-the-fold content
- RSS feed caching with sessionStorage
- Minimal external dependencies
- Optimized animations with CSS transforms
- Preconnect to external resources (Google Fonts)

## Accessibility Features

- Semantic HTML5 elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Sufficient color contrast (WCAG AA)
- Focus indicators on all interactive elements
- Reduced motion support for users with vestibular disorders

## SEO Features

- Meta tags (title, description, keywords)
- Open Graph tags for social sharing
- Twitter Card tags
- Schema.org Person and Organization markup
- Semantic HTML structure
- Alt text on images (when added)

## Future Enhancements

- [ ] Add favicon and apple-touch-icon images
- [ ] Implement contact form with Formspree integration
- [ ] Add blog section for personal writing
- [ ] Implement image optimization (WebP)
- [ ] Add analytics (privacy-friendly option like Plausible)
- [ ] Add RSS feed for personal blog posts
- [ ] Implement newsletter subscription forms inline

## License

© 2026 Luke Sanabria. All rights reserved.

## Contact

- Email: hello@lukesanabria.com
- LinkedIn: https://www.linkedin.com/in/lukesanabria/
- GitHub: https://github.com/lukesanabria

---

Built with ❤️ using HTML, Tailwind CSS, and Vanilla JavaScript.
