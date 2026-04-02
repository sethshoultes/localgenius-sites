globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as addAttribute, b as renderHead, e as renderTemplate, f as createAstro } from '../../chunks/astro_BceOcufW.mjs';
export { r as renderers } from '../../chunks/astro_BceOcufW.mjs';
import '../../chunks/kleur_DHimoS-P.mjs';
/* empty css                                   */

const $$Astro = createAstro();
const $$Menu = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Menu;
  const { slug } = Astro2.params;
  const site = {
    name: "Maria's Kitchen",
    meta: {
      title: "Menu \u2014 Maria's Kitchen",
      description: "Full menu for Maria's Kitchen. Handmade Mexican food in Logan Square, Chicago. Mole, carnitas, tamales, and more."
    },
    menu: {
      heading: "Our Menu",
      note: "Menu changes seasonally. Prices subject to change. Ask your server about daily specials.",
      categories: [
        {
          name: "Starters",
          description: "Small plates to share or keep for yourself",
          image: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800&q=80",
          items: [
            { name: "Guacamole Molcajete", description: "Made tableside with avocado, serrano, cilantro, lime. Served with warm tortilla chips.", price: "12", dietary: ["vegan", "gluten-free"] },
            { name: "Elote Asado", description: "Grilled street corn with crema, cotija, chile powder, and a squeeze of lime", price: "7", dietary: ["vegetarian", "gluten-free"] },
            { name: "Queso Fundido", description: "Melted Oaxacan cheese with roasted poblano and chorizo, served bubbling in a cast-iron dish", price: "11" },
            { name: "Ceviche Tostadas", description: "Citrus-cured shrimp with cucumber, red onion, avocado on crisp corn tostada", price: "14", dietary: ["gluten-free"] },
            { name: "Sopa de Tortilla", description: "Tomato-chile broth with crispy tortilla strips, avocado, crema, and queso fresco", price: "9", dietary: ["vegetarian"] }
          ]
        },
        {
          name: "Tacos",
          description: "Served on handmade corn tortillas, three per order",
          image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
          items: [
            { name: "Carnitas", description: "Slow-braised pork shoulder with pickled onion, cilantro, and salsa verde", price: "15" },
            { name: "Al Pastor", description: "Achiote-marinated pork, roasted pineapple, white onion, cilantro", price: "15" },
            { name: "Pollo Asado", description: "Charcoal-grilled chicken thigh, guajillo salsa, shaved cabbage", price: "14" },
            { name: "Hongos", description: "Sauteed wild mushrooms, epazote, queso Oaxaca, chipotle crema", price: "13", dietary: ["vegetarian"] },
            { name: "Pescado", description: "Beer-battered cod, pickled cabbage, chipotle aioli, lime", price: "16" }
          ]
        },
        {
          name: "Entrees",
          description: "Plates served with rice, beans, and handmade tortillas",
          image: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&q=80",
          items: [
            { name: "Mole Poblano", description: "Slow-simmered with 22 ingredients, served over chicken with handmade tortillas", price: "19" },
            { name: "Carnitas Plate", description: "Fourteen-hour braised pork shoulder, crispy edges, pickled onion, cilantro rice", price: "17" },
            { name: "Enchiladas Suizas", description: "Chicken enchiladas in creamy tomatillo sauce, topped with crema and queso fresco", price: "16" },
            { name: "Chile Relleno", description: "Roasted poblano stuffed with cheese, dipped in egg batter, topped with ranchero sauce", price: "15", dietary: ["vegetarian"] },
            { name: "Carne Asada", description: "Grilled skirt steak, charred spring onions, guacamole, warm tortillas", price: "22" },
            { name: "Camarones al Mojo de Ajo", description: "Garlic-butter shrimp with rice, grilled vegetables, and lime", price: "21", dietary: ["gluten-free"] }
          ]
        },
        {
          name: "Tamales",
          description: "Steamed in banana leaf, made fresh each morning",
          image: "https://images.unsplash.com/photo-1604467707321-70d009801bf9?w=800&q=80",
          items: [
            { name: "Chicken Tinga (3)", description: "Shredded chicken in smoky chipotle-tomato sauce", price: "14" },
            { name: "Rajas con Queso (3)", description: "Roasted poblano strips with melted Oaxacan cheese", price: "13", dietary: ["vegetarian"] },
            { name: "Black Bean (3)", description: "Seasoned black bean with epazote and salsa verde", price: "12", dietary: ["vegan"] },
            { name: "Mixed Plate (6)", description: "Two of each \u2014 perfect for sharing", price: "22" }
          ]
        },
        {
          name: "Desserts",
          description: "Something sweet to finish",
          image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&q=80",
          items: [
            { name: "Churros con Cajeta", description: "Crisp cinnamon dough with warm goat-milk caramel for dipping", price: "9" },
            { name: "Tres Leches", description: "Three-milk sponge cake, whipped cream, toasted coconut", price: "10" },
            { name: "Flan de Vainilla", description: "Classic egg custard with burnt caramel sauce", price: "8" },
            { name: "Helado del Dia", description: "House-made ice cream \u2014 ask your server for today's flavor", price: "7" }
          ]
        },
        {
          name: "Drinks",
          description: "Handmade aguas frescas, Mexican sodas, and more",
          image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80",
          items: [
            { name: "Agua de Horchata", description: "Rice milk with cinnamon and vanilla, served over ice", price: "5", dietary: ["vegan"] },
            { name: "Agua de Jamaica", description: "Hibiscus flower tea, lightly sweetened, chilled", price: "5", dietary: ["vegan"] },
            { name: "Jarritos", description: "Mexican soda \u2014 tamarind, mandarin, guava, or lime", price: "4" },
            { name: "Mexican Hot Chocolate", description: "Oaxacan chocolate, cinnamon, warm milk, frothed tableside", price: "6" },
            { name: "Cafe de Olla", description: "Clay-pot coffee with piloncillo and cinnamon", price: "5" }
          ]
        }
      ]
    }
  };
  function dietaryLabel(tag) {
    const labels = {
      "vegan": "V",
      "vegetarian": "VG",
      "gluten-free": "GF",
      "dairy-free": "DF",
      "contains-nuts": "N",
      "spicy": "S"
    };
    return labels[tag] || tag;
  }
  return renderTemplate`<html lang="en" data-astro-cid-q2ozfdux> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${site.meta.title}</title><meta name="description"${addAttribute(site.meta.description, "content")}><meta property="og:title"${addAttribute(site.meta.title, "content")}><meta property="og:description"${addAttribute(site.meta.description, "content")}><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-q2ozfdux> <!-- Nav --> <nav class="nav" data-astro-cid-q2ozfdux> <div class="nav__inner" data-astro-cid-q2ozfdux> <a${addAttribute(`/${slug}`, "href")} class="nav__brand" data-astro-cid-q2ozfdux>${site.name}</a> <ul class="nav__links" data-astro-cid-q2ozfdux> <li data-astro-cid-q2ozfdux><a${addAttribute(`/${slug}/menu`, "href")} class="active" data-astro-cid-q2ozfdux>Menu</a></li> <li data-astro-cid-q2ozfdux><a${addAttribute(`/${slug}/contact`, "href")} data-astro-cid-q2ozfdux>Contact</a></li> </ul> </div> </nav> <!-- Page Header --> <header class="page-header" data-astro-cid-q2ozfdux> <h1 class="page-header__title" data-astro-cid-q2ozfdux>${site.menu.heading}</h1> <p class="page-header__subtitle" data-astro-cid-q2ozfdux>Handmade Mexican food, made from scratch every day</p> </header> <!-- Menu Categories --> <main class="container" data-astro-cid-q2ozfdux> ${site.menu.categories.map((category) => renderTemplate`<section class="menu-category" data-astro-cid-q2ozfdux> <div class="menu-category__header" data-astro-cid-q2ozfdux> <img${addAttribute(category.image, "src")}${addAttribute(category.name, "alt")} class="menu-category__image" loading="lazy" width="800" height="400" data-astro-cid-q2ozfdux> <div data-astro-cid-q2ozfdux> <h2 class="menu-category__name" data-astro-cid-q2ozfdux>${category.name}</h2> ${category.description && renderTemplate`<p class="menu-category__desc" data-astro-cid-q2ozfdux>${category.description}</p>`} </div> </div> <ul class="menu-items" data-astro-cid-q2ozfdux> ${category.items.map((item) => renderTemplate`<li class="menu-item" data-astro-cid-q2ozfdux> <div class="menu-item__top" data-astro-cid-q2ozfdux> <span class="menu-item__name" data-astro-cid-q2ozfdux>${item.name}</span> <span class="menu-item__price" data-astro-cid-q2ozfdux>$${item.price}</span> </div> ${item.description && renderTemplate`<p class="menu-item__desc" data-astro-cid-q2ozfdux>${item.description}</p>`} ${item.dietary && item.dietary.length > 0 && renderTemplate`<div class="menu-item__tags" data-astro-cid-q2ozfdux> ${item.dietary.map((tag) => renderTemplate`<span class="menu-item__tag" data-astro-cid-q2ozfdux>${dietaryLabel(tag)}</span>`)} </div>`} </li>`)} </ul> </section>`)} <!-- Dietary Legend --> <div class="dietary-legend" data-astro-cid-q2ozfdux> <span class="dietary-legend__item" data-astro-cid-q2ozfdux><span data-astro-cid-q2ozfdux>V</span> Vegan</span> <span class="dietary-legend__item" data-astro-cid-q2ozfdux><span data-astro-cid-q2ozfdux>VG</span> Vegetarian</span> <span class="dietary-legend__item" data-astro-cid-q2ozfdux><span data-astro-cid-q2ozfdux>GF</span> Gluten-Free</span> <span class="dietary-legend__item" data-astro-cid-q2ozfdux><span data-astro-cid-q2ozfdux>DF</span> Dairy-Free</span> </div> ${renderTemplate`<p class="menu-note" data-astro-cid-q2ozfdux>${site.menu.note}</p>`} </main> <!-- Footer --> <footer class="footer" data-astro-cid-q2ozfdux> <p data-astro-cid-q2ozfdux>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} ${site.name}. All rights reserved.</p> <p style="margin-top: 0.5rem;" data-astro-cid-q2ozfdux>Made with <a href="https://localgenius.site" data-astro-cid-q2ozfdux>LocalGenius</a></p> </footer> </body></html>`;
}, "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/[slug]/menu.astro", void 0);

const $$file = "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/[slug]/menu.astro";
const $$url = "/[slug]/menu";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Menu,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
