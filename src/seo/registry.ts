/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Every server-rendered SEO page, keyed by canonical path. Add a page here and it
// is routed by server.ts, listed on /guides/ and included in /sitemap.xml.

import { esc } from "./escape";
import { renderPage } from "./layout";
import { PRODUCT_PAGES } from "./products";
import { absoluteUrl } from "./site";
import type { SeoPage } from "./types";

import { prayerMatGuide } from "./pages/prayer-mat-guide";
import { orthopedicPrayerMats } from "./pages/orthopedic-prayer-mats";
import { travelPrayerMats } from "./pages/travel-prayer-mats";
import { woolPrayerMats } from "./pages/wool-prayer-mats";
import { silkPrayerMats } from "./pages/silk-prayer-mats";
import { prayerMatMaterialsCompared } from "./pages/prayer-mat-materials-compared";
import { prayerMatThickness } from "./pages/prayer-mat-thickness";
import { prayerMatSizeGuide } from "./pages/prayer-mat-size-guide";
import { nonSlipPrayerMats } from "./pages/non-slip-prayer-mats";
import { prayerMatsForElderly } from "./pages/prayer-mats-for-elderly";
import { howToCleanAPrayerMat } from "./pages/how-to-clean-a-prayer-mat";
import { prayerMatGifts } from "./pages/prayer-mat-gifts";
import { islamicGeometricPatternsPrayerMats } from "./pages/islamic-geometric-patterns-prayer-mats";

export const HOME_UPDATED = "2026-09-17";

const GUIDES: SeoPage[] = [
  prayerMatGuide,
  orthopedicPrayerMats,
  travelPrayerMats,
  woolPrayerMats,
  silkPrayerMats,
  prayerMatMaterialsCompared,
  prayerMatThickness,
  prayerMatSizeGuide,
  nonSlipPrayerMats,
  prayerMatsForElderly,
  howToCleanAPrayerMat,
  prayerMatGifts,
  islamicGeometricPatternsPrayerMats,
];

const cardList = (pages: SeoPage[]) =>
  `      <div class="related">
${pages.map((p) => `        <a href="${esc(p.path)}"><strong>${esc(p.cardTitle)}</strong>${esc(p.cardBlurb)}</a>`).join("\n")}
      </div>`;

const guidesHub: SeoPage = {
  path: "/guides/",
  title: "Prayer Mat Guides: Choosing, Sizing & Care | Sujood Mats",
  description:
    "All Sujood prayer mat guides in one place: how to choose a prayer mat, orthopedic, wool, silk and travel mats, sizes, thickness, cleaning, gifts and designs.",
  kicker: "Guides",
  h1: "Prayer Mat Guides",
  lede:
    "Practical, straightforward guides to choosing, using and caring for a prayer mat, plus details on each of our mats.",
  schema: "collection",
  updated: "2026-09-17",
  cardTitle: "All guides",
  cardBlurb: "Choosing, sizing & care",
  related: [],
  faqs: [],
  bodyHtml: `
      <h2>Start here</h2>
${cardList([prayerMatGuide, prayerMatMaterialsCompared])}

      <h2>By type &amp; material</h2>
${cardList([orthopedicPrayerMats, woolPrayerMats, silkPrayerMats, travelPrayerMats])}

      <h2>Size, thickness &amp; grip</h2>
${cardList([prayerMatSizeGuide, prayerMatThickness, nonSlipPrayerMats])}

      <h2>Care, gifts &amp; design</h2>
${cardList([howToCleanAPrayerMat, prayerMatsForElderly, prayerMatGifts, islamicGeometricPatternsPrayerMats])}

      <h2>Our prayer mats</h2>
${cardList(PRODUCT_PAGES)}
`,
  jsonLd: [
    {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl("/guides/")}#collection`,
      name: "Prayer Mat Guides",
      url: absoluteUrl("/guides/"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [...GUIDES, ...PRODUCT_PAGES].map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(p.path),
          name: p.cardTitle,
        })),
      },
    },
  ],
};

export const SEO_PAGES: SeoPage[] = [guidesHub, ...GUIDES, ...PRODUCT_PAGES];

const byPath = new Map(SEO_PAGES.map((p) => [p.path, p]));

export const findSeoPage = (path: string) => byPath.get(path);

// Pages are static between deploys, so render each once and reuse the HTML.
const htmlCache = new Map<string, string>();
export function renderSeoPage(page: SeoPage): string {
  let html = htmlCache.get(page.path);
  if (!html) {
    html = renderPage(page, findSeoPage);
    htmlCache.set(page.path, html);
  }
  return html;
}
