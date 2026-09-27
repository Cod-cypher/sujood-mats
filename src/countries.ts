/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Countries for the checkout's shipping form. Only the ISO 3166-1 alpha-2 codes are kept
// here; the names come from the browser, so they are always spelled the standard way.

const CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW";

export interface Country {
  code: string;
  name: string;
}

let cached: Country[] | null = null;

/** Every country, sorted by name. */
export function countries(): Country[] {
  if (cached) return cached;
  let nameOf: (code: string) => string = (code) => code;
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    nameOf = (code) => names.of(code) ?? code;
  } catch {
    /* very old browser: the codes themselves are still selectable */
  }
  cached = CODES.split(/\s+/)
    .map((code) => ({ code, name: nameOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return cached;
}

export const countryName = (code: string) => countries().find((c) => c.code === code)?.name ?? "";

/** The visitor's likely country, from their browser's language (en-GB -> GB), or "". */
export function guessCountryCode(): string {
  try {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(tag).region;
      if (region && countries().some((c) => c.code === region)) return region;
    }
  } catch {
    /* no guess */
  }
  return "";
}
