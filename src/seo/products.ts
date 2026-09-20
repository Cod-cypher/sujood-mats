/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Product pages are generated from PRODUCTS in src/data.ts so price, specs,
// colourways and images never drift from the storefront.

import { PRODUCTS } from "../data";
import type { PrayerMatProduct } from "../types";
import { webpSrcSet } from "../images";
import { esc } from "./escape";
import { SITE_NAME, absoluteUrl, productPath } from "./site";
import type { Faq, SeoPage } from "./types";

interface ProductSeo {
  title: string;
  description: string;
  kicker: string;
  lede: string;
  bestFor: string[];
  guides: string[];
  faqs: Faq[];
  cardBlurb: string;
}

export const PRODUCT_SEO: Record<string, ProductSeo> = {
  "rawdah-ortho": {
    title: "Rawdah Orthopedic Memory Foam Prayer Mat (12mm) | Sujood Mats",
    description:
      "The Rawdah Orthopedic prayer mat: a 12mm dual-density memory-foam core, soft velvet cover and non-slip rubber underlay for knee and ankle comfort. 120 × 70cm.",
    kicker: "Orthopedic prayer mat",
    lede:
      "A 12mm memory-foam prayer mat made for people whose knees, ankles or back feel every prayer on a hard floor.",
    bestFor: [
      "Knee, ankle, hip or lower-back discomfort when kneeling and prostrating",
      "Praying on tile, wood or concrete without carpet",
      "Older worshippers who want more cushioning at home",
    ],
    guides: ["/orthopedic-prayer-mats/", "/prayer-mats-for-elderly/", "/non-slip-prayer-mats/", "/prayer-mat-thickness/"],
    cardBlurb: "12mm memory foam for joint comfort",
    faqs: [
      {
        question: "How thick is the Rawdah Orthopedic prayer mat?",
        answer:
          "It is 12mm thick, with a dual-density memory-foam core. That is thick enough to cushion the knees, ankles and forehead while staying stable when you stand, bow and prostrate.",
      },
      {
        question: "Will the Rawdah slide on a tiled or wooden floor?",
        answer:
          "It has a micro-textured rubber underlay on the back, which is designed to grip smooth floors such as tile, laminate and hardwood.",
      },
      {
        question: "Can I wash the Rawdah Orthopedic mat?",
        answer:
          "Spot-clean the velvet cover with a damp cloth and a little mild soap. Do not machine-wash or soak it, because water damages the memory-foam core.",
      },
    ],
  },
  "silk-route": {
    title: "Silk Route Travel Prayer Mat: 3mm, 420g, Folds Flat | Sujood Mats",
    description:
      "The Silk Route travel prayer mat: a 3mm mulberry silk and Egyptian cotton flatweave that weighs 420 grams and packs into a leather travel sleeve. 115 × 65cm.",
    kicker: "Travel prayer mat",
    lede:
      "A thin, 420-gram silk-and-cotton prayer mat that folds into its own leather sleeve, so you can carry it every day.",
    bestFor: [
      "Commuting, work trips and holidays",
      "Keeping a mat in a backpack, handbag or carry-on",
      "Anyone who wants a silk feel without a bulky mat",
    ],
    guides: ["/travel-prayer-mats/", "/silk-prayer-mats/", "/prayer-mat-size-guide/", "/prayer-mat-gifts/"],
    cardBlurb: "3mm silk blend that folds into a sleeve",
    faqs: [
      {
        question: "How much does the Silk Route travel mat weigh?",
        answer: "About 420 grams, so it adds very little to a bag or carry-on.",
      },
      {
        question: "Does the Silk Route come with a travel case?",
        answer: "Yes. It comes with a hand-stitched leather travel sleeve that it folds or rolls into.",
      },
      {
        question: "Is the Silk Route cushioned?",
        answer:
          "No. At 3mm it is a thin flatweave built for portability. If you need joint cushioning at home, the 12mm Rawdah Orthopedic is the better everyday mat.",
      },
    ],
  },
  "andalusia-wool": {
    title: "Andalusia Hand-Spun Wool Prayer Mat (Flatweave) | Sujood Mats",
    description:
      "The Andalusia Flatweave: a hand-spun 100% Pakistani wool prayer mat with Islamic geometric star patterns, vegetable dyes and braided tassels. 125 × 75cm, 8mm.",
    kicker: "Wool prayer mat",
    lede:
      "A hand-spun wool flatweave with geometric star patterns inspired by Andalusian architecture, made to be used daily for years.",
    bestFor: [
      "A durable everyday mat at home",
      "Cold floors, thanks to wool's natural insulation",
      "People who like traditional woven patterns",
    ],
    guides: ["/wool-prayer-mats/", "/islamic-geometric-patterns-prayer-mats/", "/how-to-clean-a-prayer-mat/", "/prayer-mat-materials-compared/"],
    cardBlurb: "Hand-spun wool with geometric patterns",
    faqs: [
      {
        question: "What is the Andalusia prayer mat made of?",
        answer:
          "100% hand-spun Pakistani wool, coloured with vegetable dyes and finished with hand-knotted braided tassels.",
      },
      {
        question: "Is the Andalusia wool mat warm on cold floors?",
        answer:
          "Yes. Wool is a natural insulator, so the 8mm flatweave stays comfortable on cold tile or stone.",
      },
      {
        question: "How do I clean a wool prayer mat like the Andalusia?",
        answer:
          "Shake it out or vacuum it on a low setting. The natural lanolin in wool helps it resist dirt, so small marks can usually be spot-cleaned with a damp cloth. Do not soak or machine-wash it.",
      },
    ],
  },
};

