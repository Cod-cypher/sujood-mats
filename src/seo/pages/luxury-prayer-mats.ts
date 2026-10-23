/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Targets "luxury prayer mat" / "premium prayer mat": what makes a mat premium, how each
// of ours is made and where the materials come from, with the three mats to buy.

import { PRODUCTS } from "../../data";
import type { PrayerMatProduct } from "../../types";
import { webpSrcSet } from "../../images";
import { esc } from "../escape";
import { absoluteUrl, productPath } from "../site";
import type { SeoPage } from "../types";

const PATH = "/luxury-prayer-mats/";
const DESCRIPTION =
  "Premium prayer mats from Sujood: Faisalabad velvet over memory foam, mulberry silk with Egyptian cotton, and hand-woven Pakistani wool.";

const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;
/** Product names start with "The"; the sentence supplies its own article. */
const link = (id: string) => {
  const p = product(id);
  return `<a href="${esc(productPath(p.slug))}">${esc(p.name.replace(/^The /, ""))}</a>`;
};

// What each card leads with, after the thickness.
const CORE: Record<string, string> = {
  "rawdah-ortho": "memory foam",
  "silk-route": "silk and cotton",
  "andalusia-wool": "hand-spun wool",
};
/** "12mm (Orthopedic Cushioning)" -> "12mm"; "120cm × 70cm (Full Stance)" -> "120cm × 70cm". */
const plain = (s: string) => s.replace(/\s*\(.*\)\s*$/, "");

// Rendered image width: .shop is three columns from 676px and two from 462px inside the
// 760px .wrap, less each card's 12px padding.
const GRID_IMAGE_SIZES =
  "(min-width: 760px) 204px, (min-width: 676px) calc((100vw - 76px) / 3 - 24px), (min-width: 462px) calc((100vw - 62px) / 2 - 24px), calc(100vw - 72px)";

// The image and name open the product page; the button goes to the colour picker and
// cart on the homepage, the same place the product pages send people.
const card = (p: PrayerMatProduct) => `        <div class="shop-card">
          <a class="shop-main" href="${esc(productPath(p.slug))}">
            <img src="${esc(p.imageUrl)}" srcset="${esc(webpSrcSet(p.imageUrl))}" sizes="${GRID_IMAGE_SIZES}" width="1200" height="896" loading="lazy" decoding="async" alt="${esc(`${p.name} prayer mat in ${p.colorways[0].name}`)}" />
            <strong>${esc(p.name)}</strong>
          </a>
          <span>${esc(`${plain(p.thickness)} ${CORE[p.id]} · ${plain(p.dimensions)}`)}</span>
          <span class="shop-price">$${esc(p.price)} USD &middot; Free shipping</span>
          <span class="shop-buy"><a class="btn" href="/#product-${esc(p.id)}" aria-label="${esc(`Choose colour for ${p.name}`)}">Choose colour</a></span>
        </div>`;

