/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Server-rendered HTML shell shared by every guide, product and hub page.

import { esc, jsonLd } from "./escape";
import { SITE_NAME, ORG_ID, DEFAULT_IMAGE, absoluteUrl } from "./site";
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

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-5XDYZ75YQF"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-5XDYZ75YQF');
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

const HEADER = `<header class="site">
      <div class="wrap">
        <a class="logo" href="/"><img src="/images/logo-128.webp" width="40" height="40" alt="Sujood Mats" /></a>
        <a class="brand" href="/">SUJOOD</a>
        <span class="spacer"></span>
        <a class="navlink" href="/guides/">Guides</a>
        <a class="btn" href="/">Shop Prayer Mats</a>
      </div>
    </header>`;

// The one site-wide OptimizeIndex credit for server-rendered pages (nofollow: it
// appears on every page). The React homepage footer carries the same line.
const FOOTER = `<footer class="site">
      <div class="wrap">
        <p>&copy; 2026 Sujood. Prayer mats made for everyday comfort. &middot; <a href="/">Home</a> &middot; <a href="/guides/">Guides</a></p>
        <p>Website and search optimization by <a href="https://optimizeindex.com/" rel="nofollow">OptimizeIndex</a>.</p>
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
