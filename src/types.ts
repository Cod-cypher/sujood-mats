/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrayerMatProduct {
  id: string;
  name: string;
  tagline: string;
  price: number;
  description: string;
  material: string;
  thickness: string;
  stitchCount: string;
  dimensions: string;
  primaryColor: string;
  colorways: { name: string; hex: string; bgClass: string; imageHint: string; imageUrl?: string }[];
  highlights: string[];
  imageUrl: string;
  isCustomizable?: boolean;
}

export interface CustomMatConfiguration {
  baseMatId: string;
  material: "wool" | "silk" | "orthopedic";
  pattern: "mihrab" | "tessellation" | "minimalist";
  colorwayHex: string;
  tassels: "braided" | "silken" | "none";
  monogram: string; // up to 12 characters
}

export interface CartItem {
  id: string; // unique cart item ID
  productId: string; // references PrayerMatProduct.id or 'custom'
  name: string;
  price: number;
  quantity: number;
  colorway: string;
  configuration?: CustomMatConfiguration; // present if custom-built
  imageUrl: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  matPurchased: string;
}

export interface AdvisorMessage {
  sender: "user" | "advisor";
  text: string;
  timestamp: string;
}
