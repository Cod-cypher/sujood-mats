/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Header and footer links, shared by the React homepage (src/App.tsx) and the
// server-rendered guide/product pages (src/seo/layout.ts) so the two stay identical.
// "/#section" links scroll on the homepage and navigate to it from other pages.

import { PRODUCTS } from "../data";
import { CONTACT_EMAIL, productPath } from "./site";

export interface NavItem {
  label: string;
  /** Omitted for plain-text footer entries. */
  href?: string;
}

export const NAV_LINKS: NavItem[] = [
  { label: "Products", href: "/#catalog-section" },
  { label: "Why Sujood", href: "/#philosophy-section" },
  { label: "Reviews", href: "/#reviews-section" },
  { label: "Guides", href: "/guides/" },
];

export const FOOTER_BLURB =
  "Comfortable prayer mats: orthopedic memory foam, hand-spun Pakistani wool, and lightweight silk mats for travel.";

export const FOOTER_COLUMNS: { title: string; items: NavItem[] }[] = [
  {
    title: "Navigate",
    items: [
      { label: "Products", href: "/#catalog-section" },
      { label: "Why Sujood", href: "/#philosophy-section" },
      { label: "Buying Guide", href: "/prayer-mat-guide/" },
      { label: "All Guides", href: "/guides/" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    title: "Prayer Mats",
    items: [
      ...PRODUCTS.map((p) => ({ label: p.name, href: productPath(p.slug) })),
      { label: "Orthopedic Prayer Mats", href: "/orthopedic-prayer-mats/" },
      { label: "Wool Prayer Mats", href: "/wool-prayer-mats/" },
      { label: "Travel Prayer Mats", href: "/travel-prayer-mats/" },
    ],
  },
  {
    title: "Our Promise",
    items: [{ label: "Fair Trade Sourcing" }, { label: "Lifetime Edge Warranty" }],
  },
];
