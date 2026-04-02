globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderers } from './chunks/astro_BceOcufW.mjs';
import { c as createExports } from './chunks/@astrojs_Dy2POUhV.mjs';
import { manifest } from './manifest_D1owi1cA.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/provision.astro.mjs');
const _page2 = () => import('./pages/api/sites/_slug_.astro.mjs');
const _page3 = () => import('./pages/api/sites.astro.mjs');
const _page4 = () => import('./pages/api/update.astro.mjs');
const _page5 = () => import('./pages/_slug_/menu.astro.mjs');
const _page6 = () => import('./pages/_slug_.astro.mjs');
const _page7 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/provision.ts", _page1],
    ["src/pages/api/sites/[slug].ts", _page2],
    ["src/pages/api/sites/index.ts", _page3],
    ["src/pages/api/update.ts", _page4],
    ["src/pages/[slug]/menu.astro", _page5],
    ["src/pages/[slug]/index.astro", _page6],
    ["src/pages/index.astro", _page7]
]);
const serverIslandMap = new Map();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: () => import('./_noop-middleware.mjs')
});
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
