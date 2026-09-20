/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PRODUCTS } from "../../data";
import { webpSrcSet } from "../../images";
import { esc } from "../escape";
import { PRODUCT_PAGES } from "../products";
import { absoluteUrl } from "../site";
import type { SeoPage } from "../types";

// Product cards with prices: people searching "buy prayer rugs" want to see what is
// for sale before they read about it.
const shopCards = PRODUCT_PAGES.map((page, i) => {
  const product = PRODUCTS.find((p) => p.name === page.h1)!;
  return `        <a class="shop-card" href="${esc(page.path)}">
          <img src="${esc(product.imageUrl)}" srcset="${esc(webpSrcSet(product.imageUrl))}" sizes="(min-width: 760px) 225px, calc(100vw - 48px)" width="1200" height="896"${i === 0 ? "" : ' loading="lazy"'} decoding="async" alt="${esc(`${product.name} prayer rug`)}" />
          <strong>${esc(product.name)}</strong>
          <span>${esc(page.cardBlurb)}</span>
          <span class="shop-price">$${esc(product.price)} USD &middot; Free shipping</span>
          <span class="shop-link">View &amp; buy</span>
        </a>`;
}).join("\n");

export const prayerRugs: SeoPage = {
  path: "/prayer-rugs/",
  title: "Prayer Rugs: Buy Wool, Silk & Cushioned Rugs | Sujood Mats",
  description:
    "Buy prayer rugs online: hand-woven wool, silk travel and cushioned memory-foam rugs, with free shipping. Plus sizes, names (sajjada, janamaz) and how to choose.",
  kicker: "Shop & guide",
  h1: "Prayer Rugs",
  lede:
    "Shop our three prayer rugs below, each with free shipping. Further down: what the different names mean, the main types of prayer rug, and how to pick one that suits the way you pray.",
  schema: "article",
  updated: "2026-09-20",
  cardTitle: "Prayer rugs",
  cardBlurb: "Shop, types & how to choose",
  related: ["/wool-prayer-mats/", "/prayer-mat-materials-compared/", "/islamic-geometric-patterns-prayer-mats/", "/prayer-mat-guide/"],
  jsonLd: [
    {
      "@type": "ItemList",
      "@id": `${absoluteUrl("/prayer-rugs/")}#products`,
      name: "Prayer rugs by Sujood Mats",
      itemListElement: PRODUCT_PAGES.map((page, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(page.path),
        name: page.h1,
      })),
    },
  ],
  bodyHtml: `
      <h2>Shop prayer rugs</h2>
      <p>
        Three prayer rugs, each made for a different need. Every order ships free, and you can
        buy online in a couple of minutes.
      </p>
      <div class="shop">
${shopCards}
      </div>

      <h2>Prayer rug vs prayer mat: is there a difference?</h2>
      <p>
        Not really. "Prayer rug" and "prayer mat" are two English names for the same thing: a
        clean surface, roughly the size of one person, laid on the floor for the five daily prayers.
        Which word people use mostly comes down to where they grew up and what the piece is made of.
      </p>
      <ul>
        <li><strong>Prayer rug</strong> is more common in North America, and tends to be used for woven wool or silk pieces.</li>
        <li><strong>Prayer mat</strong> is more common in the UK, South Asia and Southeast Asia, and is the usual word for cushioned, foldable or travel versions.</li>
      </ul>
      <p>
        We use "prayer mat" across this site, but everything in our
        <a href="/guides/">guides</a> applies equally if you call yours a prayer rug.
      </p>

      <h2>Other names for a prayer rug</h2>
      <table class="specs">
        <tbody>
          <tr><th scope="row">Sajjada (sajjadah)</th><td>Arabic. From the same root as <em>sujood</em>, the prostration in prayer.</td></tr>
          <tr><th scope="row">Janamaz (jaynamaz)</th><td>Persian, Urdu and Bengali. Literally "place of prayer".</td></tr>
          <tr><th scope="row">Musalla</th><td>Arabic. Used for a prayer rug and also for a prayer space.</td></tr>
          <tr><th scope="row">Sejadah (sajadah)</th><td>Malay and Indonesian.</td></tr>
          <tr><th scope="row">Seccade</th><td>Turkish.</td></tr>
        </tbody>
      </table>

      <h2>Types of prayer rug</h2>

      <h3>Woven wool prayer rugs</h3>
      <p>
        The traditional choice. A hand-woven wool flatweave is hard-wearing, warm on cold floors, and
        resists dust thanks to the natural lanolin in the fibre. It is the type most people picture
        when they hear "prayer rug". Read more about <a href="/wool-prayer-mats/">wool prayer mats</a>,
        or see our <a href="/products/andalusia-flatweave/">Andalusia Flatweave</a>, hand-spun from
        100% wool.
      </p>

      <h3>Silk and silk-blend prayer rugs</h3>
      <p>
        Silk gives a smooth surface with a soft sheen, and it can be woven very thin. That makes it a
        good fit for a rug you carry with you. See <a href="/silk-prayer-mats/">silk prayer mats</a>
        and the 3mm, 420-gram <a href="/products/silk-route-travel/">Silk Route Travel</a>.
      </p>

      <h3>Cushioned (orthopedic) prayer rugs</h3>
      <p>
        A woven rug on a hard floor does little for sore knees. Cushioned prayer rugs put a memory-foam
        core under a soft cover, which takes the pressure off the knees, ankles and forehead. See
        <a href="/orthopedic-prayer-mats/">orthopedic prayer mats</a> and the 12mm
        <a href="/products/rawdah-orthopedic/">Rawdah Orthopedic</a>.
      </p>

      <h2>Prayer rug size and thickness</h2>
      <p>
        A standard adult prayer rug is about <strong>110–125cm long and 65–75cm wide</strong>, enough
        room for your feet when standing and your hands, knees and forehead in prostration. Thickness
        runs from around 3mm for a travel rug to 12mm for a cushioned one. The
        <a href="/prayer-mat-size-guide/">size guide</a> and <a href="/prayer-mat-thickness/">thickness
        guide</a> go into detail.
      </p>

      <h2>Prayer rug designs</h2>
      <p>
        Most prayer rugs carry an arch at one end, the mihrab, which points toward the qibla when the
        rug is laid out. Geometric star patterns and floral borders are also common, and designs avoid
        images of people or animals. We cover the history in
        <a href="/islamic-geometric-patterns-prayer-mats/">the meaning of prayer mat designs</a>.
      </p>

      <h2>How to choose a prayer rug</h2>
      <div class="card">
        <ul>
          <li><strong>Hard floors or sore joints:</strong> choose a cushioned rug with a non-slip backing.</li>
          <li><strong>An everyday rug at home:</strong> choose woven wool for durability and warmth.</li>
          <li><strong>Work, travel or the mosque:</strong> choose a thin silk blend that folds flat.</li>
        </ul>
        <p>
          The full <a href="/prayer-mat-guide/">buying guide</a> walks through materials, sizing and
          care step by step.
        </p>
        <p class="cta" style="margin: 12px 0 0;">
          <a class="btn" href="/">Shop prayer mats</a>
        </p>
      </div>
`,
  faqs: [
    {
      question: "Is a prayer rug the same as a prayer mat?",
      answer:
        "Yes. Prayer rug and prayer mat are two names for the same thing: a clean, person-sized surface for the daily prayers. \"Rug\" is more often used for woven wool or silk pieces and \"mat\" for cushioned or foldable ones, but the words are interchangeable.",
    },
    {
      question: "What is a prayer rug called in Arabic and Urdu?",
      answer:
        "In Arabic a prayer rug is a sajjada (also written sajjadah), and musalla is used as well. In Urdu, Persian and Bengali it is a janamaz or jaynamaz. In Malay and Indonesian it is a sejadah, and in Turkish a seccade.",
    },
    {
      question: "What is the standard size of a prayer rug?",
      answer:
        "A standard adult prayer rug is around 110-125cm long and 65-75cm wide. Travel prayer rugs are usually slightly smaller so they fold down, and children's rugs are smaller again.",
    },
    {
      question: "What is the best material for a prayer rug?",
      answer:
        "It depends on how you will use it. Wool is the most durable and stays warm on cold floors, silk blends are the lightest and easiest to carry, and memory-foam prayer rugs are the most comfortable for people with knee, ankle or back discomfort.",
    },
  ],
};
