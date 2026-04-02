/**
 * LocalGenius Sites — Professional Services Template Schema
 *
 * Covers: plumbers, electricians, HVAC, lawyers, accountants, consultants,
 * therapists, financial advisors, insurance agents, real estate agents.
 *
 * The primary job of every section: build trust fast.
 * Professional services customers are anxious. They have a problem.
 * They need to know: "Can this person solve it? Are they safe to hire?"
 *
 * Every field prompt is written to answer those two questions.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Business context — injected at generation time
// ---------------------------------------------------------------------------

export const ProfessionalContextSchema = z.object({
  name:            z.string().min(1),
  ownerName:       z.string().optional(),
  businessType:    z.string(),                         // "plumber", "family law attorney", etc.
  vertical:        z.enum([
    'trades',          // plumber, electrician, HVAC, contractor
    'legal',           // attorney, law firm
    'financial',       // accountant, financial advisor, insurance
    'consulting',      // business consultant, coach
    'healthcare',      // therapist, chiropractor, dentist
    'real_estate',     // agent, broker, property manager
    'other',
  ]),
  city:            z.string(),
  serviceArea:     z.string().optional(),              // "Greater Boston area"
  yearsExperience: z.number().optional(),
  licenseNumber:   z.string().optional(),
  certifications:  z.array(z.string()).optional(),
  specialties:     z.array(z.string()).optional(),
  phoneNumber:     z.string().optional(),
  emergencyLine:   z.boolean().optional(),             // Plumbers/electricians: 24/7?
  consultationFree: z.boolean().optional(),
  tagline:         z.string().optional(),
});

export type ProfessionalContext = z.infer<typeof ProfessionalContextSchema>;

// ---------------------------------------------------------------------------
// Shared field types
// ---------------------------------------------------------------------------

export const ImageFieldSchema = z.object({
  url:    z.string().url(),
  alt:    z.string().max(150),
  width:  z.number().positive().optional(),
  height: z.number().positive().optional(),
});

// ---------------------------------------------------------------------------
// Section: Hero
// The most important 3 seconds. Instantly communicates: what you do, for whom,
// and why you're the safe choice.
// ---------------------------------------------------------------------------

export const HeroSectionSchema = z.object({
  _type:           z.literal('hero'),
  headline:        z.string().min(5).max(80),
  subheadline:     z.string().min(10).max(180).optional(),
  backgroundImage: ImageFieldSchema.optional(),
  trustBadges:     z.array(z.string().max(40)).max(4).optional(),  // "Licensed & Insured", "15+ Years", etc.
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
  headline: (ctx: ProfessionalContext) => `
    Write a hero headline (5–80 chars) for ${ctx.name}'s professional services website.
    They are a ${ctx.businessType} in ${ctx.city}.
    ${ctx.specialties?.length ? `Specialties: ${ctx.specialties.join(', ')}.` : ''}
    ${ctx.emergencyLine ? 'They offer 24/7 emergency service.' : ''}

    Rules:
    - Lead with the customer's outcome, not the service provider's credentials
    - Do not use the business name (shown in the logo)
    - Avoid: "Your Trusted [X]", "We're Here to Help", "Quality You Can Count On"
    - Be specific about the problem solved or the outcome delivered
    - Tone: calm confidence — not a sales pitch, not a promise they can't keep
    - No exclamation points

    Examples of the right spirit (not to copy):
    - "Leaks fixed. Same day."
    - "Wills that actually protect your family"
    - "Your books done right. Your taxes done on time."

    Output: just the headline text, nothing else.
  `.trim(),

  subheadline: (ctx: ProfessionalContext) => `
    Write a subheadline (10–180 chars) for ${ctx.name}'s hero section.
    It should build on the headline by adding one trust signal or specific detail.
    ${ctx.yearsExperience ? `${ctx.yearsExperience} years in business.` : ''}
    ${ctx.serviceArea ? `Service area: ${ctx.serviceArea}.` : `Based in ${ctx.city}.`}
    ${ctx.consultationFree ? 'Free consultations available.' : ''}
    ${ctx.certifications?.length ? `Certified: ${ctx.certifications.join(', ')}.` : ''}

    Rules:
    - One sentence, max
    - Include at least one verifiable fact (years, certifications, service area, license)
    - End with a soft call to action if space allows

    Output: just the subheadline, nothing else.
  `.trim(),

  trustBadges: (ctx: ProfessionalContext) => `
    Generate 2–4 short trust badges (max 40 chars each) for ${ctx.name}, a ${ctx.businessType}.
    ${ctx.yearsExperience ? `${ctx.yearsExperience}+ years experience.` : ''}
    ${ctx.licenseNumber ? 'Licensed.' : ''}
    ${ctx.certifications?.length ? `Certifications: ${ctx.certifications.join(', ')}.` : ''}

    Examples: "Licensed & Insured", "15+ Years Experience", "Same-Day Service", "Free Estimates"
    Output: a JSON array of strings, nothing else. E.g. ["Licensed & Insured", "15+ Years"]
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: About
// Credibility + humanity. The customer needs to know this person is competent
// AND someone they'd let into their home or trust with their legal matter.
// ---------------------------------------------------------------------------

export const AboutSectionSchema = z.object({
  _type:     z.literal('about'),
  heading:   z.string().max(60),
  body:      z.string().min(80).max(700),
  image:     ImageFieldSchema.optional(),
  highlight: z.string().max(120).optional(),
  credentials: z.array(z.object({
    label: z.string().max(60),
    icon:  z.string().optional(),  // icon name from design system
  })).max(6).optional(),
});

export const aboutPrompts = {
  heading: (ctx: ProfessionalContext) => `
    Write an About section heading (max 60 chars) for ${ctx.name}.
    ${ctx.ownerName ? `Owner/principal: ${ctx.ownerName}.` : ''}
    Avoid: "About Us", "Meet the Team", "Who We Are"
    Lead with what makes this professional worth trusting.
    Output: just the heading.
  `.trim(),

  body: (ctx: ProfessionalContext) => `
    Write 2–4 paragraphs (80–700 chars total) about ${ctx.name}, a ${ctx.businessType} in ${ctx.city}.
    ${ctx.ownerName ? `Owner/principal: ${ctx.ownerName}.` : ''}
    ${ctx.yearsExperience ? `${ctx.yearsExperience} years in business.` : ''}
    ${ctx.specialties?.length ? `Specialties: ${ctx.specialties.join(', ')}.` : ''}
    ${ctx.certifications?.length ? `Credentials: ${ctx.certifications.join(', ')}.` : ''}

    Rules:
    - Establish competence in paragraph 1 (facts, credentials, experience)
    - Add humanity in paragraph 2 (why they got into this work, what they care about)
    - Paragraph 3 (optional): who they specifically serve best
    - No buzzwords: "passionate", "dedicated", "committed", "solutions"
    - No claims that can't be verified ("the best in the city")
    - Write as if speaking to a worried customer, not a LinkedIn audience

    Output: body text only, paragraph breaks as newlines.
  `.trim(),

  highlight: (ctx: ProfessionalContext) => `
    Write a single pull quote (max 120 chars) that a ${ctx.businessType} customer should notice when skimming.
    Make it the most trust-building true statement about ${ctx.name}.
    Output: just the statement.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: Services
// The product listing. Clarity here is credibility.
// ---------------------------------------------------------------------------

export const ServiceSchema = z.object({
  name:        z.string().max(60),
  description: z.string().min(20).max(250),
  icon:        z.string().optional(),          // Icon name from design system
  featured:    z.boolean().optional(),
  startingAt:  z.string().max(20).optional(),  // "Starting at $150", "Free estimate"
  duration:    z.string().max(40).optional(),  // "Same-day available", "4–6 week process"
});

export const ServicesSectionSchema = z.object({
  _type:    z.literal('services'),
  heading:  z.string().max(60).default('Services'),
  subheading: z.string().max(120).optional(),
  services: z.array(ServiceSchema).min(1).max(12),
  layout:   z.enum(['grid', 'list', 'cards']).default('cards'),
  cta:      z.object({
    label: z.string().max(40),
    href:  z.string(),
  }).optional(),
});

export const servicesPrompts = {
  serviceDescription: (ctx: ProfessionalContext, serviceName: string) => `
    Write a service description (20–250 chars) for "${serviceName}" offered by ${ctx.name}, a ${ctx.businessType}.

    Rules:
    - Start with what the customer gets, not what the provider does
    - Include one specific detail (turnaround time, what's included, a common scenario)
    - Avoid: "we provide", "our team offers", "comprehensive", "tailored solutions"
    - End with a reassurance if space allows (e.g., "No hidden fees", "Same-day available")

    Output: just the description.
  `.trim(),

  subheading: (ctx: ProfessionalContext) => `
    Write a services section subheading (max 120 chars) for ${ctx.name}.
    It should reassure customers that their specific problem is covered.
    ${ctx.specialties?.length ? `Key specialties: ${ctx.specialties.join(', ')}.` : ''}
    Output: just the subheading.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: Testimonials
// The most trusted content on the page. Real voices only.
// ---------------------------------------------------------------------------

export const TestimonialSchema = z.object({
  quote:    z.string().min(30).max(350),
  author:   z.string().max(60),
  title:    z.string().max(60).optional(),    // "Small Business Owner", "Homeowner in Newton, MA"
  source:   z.enum(['google', 'yelp', 'direct', 'linkedin', 'other']).optional(),
  rating:   z.number().min(1).max(5).optional(),
  verified: z.boolean().optional(),
});

export const TestimonialsSectionSchema = z.object({
  _type:       z.literal('testimonials'),
  heading:     z.string().max(60).default('What Clients Say'),
  testimonials: z.array(TestimonialSchema).min(1).max(6),
  aggregateRating: z.object({
    score:   z.number().min(1).max(5),
    count:   z.number().positive(),
    source:  z.string(),
  }).optional(),
});

// Testimonials are always real — no AI generation. System surfaces owner's highest-rated reviews.

// ---------------------------------------------------------------------------
// Section: Contact
// The conversion point. Make it easy. Remove every friction point.
// ---------------------------------------------------------------------------

export const ContactSectionSchema = z.object({
  _type:    z.literal('contact'),
  heading:  z.string().max(60).default('Get in Touch'),
  subheading: z.string().max(180).optional(),
  phone:    z.string().optional(),
  email:    z.string().email().optional(),
  address:  z.object({
    street: z.string(),
    city:   z.string(),
    state:  z.string().length(2),
    zip:    z.string().regex(/^\d{5}(-\d{4})?$/),
  }).optional(),
  showContactForm: z.boolean().default(true),
  formFields: z.array(z.enum([
    'name', 'email', 'phone', 'message', 'service_type', 'preferred_time',
  ])).default(['name', 'email', 'phone', 'message']),
  responsePromise: z.string().max(80).optional(),  // "We respond within 2 hours"
  emergencyNote:   z.string().max(120).optional(),  // "24/7 emergency line: ..."
  mapEmbedUrl:     z.string().url().optional(),
});

export const contactPrompts = {
  heading: (ctx: ProfessionalContext) => `
    Write a contact section heading (max 60 chars) for ${ctx.name}.
    Avoid "Contact Us" — make it action-oriented.
    ${ctx.consultationFree ? 'Free consultations available.' : ''}
    ${ctx.emergencyLine ? '24/7 emergency line.' : ''}
    Output: just the heading.
  `.trim(),

  subheading: (ctx: ProfessionalContext) => `
    Write a contact subheading (max 180 chars) for ${ctx.name} that removes hesitation.
    ${ctx.consultationFree ? 'Include that consultations are free.' : ''}
    ${ctx.emergencyLine ? 'Include that they are available 24/7 for emergencies.' : ''}
    Make it easy and low-risk for the customer to reach out.
    Output: just the subheading.
  `.trim(),

  responsePromise: (_ctx: ProfessionalContext) => `
    Write a short response-time promise (max 80 chars).
    Examples: "We respond within 4 business hours", "You'll hear from us today"
    Be conservative — underpromise, overdeliver.
    Output: just the promise.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Section: FAQ
// Pre-empts objections. Answers the questions customers are afraid to ask.
// ---------------------------------------------------------------------------

export const FAQItemSchema = z.object({
  question: z.string().min(10).max(120),
  answer:   z.string().min(20).max(500),
});

export const FAQSectionSchema = z.object({
  _type:    z.literal('faq'),
  heading:  z.string().max(60).default('Common Questions'),
  faqs:     z.array(FAQItemSchema).min(3).max(10),
});

export const faqPrompts = {
  generateFAQs: (ctx: ProfessionalContext) => `
    Generate 4–6 FAQ pairs for ${ctx.name}, a ${ctx.businessType} in ${ctx.city}.
    ${ctx.specialties?.length ? `Specialties: ${ctx.specialties.join(', ')}.` : ''}
    ${ctx.consultationFree ? 'Free consultations.' : ''}
    ${ctx.emergencyLine ? '24/7 emergency service.' : ''}

    Rules:
    - Questions must be things a real, anxious customer actually asks before hiring
    - Answers must be specific and honest — no hedge words like "it depends" without specifics
    - At least one question about pricing/cost (most customers fear hidden fees)
    - At least one question about process ("what happens after I call?")
    - At least one question about credentials or legitimacy
    - Write in plain language — no jargon

    Output: a JSON array of {"question": "...", "answer": "..."} pairs, nothing else.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Complete Professional Services Schema
// ---------------------------------------------------------------------------

export const ProfessionalSiteSchema = z.object({
  _type:   z.literal('professionalSite'),
  theme:   z.literal('professional'),
  version: z.number().default(1),

  // Required sections
  hero:         HeroSectionSchema,
  about:        AboutSectionSchema,
  services:     ServicesSectionSchema,
  contact:      ContactSectionSchema,

  // High-value optional sections
  testimonials: TestimonialsSectionSchema.optional(),
  faq:          FAQSectionSchema.optional(),

  // Global
  meta: z.object({
    title:       z.string().max(60),
    description: z.string().max(160),
    ogImage:     z.string().url().optional(),
  }),
  businessInfo: z.object({
    phone:         z.string().optional(),
    email:         z.string().email().optional(),
    licenseNumber: z.string().optional(),
    linkedin:      z.string().optional(),
    facebook:      z.string().optional(),
  }).optional(),
});

export type ProfessionalSite = z.infer<typeof ProfessionalSiteSchema>;

// ---------------------------------------------------------------------------
// Default section ordering — optimized for conversion
// ---------------------------------------------------------------------------

export const defaultSectionOrder: string[] = [
  'hero',
  'services',
  'about',
  'testimonials',
  'faq',
  'contact',
];

// ---------------------------------------------------------------------------
// Meta prompts
// ---------------------------------------------------------------------------

export const metaPrompts = {
  title: (ctx: ProfessionalContext) => `
    Write a page title (max 60 chars) for ${ctx.name}'s website.
    They are a ${ctx.businessType} in ${ctx.city}.
    Format: "[Name] — [What They Do] in [City]"
    Output: just the title.
  `.trim(),

  description: (ctx: ProfessionalContext) => `
    Write a meta description (max 160 chars) for ${ctx.name}, a ${ctx.businessType} in ${ctx.city}.
    ${ctx.specialties?.length ? `Specialties: ${ctx.specialties.slice(0, 2).join(', ')}.` : ''}
    ${ctx.yearsExperience ? `${ctx.yearsExperience}+ years experience.` : ''}
    Include: what they do, where, and one trust signal.
    Output: just the description.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validateProfessionalSite(data: unknown): ProfessionalSite {
  return ProfessionalSiteSchema.parse(data);
}

export function getVerticalDefaults(vertical: ProfessionalContext['vertical']): {
  defaultServices: string[];
  defaultFAQTopics: string[];
  emergencyCapable: boolean;
} {
  const map = {
    trades: {
      defaultServices:   ['Emergency Repairs', 'Installation', 'Inspection', 'Maintenance'],
      defaultFAQTopics:  ['How quickly can you come?', 'Do you offer free estimates?', 'Are you licensed and insured?'],
      emergencyCapable:  true,
    },
    legal: {
      defaultServices:   ['Consultation', 'Case Evaluation', 'Representation', 'Document Preparation'],
      defaultFAQTopics:  ['How do you charge?', 'What is the process?', 'How long will it take?'],
      emergencyCapable:  false,
    },
    financial: {
      defaultServices:   ['Tax Preparation', 'Financial Planning', 'Bookkeeping', 'Business Advisory'],
      defaultFAQTopics:  ['What are your fees?', 'How do I get started?', 'What records do I need?'],
      emergencyCapable:  false,
    },
    consulting: {
      defaultServices:   ['Strategy Session', 'Audit & Assessment', 'Implementation', 'Ongoing Advisory'],
      defaultFAQTopics:  ['What industries do you serve?', 'How do engagements work?', 'What results can I expect?'],
      emergencyCapable:  false,
    },
    healthcare: {
      defaultServices:   ['Initial Consultation', 'Ongoing Care', 'Specialized Treatment', 'Telehealth'],
      defaultFAQTopics:  ['Do you accept insurance?', 'What should I expect?', 'How do I schedule?'],
      emergencyCapable:  false,
    },
    real_estate: {
      defaultServices:   ['Buyer Representation', 'Seller Representation', 'Market Analysis', 'Property Management'],
      defaultFAQTopics:  ['What are your commission rates?', 'How long will it take to sell?', 'How do I start?'],
      emergencyCapable:  false,
    },
    other: {
      defaultServices:   ['Consultation', 'Primary Service', 'Follow-up', 'Support'],
      defaultFAQTopics:  ['How do I get started?', 'What are your rates?', 'What is included?'],
      emergencyCapable:  false,
    },
  };
  return map[vertical];
}
