globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderers } from './chunks/astro_DcMjRC-Q.mjs';
import { c as createExports } from './chunks/@astrojs_DO6WzA1p.mjs';
import { manifest } from './manifest_CS9UnoOB.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/provision.astro.mjs');
const _page2 = () => import('./pages/api/sites/_slug_.astro.mjs');
const _page3 = () => import('./pages/api/sites.astro.mjs');
const _page4 = () => import('./pages/api/update.astro.mjs');
const _page5 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/provision.ts", _page1],
    ["src/pages/api/sites/[slug].ts", _page2],
    ["src/pages/api/sites/index.ts", _page3],
    ["src/pages/api/update.ts", _page4],
    ["src/pages/index.astro", _page5]
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