function buildProductPage(p: PrayerMatProduct): SeoPage {
  const seo = PRODUCT_SEO[p.id];
  const path = productPath(p.slug);
  const images = p.colorways.map((c) => c.imageUrl ?? p.imageUrl);

  const bodyHtml = `
      <div class="product-hero">
        <img src="${esc(p.imageUrl)}" srcset="${esc(webpSrcSet(p.imageUrl))}" sizes="(min-width: 760px) 712px, calc(100vw - 48px)" width="1200" height="896" fetchpriority="high" alt="${esc(`${p.name} prayer mat in ${p.colorways[0].name}`)}" />
      </div>

      <p class="price"><strong>$${esc(p.price)}</strong> USD</p>
      <p>${esc(p.description)}</p>

      <div class="cta" style="margin: 20px 0;">
        <a class="btn" href="/#product-${esc(p.id)}">Choose a colour &amp; add to cart</a>
      </div>

      <h2>Highlights</h2>
      <ul>
${p.highlights.map((h) => `        <li>${esc(h)}</li>`).join("\n")}
      </ul>

      <h2>Specifications</h2>
      <table class="specs">
        <tbody>
          <tr><th scope="row">Material</th><td>${esc(p.material)}</td></tr>
          <tr><th scope="row">Thickness</th><td>${esc(p.thickness)}</td></tr>
          <tr><th scope="row">Dimensions</th><td>${esc(p.dimensions)}</td></tr>
          <tr><th scope="row">Weave</th><td>${esc(p.stitchCount)}</td></tr>
          <tr><th scope="row">Colours</th><td>${esc(p.colorways.map((c) => c.name).join(", "))}</td></tr>
        </tbody>
      </table>

      <h2>Colours</h2>
      <div class="swatches">
${p.colorways
  .map(
    (c) => `        <figure>
          <img src="${esc(c.imageUrl ?? p.imageUrl)}" srcset="${esc(webpSrcSet(c.imageUrl ?? p.imageUrl))}" sizes="(min-width: 760px) 230px, 50vw" width="1200" height="896" loading="lazy" decoding="async" alt="${esc(`${p.name} in ${c.name}`)}" />
          <figcaption>${esc(c.name)}</figcaption>
        </figure>`
  )
  .join("\n")}
      </div>

      <h2>Who it's for</h2>
      <ul>
${seo.bestFor.map((b) => `        <li>${esc(b)}</li>`).join("\n")}
      </ul>
`;

  return {
    path,
    title: seo.title,
    description: seo.description,
    kicker: seo.kicker,
    h1: p.name,
    lede: seo.lede,
    bodyHtml,
    faqs: seo.faqs,
    related: seo.guides,
    schema: "product",
    updated: "2026-09-17",
    cardTitle: p.name,
    cardBlurb: seo.cardBlurb,
    image: p.imageUrl,
    jsonLd: [
      {
        "@type": "Product",
        "@id": `${absoluteUrl(path)}#product`,
        name: p.name,
        sku: p.id,
        description: p.description,
        image: images.map(absoluteUrl),
        material: p.material,
        brand: { "@type": "Brand", name: SITE_NAME },
        offers: {
          "@type": "Offer",
          url: absoluteUrl(path),
          priceCurrency: "USD",
          price: p.price.toFixed(2),
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      },
    ],
  };
}

export const PRODUCT_PAGES: SeoPage[] = PRODUCTS.map(buildProductPage);
