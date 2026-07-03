/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrayerMatProduct, Review } from "./types";

export const PRODUCTS: PrayerMatProduct[] = [
  {
    id: "rawdah-ortho",
    name: "The Rawdah Orthopedic",
    tagline: "Extra cushioning for knees and ankles",
    price: 185,
    description: "Made for comfort during prayer. The Rawdah Orthopedic has a multi-layer, medical-grade memory foam core that absorbs the impact when you kneel and prostrate, cushioning your knees, ankles, and forehead. The cover is soft Pakistani velvet.",
    material: "Dual-Density Ergonomic Core & Premium Pakistani Chenille Velvet",
    thickness: "12mm (Orthopedic Cushioning)",
    stitchCount: "620,000 knots/sqm",
    dimensions: "120cm × 70cm (Full Stance)",
    primaryColor: "oklch(0.18 0.06 145)", // Royal Emerald
    colorways: [
      { name: "Royal Emerald", hex: "#0c3b2e", bgClass: "bg-[#0c3b2e]", imageHint: "emerald", imageUrl: "/images/rawdah_mat_1782347244248.jpg" },
      { name: "Obsidian Onyx", hex: "#111111", bgClass: "bg-[#111111]", imageHint: "onyx", imageUrl: "/images/rawdah_onyx_1782767597170.jpg" },
      { name: "Saffron Rust", hex: "#8a4f35", bgClass: "bg-[#8a4f35]", imageHint: "saffron", imageUrl: "/images/rawdah_saffron_1782767615148.jpg" }
    ],
    highlights: [
      "Dual-density shock-absorbing memory foam center",
      "Medical-grade joint relief for ankles, knees, and hips",
      "Non-slip micro-textured rubber underlay",
      "Reinforced double-bound edges for perpetual shape"
    ],
    imageUrl: "/images/rawdah_mat_1782347244248.jpg",
    isCustomizable: true
  },
  {
    id: "silk-route",
    name: "The Silk Route Travel",
    tagline: "Lightweight mat for travel",
    price: 145,
    description: "Made for travel. The Silk Route is a thin, lightweight mat woven from an organic silk-and-cotton blend. It rolls or folds into a compact sleeve and fits easily in carry-on luggage, so you can pray comfortably wherever you are.",
    material: "Artisan Mulberry Silk & Long-Staple Egyptian Cotton Blend",
    thickness: "3mm (Ultra-Portable flatweave)",
    stitchCount: "480,000 knots/sqm",
    dimensions: "115cm × 65cm (Travel-optimized)",
    primaryColor: "oklch(0.35 0.06 185)", // Ocean Teal
    colorways: [
      { name: "Ocean Teal", hex: "#154c54", bgClass: "bg-[#154c54]", imageHint: "teal", imageUrl: "/images/silk_route_mat_1782347264817.jpg" },
      { name: "Pearl Alabaster", hex: "#eae4d9", bgClass: "bg-[#eae4d9]", imageHint: "alabaster", imageUrl: "/images/silk_alabaster_1782767629977.jpg" },
      { name: "Imperial Indigo", hex: "#1d253c", bgClass: "bg-[#1d253c]", imageHint: "indigo", imageUrl: "/images/silk_indigo_1782767646874.jpg" }
    ],
    highlights: [
      "Featherlight weight of only 420 grams",
      "Shimmering high-contrast weave reflecting natural light",
      "Comes with a complimentary hand-stitched leather travel sleeve",
      "Tightly bound weave structure that rejects dust and lint"
    ],
    imageUrl: "/images/silk_route_mat_1782347264817.jpg",
    isCustomizable: true
  },
  {
    id: "andalusia-wool",
    name: "The Andalusia Flatweave",
    tagline: "Traditional wool flatweave",
    price: 210,
    description: "Hand-spun from 100% Pakistani mountain wool, this classic flatweave mat features traditional Islamic geometric star patterns inspired by Andalusian architecture. The natural lanolin in the wool helps it stay warm underfoot and resist dirt, and the texture only gets better with age.",
    material: "100% Organic Hand-Spun Pakistani Wool",
    thickness: "8mm (Traditional flatweave Loom)",
    stitchCount: "Traditional hand-woven flatweave",
    dimensions: "125cm × 75cm (Spacious Premium)",
    primaryColor: "oklch(0.45 0.10 75)", // Terracotta Ochre
    colorways: [
      { name: "Terracotta Ochre", hex: "#a44d2d", bgClass: "bg-[#a44d2d]", imageHint: "terracotta", imageUrl: "/images/andalusia_mat_1782347287649.jpg" },
      { name: "Deep Navy Blue", hex: "#0f1c30", bgClass: "bg-[#0f1c30]", imageHint: "navy", imageUrl: "/images/andalusia_navy_1782767663238.jpg" },
      { name: "Warm Slate Grey", hex: "#3a4146", bgClass: "bg-[#3a4146]", imageHint: "slate", imageUrl: "/images/andalusia_slate_1782767681444.jpg" }
    ],
    highlights: [
      "100% natural mountain wool with self-cleaning lanolin qualities",
      "Intricate hand-knotted braided tassels",
      "Stained with organic botanical vegetable dyes",
      "Excellent thermal insulation for cold floors"
    ],
    imageUrl: "/images/andalusia_mat_1782347287649.jpg",
    isCustomizable: true
  }
];

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    author: "Omar K.",
    rating: 5,
    date: "May 12, 2026",
    comment: "Due to chronic knee inflammation, Sajdah was becoming physically difficult. Buying the Rawdah Orthopedic mat changed my daily practice entirely. The memory foam is highly supportive without being mushy. It has a beautiful weight and doesn't slide on hardwood.",
    verified: true,
    matPurchased: "The Rawdah Orthopedic (Royal Emerald)"
  },
  {
    id: "rev-2",
    author: "Zaynab B.",
    rating: 5,
    date: "June 03, 2026",
    comment: "I travel frequently for work and was tired of flimsy paper-thin mats. The Silk Route is exceptionally beautiful. It folds so flat in my backpack, and the silk-cotton texture catches the sunlight in hotel rooms so beautifully. The leather travel sleeve is gorgeous too.",
    verified: true,
    matPurchased: "The Silk Route Travel (Pearl Alabaster)"
  },
  {
    id: "rev-3",
    author: "Sulayman J.",
    rating: 5,
    date: "June 18, 2026",
    comment: "The Andalusia mat is a work of pure art. Woven like a real high-end rug. The natural wool smells clean, rustic, and stays completely insulated even when laid on cold ceramic tile. The star tessellations are incredibly crisp and inspire great focus.",
    verified: true,
    matPurchased: "The Andalusia Flatweave (Terracotta Ochre)"
  }
];

