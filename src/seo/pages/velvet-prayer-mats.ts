/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Targets "velvet prayer mat" / "chenille prayer mat": what velvet is like to pray on and
// what to look for, with our velvet mat in its three colours. Cushioning belongs to
// /orthopedic-prayer-mats/ and cleaning to /how-to-clean-a-prayer-mat/; this links to both.

import { PRODUCTS } from "../../data";
import { webpSrcSet } from "../../images";
import { esc } from "../escape";
import { absoluteUrl, productPath } from "../site";
import type { SeoPage } from "../types";

const PATH = "/velvet-prayer-mats/";
const DESCRIPTION =
  "Buy a velvet prayer mat in soft Pakistani chenille, cushioned underneath and non-slip on tile or wood. Three colours, free shipping.";

const rawdah = PRODUCTS.find((p) => p.id === "rawdah-ortho")!;
const rawdahPath = productPath(rawdah.slug);
const colour = (name: string) => rawdah.colorways.find((c) => c.name === name)!;
const imageOf = (name: string) => colour(name).imageUrl ?? rawdah.imageUrl;
const colours = rawdah.colorways.map((c) => c.name);
const colourList = `${colours.slice(0, -1).join(", ")} and ${colours[colours.length - 1]}`;

// The colours as a gallery, like the product page's, with one buy button below: the
// homepage picker can't preselect a colour, so one button per colour would mislead.
const gallery = `      <div class="swatches">
${rawdah.colorways
  .map(
    (c, i) => `        <figure>
          <a href="${esc(rawdahPath)}"><img src="${esc(imageOf(c.name))}" srcset="${esc(webpSrcSet(imageOf(c.name)))}" sizes="(min-width: 760px) 230px, 50vw" width="1200" height="896"${i === 0 ? "" : ' loading="lazy"'} decoding="async" alt="${esc(`${rawdah.name} velvet prayer mat in ${c.name}`)}" /></a>
          <figcaption>${esc(c.name)}</figcaption>
        </figure>`
  )
  .join("\n")}
      </div>
      <div class="cta" style="margin: 20px 0;">
        <a class="btn" href="/#product-${esc(rawdah.id)}">Choose a colour &amp; add to cart</a>
      </div>`;

export const velvetPrayerMats: SeoPage = {
  path: PATH,
  title: "Velvet Prayer Mats in Soft Chenille | Sujood Mats",
  description: DESCRIPTION,
  kicker: "Chenille velvet",
  h1: "Velvet Prayer Mats",
  lede:
    "Velvet gives a prayer mat a soft, plush surface: a short, dense pile that feels smooth to the touch. Ours is Pakistani chenille velvet, with a cushioned core underneath.",
  schema: "collection",
  updated: "2026-10-27",
  cardTitle: "Velvet prayer mats",
  cardBlurb: "Soft chenille velvet",
  image: imageOf("Obsidian Onyx"),
  related: ["/prayer-mat-materials-compared/", "/prayer-mat-thickness/", "/prayer-mat-gifts/", "/prayer-mat-guide/"],
  jsonLd: [
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl(PATH)}#webpage`,
      url: absoluteUrl(PATH),
      name: "Velvet Prayer Mats",
      description: DESCRIPTION,
      about: { "@id": `${absoluteUrl(rawdahPath)}#product` },
      primaryImageOfPage: absoluteUrl(imageOf("Obsidian Onyx")),
    },
  ],
  bodyHtml: `
      <h2>Our velvet prayer mat</h2>
      <p>
        The <a href="${esc(rawdahPath)}">Rawdah Orthopedic</a> is our velvet prayer mat, or velvet
        prayer rug as some call it. It costs $${esc(rawdah.price)}, ships free and has a lifetime
        warranty on its edges. It comes in three colours: Royal Emerald, a deep green; Obsidian
        Onyx, close to black; and Saffron Rust, a warm red-brown. The velvet, core and underlay are
        the same in each.
      </p>
${gallery}

      <h2>What velvet feels like to pray on</h2>
      <p>
        Velvet is a pile fabric: its surface is a dense layer of short fibres standing upright. It
        feels smooth when you run your hand one way and slightly rougher the other, and it has a
        soft sheen where the light falls across the pile. On a prayer mat, that means a surface
        that is gentle wherever your palms and forehead meet it.
      </p>
      <p>
        Chenille velvet is woven from chenille yarn, which has short fibres standing out all around
        a core thread; the name is French for caterpillar, after the yarn's soft, tufted look. It
        gives a chenille prayer mat a thick, plush feel. Ours comes from established mills in
        Faisalabad, Pakistan, and you can read how each of our mats is made in
        <a href="/luxury-prayer-mats/">luxury prayer mats</a>.
      </p>

      <h2>Velvet is a cover, not a cushion</h2>
      <p>
        However soft the velvet, a thin velvet mat laid straight on tile or concrete does little for
        your knees. What matters is what lies underneath. On the Rawdah, the velvet covers a 12mm
        dual-density memory-foam core that takes the strain of kneeling and prostration, with a
        micro-textured rubber underlay below so the mat stays where you put it. For more on what the
        foam does, see <a href="/orthopedic-prayer-mats/">orthopedic prayer mats</a>.
      </p>

      <h2>What to look for in a velvet prayer mat</h2>
      <ul>
        <li><strong>A grippy back.</strong> A plain fabric back can slide on tile, wood and laminate; a rubber underlay holds the mat still. Our guide to <a href="/non-slip-prayer-mats/">non-slip prayer mats</a> explains why.</li>
        <li><strong>Finished edges.</strong> Look for edges that are bound rather than left raw, so the mat holds its shape. The Rawdah's are reinforced and double-bound.</li>
      </ul>

      <h2>Who our velvet mat suits</h2>
      <p>
        Ours is a mat for home: a soft, cushioned place to return to at every prayer, even on a bare
        floor. If you are choosing for an older parent, see
        <a href="/prayer-mats-for-elderly/">prayer mats for elderly people</a>. It is not the mat to
        carry with you, though: with a 12mm core it does not fold small, and a thin silk mat is the
        better companion for work and travel, as our guide to
        <a href="/travel-prayer-mats/">travel prayer mats</a> explains.
      </p>

      <h2>Looking after velvet</h2>
      <p>
        Velvet needs little more than a light brush in the direction of the pile and spot-cleaning by
        hand. A velvet mat with a foam core should never be soaked or machine-washed. Our guide to
        <a href="/how-to-clean-a-prayer-mat/">how to clean a prayer mat</a> has the step-by-step
        method.
      </p>
`,
  faqs: [
    {
      question: "Are velvet prayer mats comfortable?",
      answer:
        "Velvet is soft to the touch, but comfort on a hard floor depends on what is underneath. The Rawdah Orthopedic puts its chenille velvet over a memory-foam core, so it is soft on the surface and cushioned below.",
    },
    {
      question: "Do velvet prayer mats slip?",
      answer:
        "That depends mostly on the back, not the velvet. A plain fabric back can slide on a smooth floor; the Rawdah Orthopedic's velvet sits on a rubber underlay that keeps it in place.",
    },
    {
      question: "What is chenille velvet?",
      answer:
        "Velvet woven from chenille yarn, which has short fibres standing out all around a core thread. That gives the fabric a thick, plush feel. The Rawdah Orthopedic's cover is Pakistani chenille velvet.",
    },
    {
      question: "What colours does your velvet prayer mat come in?",
      answer: `The Rawdah Orthopedic comes in ${colourList}.`,
    },
  ],
};
