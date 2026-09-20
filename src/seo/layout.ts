/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Server-rendered HTML shell shared by every guide, product and hub page.

import { esc, jsonLd } from "./escape";
import { NAV_LINKS, FOOTER_COLUMNS, FOOTER_BLURB } from "./nav";
import { SITE_NAME, ORG_ID, DEFAULT_IMAGE, CONTACT_EMAIL, absoluteUrl } from "./site";
import type { SeoPage } from "./types";

type Lookup = (path: string) => SeoPage | undefined;

function head(opts: {
  title: string;
  description: string;
  path?: string;
  ogType?: string;
  image?: string;
  robots?: string;
  graph?: Record<string, unknown>[];
}): string {
  const image = absoluteUrl(opts.image ?? DEFAULT_IMAGE);
  const url = opts.path ? absoluteUrl(opts.path) : undefined;
  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Google tag (gtag.js). Hits queue in dataLayer straight away; the library itself
         loads on first interaction or 5s after load. Keep in sync with index.html. -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-5XDYZ75YQF');
      (function () {
        var done = false, events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
        function load() {
          if (done) return;
          done = true;
          events.forEach(function (e) { removeEventListener(e, load); });
          var s = document.createElement('script');
          s.async = true;
          s.src = 'https://www.googletagmanager.com/gtag/js?id=G-5XDYZ75YQF';
          document.head.appendChild(s);
        }
        events.forEach(function (e) { addEventListener(e, load, { passive: true, once: true }); });
        addEventListener('load', function () { setTimeout(load, 5000); });
      })();
    </script>

    <link rel="icon" type="image/png" href="/favicon-64.png" />

    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}" />
    <meta name="robots" content="${opts.robots ?? "index, follow"}" />
    <meta name="theme-color" content="#0D1110" />
${url ? `    <link rel="canonical" href="${esc(url)}" />\n` : ""}
    <meta property="og:type" content="${opts.ogType ?? "article"}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${esc(opts.title)}" />
    <meta property="og:description" content="${esc(opts.description)}" />
${url ? `    <meta property="og:url" content="${esc(url)}" />\n` : ""}    <meta property="og:image" content="${esc(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(opts.title)}" />
    <meta name="twitter:description" content="${esc(opts.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
${opts.graph ? `\n    <script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@graph": opts.graph })}</script>\n` : ""}
    <link rel="stylesheet" href="/guide.css" />
  </head>`;
}

const navLinks = (indent: string) =>
  NAV_LINKS.map((l) => `${indent}<a href="${esc(l.href ?? "/")}">${esc(l.label)}</a>`).join("\n");

// Mirrors the homepage header in src/App.tsx (links come from ./nav). The mobile
// menu is a <details> element, so these pages still ship no JavaScript of their own.
const HEADER = `<header class="site">
      <div class="bar">
        <a class="logo" href="/" aria-label="Sujood Mats home"><img src="/images/logo-128.webp" width="56" height="56" alt="Sujood Mats" /></a>
        <nav class="site-nav" aria-label="Main">
${navLinks("          ")}
        </nav>
        <div class="actions">
          <a class="btn" href="/">Shop Prayer Mats</a>
          <details class="menu">
            <summary aria-label="Toggle menu">
              <svg class="i-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              <svg class="i-close" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </summary>
            <nav aria-label="Mobile">
${navLinks("              ")}
            </nav>
          </details>
        </div>
      </div>
    </header>`;

// Mirrors the homepage footer in src/App.tsx, including the one site-wide
// OptimizeIndex credit (nofollow: it appears on every page).
const FOOTER = `<footer class="site">
      <div class="bar">
        <div class="about">
          <a class="mark" href="/">
            <img src="/images/logo-128.webp" width="48" height="48" loading="lazy" alt="Sujood Mats" />
            <span>S U J O O D</span>
          </a>
          <p>${esc(FOOTER_BLURB)}</p>
        </div>
        <div class="cols">
