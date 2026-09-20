/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SITE_URL = "https://sujoodmats.com";
export const SITE_NAME = "Sujood Mats";
export const ORG_ID = `${SITE_URL}/#organization`;
export const DEFAULT_IMAGE = "/images/logo-og.jpg";
export const CONTACT_EMAIL = "contact@sujoodmats.com";

export const absoluteUrl = (path: string) => SITE_URL + path;
export const productPath = (slug: string) => `/products/${slug}/`;
