/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Faq {
  question: string;
  /** Plain text. Rendered visibly and in FAQPage JSON-LD, so both always match. */
  answer: string;
}

export interface SeoPage {
  /** Canonical path with leading and trailing slash, e.g. "/wool-prayer-mats/". */
  path: string;
  /** <title> text (plain; escaped on render). */
  title: string;
  /** Meta description (plain). */
  description: string;
  kicker: string;
  h1: string;
  /** Plain-text intro paragraph under the H1. */
  lede: string;
  /** Trusted, hand-authored HTML for the article body. */
  bodyHtml: string;
  faqs: Faq[];
  /** Paths of other registry pages to show as "Related guides". */
  related: string[];
  schema: "article" | "product" | "collection";
  /** Last meaningful content update, YYYY-MM-DD (sitemap lastmod + dateModified). */
  updated: string;
  /** Short label and blurb used when other pages link to this one. */
  cardTitle: string;
  cardBlurb: string;
  /** Absolute-path image for og:image; defaults to the logo. */
  image?: string;
  /** Extra JSON-LD node(s) merged into the page @graph (e.g. Product). */
  jsonLd?: Record<string, unknown>[];
}
