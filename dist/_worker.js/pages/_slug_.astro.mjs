globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as addAttribute, b as renderHead, e as renderTemplate, f as createAstro } from '../chunks/astro_BceOcufW.mjs';
export { r as renderers } from '../chunks/astro_BceOcufW.mjs';
import '../chunks/kleur_DHimoS-P.mjs';
/* empty css                                 */

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { slug } = Astro2.params;
  const site = {
    name: "Maria's Kitchen",
    phone: "(773) 555-0142",
    address: {
      street: "2847 N. Milwaukee Ave",
      city: "Chicago",
      state: "IL",
      zip: "60647"
    },
    hero: {
      headline: "Where the noodles are rolled before the sun comes up",
      subheadline: "Family recipes from Oaxaca, made fresh daily. Walk-ins welcome.",
      backgroundImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
      ctaPrimary: { label: "View Our Menu", href: `/${slug}/menu` },
      ctaSecondary: { label: "Book a Table", href: `/${slug}/contact` }
    },
    about: {
      heading: "Three generations of the same red sauce",
      body: "When my grandmother came to Chicago in 1972, she carried two things: her cast-iron comal and a notebook of recipes written in pencil. Maria's Kitchen started as weekend tamales sold from our front porch. Twenty-six years later, we are still cooking from that same notebook.\n\nWe make everything by hand \u2014 the tortillas, the mole, the carnitas that take fourteen hours. Nothing comes from a can, nothing from a freezer. If we run out, we run out. That is the only way we know how to do it.",
      highlight: "Every dish made from scratch, every day, no exceptions."
    },
    menuHighlights: [
      { name: "Mole Poblano", description: "Slow-simmered with 22 ingredients, served over chicken with handmade tortillas", price: "19", image: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&q=80" },
      { name: "Carnitas Plate", description: "Fourteen-hour braised pork shoulder, crispy edges, pickled onion, cilantro rice", price: "17", image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80" },
      { name: "Tamales (3)", description: "Corn masa steamed in banana leaf \u2014 chicken tinga, rajas, or black bean", price: "14", image: "https://images.unsplash.com/photo-1604467707321-70d009801bf9?w=600&q=80" },
      { name: "Churros con Cajeta", description: "Crisp cinnamon dough with warm goat-milk caramel for dipping", price: "9", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80" }
    ],
    hours: {
      monday: "Closed",
      tuesday: "11:00 AM - 9:00 PM",
      wednesday: "11:00 AM - 9:00 PM",
      thursday: "11:00 AM - 9:00 PM",
      friday: "11:00 AM - 10:00 PM",
      saturday: "10:00 AM - 10:00 PM",
      sunday: "10:00 AM - 8:00 PM",
      notes: "Kitchen closes 30 minutes before close"
    },
    reviews: [
      { quote: "The mole here is unlike anything else in the city. You can taste the hours that went into it. We drive 45 minutes and it is always worth it.", author: "Rosa M.", rating: 5, source: "Google" },
      { quote: "My family has been coming every Sunday for three years. The tamales remind my mother of home, and that says everything.", author: "Carlos D.", rating: 5, source: "Google" },
      { quote: "Unpretentious, honest, and absolutely delicious. The carnitas plate is the best I have had outside of Mexico.", author: "James T.", rating: 5, source: "Yelp" }
    ],
    aggregateRating: { score: 4.8, count: 247, source: "Google" },
    meta: {
      title: "Maria's Kitchen \u2014 Mexican Restaurant in Chicago",
      description: "Handmade Mexican food in Logan Square. Mole, carnitas, tamales made from scratch daily. Walk-ins welcome. Open Tue-Sun."
    }
  };
  function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => i < rating ? "\u2605" : "\u2606").join("");
  }
  return renderTemplate`<html lang="en" data-astro-cid-rgoq6dm6> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${site.meta.title}</title><meta name="description"${addAttribute(site.meta.description, "content")}><meta property="og:title"${addAttribute(site.meta.title, "content")}><meta property="og:description"${addAttribute(site.meta.description, "content")}><meta property="og:type" content="website"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-rgoq6dm6> <!-- Nav --> <nav class="nav" data-astro-cid-rgoq6dm6> <div class="container nav__inner" data-astro-cid-rgoq6dm6> <a${addAttribute(`/${slug}`, "href")} class="nav__brand" data-astro-cid-rgoq6dm6>${site.name}</a> <ul class="nav__links" data-astro-cid-rgoq6dm6> <li data-astro-cid-rgoq6dm6><a${addAttribute(`/${slug}/menu`, "href")} data-astro-cid-rgoq6dm6>Menu</a></li> <li data-astro-cid-rgoq6dm6><a${addAttribute(`/${slug}/contact`, "href")} data-astro-cid-rgoq6dm6>Contact</a></li> </ul> </div> </nav> <!-- Hero --> <section class="hero" data-astro-cid-rgoq6dm6> <div class="hero__bg"${addAttribute(`background-image: url('${site.hero.backgroundImage}')`, "style")} data-astro-cid-rgoq6dm6></div> <div class="hero__overlay" data-astro-cid-rgoq6dm6></div> <div class="hero__content" data-astro-cid-rgoq6dm6> <h1 class="hero__headline" data-astro-cid-rgoq6dm6>${site.hero.headline}</h1> <p class="hero__subheadline" data-astro-cid-rgoq6dm6>${site.hero.subheadline}</p> <div class="hero__actions" data-astro-cid-rgoq6dm6> <a${addAttribute(site.hero.ctaPrimary.href, "href")} class="btn btn--primary" data-astro-cid-rgoq6dm6>${site.hero.ctaPrimary.label}</a> ${site.hero.ctaSecondary && renderTemplate`<a${addAttribute(site.hero.ctaSecondary.href, "href")} class="btn btn--outline" data-astro-cid-rgoq6dm6>${site.hero.ctaSecondary.label}</a>`} </div> </div> </section> <!-- About --> <section class="section" id="about" data-astro-cid-rgoq6dm6> <div class="container" data-astro-cid-rgoq6dm6> <p class="section__label" data-astro-cid-rgoq6dm6>Our Story</p> <h2 class="section__heading" data-astro-cid-rgoq6dm6>${site.about.heading}</h2> <div class="about__grid" data-astro-cid-rgoq6dm6> <div class="about__body" data-astro-cid-rgoq6dm6> ${site.about.body.split("\n").filter((p) => p.trim()).map((paragraph) => renderTemplate`<p data-astro-cid-rgoq6dm6>${paragraph}</p>`)} ${renderTemplate`<blockquote class="about__highlight" data-astro-cid-rgoq6dm6>${site.about.highlight}</blockquote>`} </div> </div> </div> </section> <!-- Menu Highlights --> <section class="section section--sunken" id="menu" data-astro-cid-rgoq6dm6> <div class="container" data-astro-cid-rgoq6dm6> <p class="section__label" data-astro-cid-rgoq6dm6>From the Kitchen</p> <h2 class="section__heading" data-astro-cid-rgoq6dm6>What to Order</h2> <div class="menu-grid" data-astro-cid-rgoq6dm6> ${site.menuHighlights.map((item) => renderTemplate`<div class="menu-card" data-astro-cid-rgoq6dm6> <img${addAttribute(item.image, "src")}${addAttribute(item.name, "alt")} class="menu-card__image" loading="lazy" width="600" height="400" data-astro-cid-rgoq6dm6> <div class="menu-card__body" data-astro-cid-rgoq6dm6> <div class="menu-card__header" data-astro-cid-rgoq6dm6> <span class="menu-card__name" data-astro-cid-rgoq6dm6>${item.name}</span> <span class="menu-card__price" data-astro-cid-rgoq6dm6>$${item.price}</span> </div> <p class="menu-card__desc" data-astro-cid-rgoq6dm6>${item.description}</p> </div> </div>`)} </div> <div class="menu-section__link" data-astro-cid-rgoq6dm6> <a${addAttribute(`/${slug}/menu`, "href")} class="btn btn--dark-outline" data-astro-cid-rgoq6dm6>See Full Menu</a> </div> </div> </section> <!-- Hours & Location --> <section class="section" id="hours" data-astro-cid-rgoq6dm6> <div class="container" data-astro-cid-rgoq6dm6> <p class="section__label" data-astro-cid-rgoq6dm6>Visit Us</p> <h2 class="section__heading" data-astro-cid-rgoq6dm6>Hours & Location</h2> <div class="hours-grid" data-astro-cid-rgoq6dm6> <div data-astro-cid-rgoq6dm6> <table class="hours-table" data-astro-cid-rgoq6dm6> ${Object.entries({
    Monday: site.hours.monday,
    Tuesday: site.hours.tuesday,
    Wednesday: site.hours.wednesday,
    Thursday: site.hours.thursday,
    Friday: site.hours.friday,
    Saturday: site.hours.saturday,
    Sunday: site.hours.sunday
  }).map(([day, hours]) => renderTemplate`<tr data-astro-cid-rgoq6dm6> <td data-astro-cid-rgoq6dm6>${day}</td> <td${addAttribute(hours === "Closed" ? "closed" : "", "class")} data-astro-cid-rgoq6dm6>${hours}</td> </tr>`)} </table> ${renderTemplate`<p class="hours-note" data-astro-cid-rgoq6dm6>${site.hours.notes}</p>`} </div> <div data-astro-cid-rgoq6dm6> <p class="location__address" data-astro-cid-rgoq6dm6> ${site.address.street}<br data-astro-cid-rgoq6dm6> ${site.address.city}, ${site.address.state} ${site.address.zip} </p> <p class="location__phone" data-astro-cid-rgoq6dm6> <a${addAttribute(`tel:${site.phone}`, "href")} data-astro-cid-rgoq6dm6>${site.phone}</a> </p> <div class="map-placeholder" aria-label="Map showing restaurant location" data-astro-cid-rgoq6dm6>
Map embed will go here
</div> </div> </div> </div> </section> <!-- Reviews --> <section class="section section--sunken" id="reviews" data-astro-cid-rgoq6dm6> <div class="container" data-astro-cid-rgoq6dm6> <p class="section__label" data-astro-cid-rgoq6dm6>What People Say</p> <h2 class="section__heading" data-astro-cid-rgoq6dm6>From Our Guests</h2> <div class="reviews-grid" data-astro-cid-rgoq6dm6> ${site.reviews.map((review) => renderTemplate`<div class="review-card" data-astro-cid-rgoq6dm6> <div class="review-card__stars"${addAttribute(`${review.rating} out of 5 stars`, "aria-label")} data-astro-cid-rgoq6dm6> ${renderStars(review.rating)} </div> <p class="review-card__quote" data-astro-cid-rgoq6dm6>"${review.quote}"</p> <p class="review-card__author" data-astro-cid-rgoq6dm6>${review.author}</p> <p class="review-card__source" data-astro-cid-rgoq6dm6>${review.source}</p> </div>`)} </div> <p class="reviews__aggregate" data-astro-cid-rgoq6dm6> <span style="color: var(--color-star);" data-astro-cid-rgoq6dm6>${renderStars(Math.round(site.aggregateRating.score))}</span> ${" "}<strong data-astro-cid-rgoq6dm6>${site.aggregateRating.score}</strong> out of 5 based on ${site.aggregateRating.count} reviews on ${site.aggregateRating.source} </p> </div> </section> <!-- CTA Banner --> <section class="cta-banner" data-astro-cid-rgoq6dm6> <h2 class="cta-banner__heading" data-astro-cid-rgoq6dm6>Ready to taste what everyone is talking about?</h2> <p class="cta-banner__text" data-astro-cid-rgoq6dm6>Walk-ins are always welcome. For parties of 6 or more, give us a call.</p> <div class="cta-banner__actions" data-astro-cid-rgoq6dm6> <a${addAttribute(`tel:${site.phone}`, "href")} class="btn btn--primary" data-astro-cid-rgoq6dm6>Call to Book a Table</a> <a${addAttribute(`/${slug}/menu`, "href")} class="btn btn--outline" data-astro-cid-rgoq6dm6>Order Online</a> </div> </section> <!-- Footer --> <footer class="footer" data-astro-cid-rgoq6dm6> <p data-astro-cid-rgoq6dm6>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${site.name}. All rights reserved.</p> <p style="margin-top: 0.5rem;" data-astro-cid-rgoq6dm6>Made with <a href="https://localgenius.site" data-astro-cid-rgoq6dm6>LocalGenius</a></p> </footer> </body></html>`;
}, "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/[slug]/index.astro", void 0);

const $$file = "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/[slug]/index.astro";
const $$url = "/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