export const luxuryPrayerMats: SeoPage = {
  path: PATH,
  title: "Luxury Prayer Mats: Premium Materials & Craft | Sujood Mats",
  description: DESCRIPTION,
  kicker: "Premium prayer mats",
  h1: "Luxury Prayer Mats",
  lede:
    "A luxury prayer mat is not about ornament. It is about materials that feel right under your hands and forehead, and a mat made well enough to use five times a day for years.",
  schema: "collection",
  updated: "2026-10-23",
  cardTitle: "Luxury prayer mats",
  cardBlurb: "Premium materials & craft",
  image: product("andalusia-wool").imageUrl,
  related: [
    "/islamic-geometric-patterns-prayer-mats/",
    "/prayer-mat-materials-compared/",
    "/prayer-mat-guide/",
    "/prayer-rugs/",
  ],
  jsonLd: [
    {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl(PATH)}#collection`,
      name: "Luxury Prayer Mats",
      description: DESCRIPTION,
      url: absoluteUrl(PATH),
      mainEntity: {
        "@type": "ItemList",
        "@id": `${absoluteUrl(PATH)}#products`,
        numberOfItems: PRODUCTS.length,
        itemListElement: PRODUCTS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(productPath(p.slug)),
          name: p.name,
        })),
      },
    },
  ],
  bodyHtml: `
      <h2>What makes a prayer mat luxurious</h2>
      <p>
        Few things you own are touched as closely as a prayer mat. Your palms, knees and forehead
        rest on it at every prayer, so how its surface feels matters far more than how it is
        decorated. Many prayer mats are made to a price; a premium one is made to a standard, and
        you can check that standard for yourself, whichever mat you buy.
      </p>
      <ul>
        <li><strong>The material.</strong> Wool, silk, cotton and velvet each feel different under the hands. A good mat uses the one that suits how it will be used, not the cheapest.</li>
        <li><strong>The pattern.</strong> On a fine woven mat the design is part of the weave itself, so it stays crisp instead of wearing off the surface.</li>
        <li><strong>The edges.</strong> Reinforced, bound edges help a mat keep its shape and lie flat instead of curling.</li>
        <li><strong>How it ages.</strong> Hand-woven wool, in particular, tends to look better with the years rather than worse.</li>
      </ul>

      <h2>Our premium prayer mats</h2>
      <p>
        We make three mats, each built around a different material and its own idea of luxury:
        deep cushioning, a fine fabric light enough to carry, and hand-woven wool.
      </p>
      <div class="shop">
${PRODUCTS.map(card).join("\n")}
      </div>

      <h3>Velvet over memory foam: the Rawdah Orthopedic</h3>
      <p>
        Here the luxury is comfort. The ${link("rawdah-ortho")} is covered in Pakistani chenille
        velvet, soft under the palms and forehead. Beneath the cover, a 12mm dual-density
        memory-foam core eases the pressure of kneeling and prostration on the knees and ankles.
        A micro-textured rubber underlay holds the mat in place on tile or wood, and
        double-bound edges help it keep its shape. Read more about
        <a href="/orthopedic-prayer-mats/">orthopedic prayer mats</a>.
      </p>

      <h3>Mulberry silk and Egyptian cotton: the Silk Route Travel</h3>
      <p>
        The ${link("silk-route")} pairs two fibres, each with its own job. Mulberry silk gives the
        surface its smooth feel and a shimmer that catches natural light. Long-staple Egyptian
        cotton makes the weave strong enough for a mat that is folded, packed and unpacked all the
        time. The result is a 3mm mat of about 420 grams that travels in a hand-stitched leather
        sleeve. More on <a href="/silk-prayer-mats/">silk prayer mats</a>.
      </p>

      <h3>Hand-spun Pakistani wool: the Andalusia Flatweave</h3>
      <p>
        The ${link("andalusia-wool")} is the most traditional of the three. Its wool is spun by hand
        and the mat is woven by hand, so the geometric star design, drawn from Andalusian
        architecture, is built into the cloth rather than printed on top. Vegetable dyes give it
        its colour, and it is finished with hand-knotted braided tassels. The wool's natural lanolin
        repels dirt, and the mat stays warm on a cold floor. More on
        <a href="/wool-prayer-mats/">wool prayer mats</a>.
      </p>

      <h2>Where the materials come from</h2>
      <p>
        Our velvet and chenille are sourced from established mills in Faisalabad, Pakistan. The
        cushioned cores of our orthopedic mats are engineered and put together in our own workshop.
        Our wool mats are woven in Pakistani villages by family weaving collectives working on
        fair-trade terms, carrying on a craft that goes back centuries.
      </p>

      <h2>Looking after a premium mat</h2>
      <p>
        Fine materials reward a little care. Velvet and silk only need spot-cleaning with mild soap
        on a damp cloth. Wool asks for no more than a shake or a pass of the vacuum on a low
        setting. A memory-foam core should be kept dry, and never soaked or machine-washed. Our
        guide to <a href="/how-to-clean-a-prayer-mat/">cleaning a prayer mat</a> goes through each
        material step by step, and if the mat is a present for Ramadan, Eid or a wedding, the
        <a href="/prayer-mat-gifts/">gift guide</a> can help you choose.
      </p>

      <h2>Choosing between them</h2>
      <ul>
        <li><strong>Comfort first:</strong> the ${link("rawdah-ortho")}, the most cushioned of the three on a hard floor.</li>
        <li><strong>A fine mat you can carry:</strong> the ${link("silk-route")}, light enough for a bag or carry-on.</li>
        <li><strong>A mat for years of daily use:</strong> the ${link("andalusia-wool")}, in hard-wearing wool.</li>
      </ul>
      <p>
        Every mat ships free, comes in a choice of three colours and has a lifetime warranty on its
        edges.
      </p>
`,
  faqs: [
    {
      question: "What is the difference between a luxury prayer mat and an ordinary one?",
      answer:
        "Mostly the materials and how they are put together. A luxury mat is made from well-chosen materials, has its pattern woven in rather than printed on, and has properly finished edges, so it feels good to pray on and stands up to daily use.",
    },
    {
      question: "How is each Sujood mat made?",
      answer:
        "The Andalusia Flatweave is woven by hand from hand-spun wool by family weaving collectives in Pakistani villages. The Rawdah Orthopedic's foam core is engineered and assembled in our own workshop, under a velvet cover from Faisalabad mills. The Silk Route Travel is a mulberry silk and Egyptian cotton blend, and its leather travel sleeve is hand-stitched.",
    },
    {
      question: "Which Sujood mat lasts the longest?",
      answer:
        "Wool is traditionally the longest-lasting material, so the Andalusia Flatweave is the one to choose for a mat to keep for many years. Foam and silk mats also last years with the right care, and all three have a lifetime warranty on their edges.",
    },
  ],
};
