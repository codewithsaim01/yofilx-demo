# Yoflix Nova — static website

A standalone HTML/CSS/JavaScript copy of the Yoflix Nova theme. No PHP, Laravel, database,
Node server or build step is needed: upload the folder as-is to any static host.

## Structure

```
index.html                     Home
about/  services/  ebay-business-plans/  contact/  faqs/  privacy-policy/
services/<service>/            One page per service (5)
assets/
  css/base.css                 Reset + CSS variables the theme was built on
  css/fonts.css                Self-hosted Inter + Plus Jakarta Sans
  css/style.css                The theme (layout, components, animations and responsive rules)
  css/contact.css              Contact page only
  js/main.js                   Theme interactions + static-site layer (forms, assistant)
  fonts/                       Font files (woff2)
  images/                      Favicon, touch icon, social share image
  vendor/fontawesome/          Font Awesome 6.7.2 (free licence, see LICENSE.txt)
  vendor/jsvectormap/          jsvectormap 1.6.0 + world map (MIT) for the "Our Global Footprint" map,
                               loaded by main.js only when the map scrolls near the screen
```

Each page lives in its own folder as `index.html`, so URLs stay clean (`/about/`, `/services/`)
on every host, and all links and asset paths are relative.

Responsive rules sit next to the components they belong to inside `style.css` (as in the original
theme); moving them into a separate file would change which rules win and break the layout.

## What works without a backend

| Feature | Static behaviour |
| --- | --- |
| Navigation, mobile menu, sticky header, smooth scrolling | Unchanged (vanilla JS) |
| Reveal/count-up animations, testimonials marquee, FAQ accordion, FAQ search & topics, service filters, plan billing switch | Unchanged (vanilla JS) |
| Contact form | Netlify Forms on Netlify; on other hosts it shows the email address to write to instead |
| Assistant ("Ask YOFLIX") | Demo assistant: answers from the FAQ and Services pages of this site; "Send inquiry" uses Netlify Forms like the contact form |
| Plan "Book Consultation" → contact form | The chosen plan is kept as the message subject (`?plan=` in the link) |

## Before going live

- **Testimonials:** the cards in "What Our Clients Say" are sample content for testing, not real
  client reviews. Replace them with real reviews (search the HTML files for `nova-quote-card`) or remove the section.
- **Search engines:** pages carry `<meta name="robots" content="noindex,nofollow">`, copied from the CMS
  setting. Remove that tag from every page when you want the site indexed.
- **Meta description:** the homepage description says it is placeholder demo content; update it.

## Deploy

### Netlify
1. Netlify → **Add new site → Deploy manually** and drag this folder in
   (or connect the Git repository with **Build command** empty and **Publish directory** = the folder).
2. Forms are detected automatically (`contact` and `chat-inquiry`); submissions appear under
   **Site → Forms**. Turn on email notifications there.

### Vercel
1. `vercel` from inside this folder (or import the Git repository).
2. Framework preset **Other**, **Build command** empty, **Output directory** `.` (the folder root).
3. Vercel has no built-in form service, so the contact form shows the email fallback.

### GitHub Pages
Push the folder's contents to a repository, then **Settings → Pages → Deploy from a branch**
(root). The contact form shows the email fallback.

### Test locally
Double-clicking `index.html` works for browsing: when opened from disk, `main.js` points the
folder links (`about/`) at their `index.html`. For a test that matches the live hosts, use a static
server, for example `npx serve .` or `python -m http.server` in this folder. On `file://` the
assistant falls back to its contact-page answer, because browsers block it from reading the other pages.
