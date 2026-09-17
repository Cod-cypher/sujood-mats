/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { esc } from "./escape";
import { absoluteUrl } from "./site";
import type { SeoPage } from "./types";

const PRIORITY: Record<SeoPage["schema"], string> = {
  product: "0.9",
  collection: "0.8",
  article: "0.7",
};

export function renderSitemap(pages: SeoPage[], homeUpdated: string): string {
  const entries = [
    { loc: absoluteUrl("/"), lastmod: homeUpdated, changefreq: "weekly", priority: "1.0" },
    ...pages.map((p) => ({
      loc: absoluteUrl(p.path),
      lastmod: p.updated,
      changefreq: "monthly",
      priority: PRIORITY[p.schema],
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${esc(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}
