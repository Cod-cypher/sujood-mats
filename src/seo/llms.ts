/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// /llms.txt (llmstxt.org): a Markdown index of the site for AI assistants and
// crawlers. Generated from the same registry as the sitemap, so new pages are
// listed automatically.

import { PRODUCTS } from "../data";
import { SITE_NAME, CONTACT_EMAIL, absoluteUrl } from "./site";
import type { SeoPage } from "./types";

const link = (p: SeoPage, label = p.cardTitle) => `- [${label}](${absoluteUrl(p.path)}): ${p.description}`;

export function renderLlmsTxt(pages: SeoPage[]): string {
  const products = pages.filter((p) => p.schema === "product");
  const guides = pages.filter((p) => p.schema === "article");
  const hubs = pages.filter((p) => p.schema === "collection");
  const price = (p: SeoPage) => PRODUCTS.find((x) => x.name === p.h1)?.price;

  return `# ${SITE_NAME}

> ${SITE_NAME} (sujoodmats.com) is an online store for comfortable prayer mats, also known as prayer rugs, sajjada, janamaz or musalla. It sells three mats: an orthopedic memory-foam mat for knee and joint comfort, a hand-spun wool flatweave, and a lightweight silk travel mat. The site also publishes practical guides on choosing, sizing and caring for a prayer mat.

Prices are in USD. Orders are placed on the homepage, where each mat can be bought in three colours. For questions about products or orders, email ${CONTACT_EMAIL}.

## Products

${products.map((p) => `${link(p, p.h1)}${price(p) ? ` Price: $${price(p)} USD.` : ""}`).join("\n")}

## Guides

${guides.map((p) => link(p)).join("\n")}

## Site

- [Shop prayer mats](${absoluteUrl("/")}): Homepage and storefront, with all three prayer mats, customer reviews and FAQs.
${hubs.map((p) => link(p)).join("\n")}
- [Sitemap](${absoluteUrl("/sitemap.xml")}): XML sitemap of every page.

## Contact

- Email: ${CONTACT_EMAIL}
`;
}
