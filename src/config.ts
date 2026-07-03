/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Base URL for the backend API.
// - Empty (dev / same-origin): requests use relative paths and hit the local
//   server that also serves the frontend.
// - Set VITE_API_URL at build time (e.g. https://api.sujoodmats.com) when the
//   frontend is hosted separately from the backend (GitHub Pages -> Ubuntu).
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return API_BASE + path;
}