export const FAQS = [
  {
    question: "How do I choose between Orthopedic, Silk, and Wool?",
    answer: "If you suffer from any stiffness or discomfort in your knees, ankles, or lower back, our 12mm orthopedic memory foam (The Rawdah) is specifically engineered for medical impact relief. For frequent travelers and commuters, our Silk Route (3mm) is lightweight, fold-resistant, and premium. For a lifelong heirloom mat with rustic, natural insulation and spiritual geometric history, choose our 100% hand-spun Wool Andalusia Flatweave."
  },
  {
    question: "What is the spiritual meaning behind the patterns?",
    answer: "Islamic geometric patterns represent the infinite, unified structure of creation (Tawhid). The repetition of star tessellations symbolizes that all order flows from a single source. The 'Mihrab' (archway design) is inspired by the niche in the wall of a mosque, providing a sacred framing that guides your vision and focus during prostration."
  },
  {
    question: "How do I care for my Sujood mat?",
    answer: "Our Silk and Orthopedic velvet mats are highly stain-resistant and can be gently spot-cleaned with a damp cloth and mild botanical soap. The Andalusia wool flatweave carries natural lanolin oil which repels dirt. It simply needs periodic shaking out or vacuuming on a low setting. Do not machine-wash or submerge the orthopedic memory foam in water, as it will compromise the cellular structure."
  },
  {
    question: "Where are these mats manufactured?",
    answer: "Our velvet and chenille fabrics are sourced from established mills in Faisalabad, Pakistan, while our orthopedic foam cores are engineered and assembled in our specialized workshop. Our wool mats are woven by hand by fair-trade family weaving collectives in Pakistani villages, preserving a centuries-old cultural tradition."
  }
];