${FOOTER_COLUMNS.map(
  (col) => `          <div>
            <p class="col-title">${esc(col.title)}</p>
${col.items
  .map((i) => (i.href ? `            <a href="${esc(i.href)}">${esc(i.label)}</a>` : `            <span>${esc(i.label)}</span>`))
  .join("\n")}
          </div>`
).join("\n")}
        </div>
        <div class="legal">
          <p>&copy; 2026 Sujood.</p>
          <p>Prayer mats made for everyday comfort.</p>
          <p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
          <p>Website and search optimization by <a href="https://optimizeindex.com/" rel="nofollow">OptimizeIndex</a>.</p>
        </div>
      </div>
    </footer>`;

function crumbs(page: SeoPage): { name: string; path: string }[] {
  const trail = [{ name: "Home", path: "/" }];
  if (page.schema === "article") trail.push({ name: "Guides", path: "/guides/" });
  trail.push({ name: page.cardTitle, path: page.path });
  return trail;
}

function buildGraph(page: SeoPage): Record<string, unknown>[] {
  const url = absoluteUrl(page.path);
  const trail = crumbs(page);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl(DEFAULT_IMAGE),
      email: CONTACT_EMAIL,
      contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: CONTACT_EMAIL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: absoluteUrl(c.path),
      })),
    },
  ];

  if (page.schema === "article") {
    graph.push({
      "@type": "Article",
      "@id": `${url}#article`,
      headline: page.h1,
      description: page.description,
      image: absoluteUrl(page.image ?? DEFAULT_IMAGE),
      dateModified: page.updated,
      author: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      mainEntityOfPage: url,
    });
  }

  if (page.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  if (page.jsonLd) graph.push(...page.jsonLd);
  return graph;
}

export function renderPage(page: SeoPage, lookup: Lookup): string {
  const trail = crumbs(page);
  const related = page.related
    .map((p) => lookup(p))
    .filter((p): p is SeoPage => Boolean(p));

  const faqHtml = page.faqs.length
    ? `
      <h2>Frequently asked questions</h2>
${page.faqs
  .map(
    (f) => `      <details>
        <summary>${esc(f.question)}</summary>
        <p>${esc(f.answer)}</p>
      </details>`
  )
  .join("\n")}
`
    : "";

  const relatedHtml = related.length
    ? `
      <h2>Related guides</h2>
      <div class="related">
${related
  .map((r) => `        <a href="${esc(r.path)}"><strong>${esc(r.cardTitle)}</strong>${esc(r.cardBlurb)}</a>`)
  .join("\n")}
      </div>
`
    : "";

  return `<!doctype html>
<html lang="en">
  ${head({
    title: page.title,
    description: page.description,
    path: page.path,
    ogType: page.schema === "product" ? "product" : page.schema === "collection" ? "website" : "article",
    image: page.image,
    graph: buildGraph(page),
  })}
  <body>
    ${HEADER}

    <main class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb">
        ${trail
          .map((c, i) =>
            i === trail.length - 1
              ? `<span aria-current="page">${esc(c.name)}</span>`
              : `<a href="${esc(c.path)}">${esc(c.name)}</a>`
          )
          .join(" <span aria-hidden=\"true\">/</span> ")}
      </nav>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.h1)}</h1>
      <p class="lede">${esc(page.lede)}</p>
${page.bodyHtml}${faqHtml}${relatedHtml}
      <div class="cta">
        <a class="btn" href="/">Browse all Sujood prayer mats</a>
      </div>
    </main>

    ${FOOTER}
  </body>
</html>
`;
}

export function renderNotFound(): string {
  return `<!doctype html>
<html lang="en">
  ${head({
    title: "Page not found | Sujood Mats",
    description: "The page you were looking for doesn't exist.",
    robots: "noindex, follow",
    ogType: "website",
  })}
  <body>
    ${HEADER}

    <main class="wrap">
      <p class="kicker">404</p>
      <h1>Page not found</h1>
      <p class="lede">That page doesn't exist or has moved. Try one of these instead.</p>
      <div class="related">
        <a href="/"><strong>Shop prayer mats</strong>Orthopedic, wool &amp; silk</a>
        <a href="/guides/"><strong>All guides</strong>Choosing, sizing &amp; care</a>
        <a href="/prayer-mat-guide/"><strong>How to choose a prayer mat</strong>The full buying guide</a>
      </div>
    </main>

    ${FOOTER}
  </body>
</html>
`;
}
