/**
 * LocalGenius Sites — Restaurant Template Schema
 *
 * Covers: restaurants, cafes, bakeries, food trucks, bars, bistros.
 *
 * Each section defines:
 *   - fields with types and validation
 *   - AI generation prompts per field (fed to the LLM with business context)
 *   - content constraints (character limits, required/optional)
 *
 * The AI prompts receive a `BusinessContext` object at generation time.
 * Keep prompts specific enough to produce distinct outputs across different businesses.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Business context — injected at generation time
// ---------------------------------------------------------------------------

export const BusinessContextSchema = z.object({
  name:         z.string().min(1),
  type:         z.string(),                          // "Italian restaurant", "Vietnamese cafe", etc.
  neighborhood: z.string(),
  city:         z.string(),
  tagline:      z.string().optional(),
  specialties:  z.array(z.string()).optional(),
  priceRange:   z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  vibe:         z.string().optional(),               // "cozy family spot", "upscale date night", etc.
  yearsOpen:    z.number().optional(),
  ownerName:    z.string().optional(),
  phoneNumber:  z.string().optional(),
  address:      z.string().optional(),
  reservations: z.boolean().optional(),
});

export type BusinessContext = z.infer<typeof BusinessContextSchema>;

// ---------------------------------------------------------------------------
// Shared field types
// ---------------------------------------------------------------------------

export const ImageFieldSchema = z.object({
  url:  z.string().url(),
  alt:  z.string().max(150),
  width:  z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const HoursSchema = z.object({
  monday:    z.string().optional(),
  tuesday:   z.string().optional(),
  wednesday: z.string().optional(),
  thursday:  z.string().optional(),
  friday:    z.string().optional(),
  saturday:  z.string().optional(),
  sunday:    z.string().optional(),
  notes:     z.string().max(200).optional(),  // "Happy hour 4-6pm", "Closed holidays"
});

// ---------------------------------------------------------------------------
// Section: Hero
// The first impression. Gets one shot. Must stop the scroll.
// ---------------------------------------------------------------------------

export const HeroSectionSchema = z.object({
  _type: z.literal('hero'),

  headline: z.string().min(5).max(80),
  subheadline: z.string().min(10).max(160).optional(),
  backgroundImage: ImageFieldSchema,
  ctaPrimary: z.object({
    label: z.string().max(30),
    href:  z.string(),
  }),
  ctaSecondary: z.object({
    label: z.string().max(30),
    href:  z.string(),
  }).optional(),
});

export const heroPrompts = {
  headline: (ctx: BusinessContext) => `
    Write a single headline (5–80 characters) for the hero section of ${ctx.name}'s website.
    They are a ${ctx.type} in ${ctx.neighborhood}, ${ctx.city}.
    ${ctx.vibe ? `Vibe: ${ctx.vibe}.` : ''}
    ${ctx.specialties?.length ? `Known for: ${ctx.specialties.join(', ')}.` : ''}

    Rules:
    - Do not use the restaurant name in the headline (it's already shown in the logo)
    - Do not use generic phrases like "Welcome to" or "Come taste"
    - Lead with what makes this place worth visiting: an emotion, a sensory detail, or a promise
    - Write in the voice of someone who eats here and loves it, not a marketing department
    - No exclamation points

    Examples of the right spirit (not to copy):
    - "Where the dumplings are made before sunrise"
    - "Fifty years of the same red sauce"
    - "The table in the corner has your name on it"

    Output: just the headline text, nothing else.
  `.trim(),

  subheadline: (ctx: BusinessContext) => `
    Write a supporting line (10–160 characters) that follows this headline for ${ctx.name}.
    It should add one specific, true detail that earns trust or builds appetite.
    ${ctx.reservations ? 'They take reservations.' : 'Walk-ins welcome.'}
    ${ctx.priceRange ? `Price range: ${ctx.priceRange}.` : ''}

    Rules:
    - One sentence or fragment
    - Specific over generic ("handmade pasta since 1978" beats "great food and atmosphere")
    - Include a practical nudge if possible (reservations, hours, location)

    Output: just the subheadline text, nothing else.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: About
// The human story. Why this place exists. Who made it.
// ---------------------------------------------------------------------------

export const AboutSectionSchema = z.object({
  _type: z.literal('about'),

  heading:   z.string().max(60),
  body:      z.string().min(80).max(600),
  image:     ImageFieldSchema.optional(),
  highlight: z.string().max(120).optional(),   // Pull quote or bold statement
});

export const aboutPrompts = {
  heading: (ctx: BusinessContext) => `
    Write a section heading (max 60 chars) for the About section of ${ctx.name}.
    Avoid: "About Us", "Our Story", "Who We Are" — these are invisible.
    Instead, lead with the truth: what this place is really about.
    ${ctx.ownerName ? `Owner: ${ctx.ownerName}.` : ''}

    Output: just the heading, nothing else.
  `.trim(),

  body: (ctx: BusinessContext) => `
    Write 2–4 paragraphs (80–600 characters total) about ${ctx.name}, a ${ctx.type} in ${ctx.city}.
    ${ctx.ownerName ? `Owner: ${ctx.ownerName}.` : ''}
    ${ctx.yearsOpen ? `In business for ${ctx.yearsOpen} years.` : ''}
    ${ctx.vibe ? `Character: ${ctx.vibe}.` : ''}

    Rules:
    - Write from the owner's perspective, first person optional
    - Include one specific detail that couldn't be true of any other restaurant
    - Do not list adjectives ("friendly staff, fresh ingredients, great atmosphere")
    - End with a reason to visit, not a platitude
    - Sound like a real person wrote it, not a press release

    Output: the body text only, paragraph breaks as newlines.
  `.trim(),

  highlight: (ctx: BusinessContext) => `
    Write a single bold statement (max 120 chars) to pull out of the About section.
    This is the one thing ${ctx.name} wants a skimmer to notice.
    Make it concrete, memorable, and true to this business.

    Output: just the statement, nothing else.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: Menu
// The product. Show it with pride and clarity.
// ---------------------------------------------------------------------------

export const MenuItemSchema = z.object({
  name:        z.string().max(60),
  description: z.string().max(160).optional(),
  price:       z.string().max(20),             // "18" or "18–24" or "Market"
  dietary:     z.array(z.enum(['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'contains-nuts', 'spicy'])).optional(),
  featured:    z.boolean().optional(),
  image:       ImageFieldSchema.optional(),
});

export const MenuCategorySchema = z.object({
  name:        z.string().max(40),
  description: z.string().max(120).optional(),
  items:       z.array(MenuItemSchema).min(1).max(20),
});

export const MenuSectionSchema = z.object({
  _type:      z.literal('menu'),
  heading:    z.string().max(40).default('Menu'),
  categories: z.array(MenuCategorySchema).min(1).max(8),
  pdfLink:    z.string().url().optional(),      // Link to full PDF menu
  note:       z.string().max(200).optional(),    // "Menu changes seasonally", etc.
});

export const menuPrompts = {
  itemDescription: (ctx: BusinessContext, itemName: string) => `
    Write a menu description (max 160 chars) for "${itemName}" at ${ctx.name}, a ${ctx.type}.
    ${ctx.specialties?.length ? `House specialties include: ${ctx.specialties.join(', ')}.` : ''}

    Rules:
    - Describe what it tastes like, not just what's in it
    - Use one or two sensory words maximum — restraint signals confidence
    - Never use the word "delicious", "amazing", "mouth-watering", or "fresh"
    - No exclamation points
    - If you don't know the exact ingredients, describe the dish's character

    Output: just the description, nothing else.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: Hours & Location
// The practical section. Accuracy is everything here.
// ---------------------------------------------------------------------------

export const HoursSectionSchema = z.object({
  _type:   z.literal('hours'),
  heading: z.string().max(40).default('Hours & Location'),
  hours:   HoursSchema,
  address: z.object({
    street: z.string(),
    city:   z.string(),
    state:  z.string().length(2),
    zip:    z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
  phone:          z.string().optional(),
  parkingNote:    z.string().max(150).optional(),
  transitNote:    z.string().max(150).optional(),
  reservationUrl: z.string().url().optional(),
  mapEmbedUrl:    z.string().url().optional(),
});

// Hours section is factual — no AI prompt generation; owner fills this in directly.
// The only prompt is for parking/transit notes if none are provided:
export const hoursPrompts = {
  parkingNote: (ctx: BusinessContext) => `
    Write a one-sentence parking or arrival note (max 150 chars) for ${ctx.name} in ${ctx.neighborhood}, ${ctx.city}.
    Be helpful and specific. If neighborhood is known for parking difficulty, acknowledge it gracefully.
    Output: just the note, nothing else.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: Reviews
// Social proof. Real voices that earn trust.
// ---------------------------------------------------------------------------

export const ReviewSchema = z.object({
  quote:      z.string().min(20).max(300),
  author:     z.string().max(60),
  source:     z.enum(['google', 'yelp', 'tripadvisor', 'direct']).optional(),
  rating:     z.number().min(1).max(5).optional(),
  date:       z.string().optional(),            // ISO date string
});

export const ReviewsSectionSchema = z.object({
  _type:   z.literal('reviews'),
  heading: z.string().max(40).default('What People Say'),
  reviews: z.array(ReviewSchema).min(1).max(6),
  aggregateRating: z.object({
    score:  z.number().min(1).max(5),
    count:  z.number().positive(),
    source: z.string(),
  }).optional(),
});

// Reviews are always real — no AI generation prompts. They must be sourced.
// The system will surface the owner's highest-rated real reviews.

// ---------------------------------------------------------------------------
// Section: Gallery
// Let the food speak. Images require editorial taste.
// ---------------------------------------------------------------------------

export const GallerySectionSchema = z.object({
  _type:   z.literal('gallery'),
  heading: z.string().max(40).optional(),
  images:  z.array(ImageFieldSchema).min(3).max(12),
  layout:  z.enum(['grid', 'masonry', 'carousel']).default('masonry'),
});

// ---------------------------------------------------------------------------
// Complete Restaurant Schema
// ---------------------------------------------------------------------------

export const RestaurantSiteSchema = z.object({
  _type:   z.literal('restaurantSite'),
  theme:   z.literal('craft'),
  version: z.number().default(1),

  // Required sections
  hero:     HeroSectionSchema,
  about:    AboutSectionSchema,
  menu:     MenuSectionSchema,
  hours:    HoursSectionSchema,

  // Optional sections — ordered by impact
  gallery:  GallerySectionSchema.optional(),
  reviews:  ReviewsSectionSchema.optional(),

  // Global
  meta: z.object({
    title:       z.string().max(60),
    description: z.string().max(160),
    ogImage:     z.string().url().optional(),
  }),
  contact: z.object({
    phone:       z.string().optional(),
    email:       z.string().email().optional(),
    instagram:   z.string().optional(),
    facebook:    z.string().optional(),
  }).optional(),
});

export type RestaurantSite = z.infer<typeof RestaurantSiteSchema>;

// ---------------------------------------------------------------------------
// Default section ordering for AI-generated sites
// ---------------------------------------------------------------------------

export const defaultSectionOrder: RestaurantSite['_type'] extends string
  ? string[]
  : string[] = [
  'hero',
  'about',
  'menu',
  'gallery',
  'reviews',
  'hours',
];

// ---------------------------------------------------------------------------
// AI generation prompt — meta fields
// ---------------------------------------------------------------------------

export const metaPrompts = {
  title: (ctx: BusinessContext) => `
    Write a page title (max 60 chars) for ${ctx.name}'s website.
    Format: "[Name] — [What They Are] in [City]"
    Keep it factual and search-friendly.
    Output: just the title.
  `.trim(),

  description: (ctx: BusinessContext) => `
    Write a meta description (max 160 chars) for ${ctx.name}, a ${ctx.type} in ${ctx.neighborhood}, ${ctx.city}.
    ${ctx.specialties?.length ? `Known for: ${ctx.specialties.slice(0, 3).join(', ')}.` : ''}
    Include a reason to click (hours, location, specialty, reputation).
    Output: just the description.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Content validation helpers
// ---------------------------------------------------------------------------

export function validateRestaurantSite(data: unknown): RestaurantSite {
  return RestaurantSiteSchema.parse(data);
}

export function isValidHours(hours: z.infer<typeof HoursSchema>): boolean {
  // At least one day must have hours defined
  return Object.values(hours).some(
    (v) => typeof v === 'string' && v.length > 0
  );
}
