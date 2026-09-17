/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Server-side render of the storefront homepage. server.ts injects the result
// into index.html at <!--app-html-->, and src/main.tsx hydrates it in the browser.

import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
