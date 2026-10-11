import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Build a lightweight DOM-like environment for the portfolio script.
function page() {
  function element() {
    const listeners = new Map(), attributes = new Map(), styles = new Map(), classes = new Set();
    return { dataset: {}, textContent: '', disabled: false,
      classList: { add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name), toggle(name, value) { const show = value ?? !classes.has(name); if (show) classes.add(name); else classes.delete(name); return show; } },
      style: { setProperty: (name, value) => styles.set(name, value), getPropertyValue: name => styles.get(name) },
      setAttribute: (name, value) => attributes.set(name, value), getAttribute: name => attributes.get(name),
      addEventListener: (name, callback) => { const list = listeners.get(name) ?? []; list.push(callback); listeners.set(name, list); },
      fire(name, event = {}) { (listeners.get(name) ?? []).forEach(callback => callback(event)); },
      replaceChildren(...children) { this.children = children; },
      append(...children) { this.children = [...(this.children ?? []), ...children]; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }), contains: () => false };
  }
  // The portfolio script expects a few key selectors to exist.
  const selectors = ['#year', '.theme-button', 'meta[name="theme-color"]', '.menu-button', '.navigation', '.header', '.motion-toggle', '.copy-email', '.copy-status'];
  const nodes = Object.fromEntries(selectors.map(selector => [selector, element()]));
  const surfaces = [element(), element(), element()], reveals = [element()];

  // Create the document object and mock the browser APIs used by the script.
  const document = Object.assign(element(), { hidden: false, documentElement: element(),
    querySelector: selector => { assert.ok(nodes[selector], `Missing selector ${selector}`); return nodes[selector]; },
    querySelectorAll: selector => selector === '[data-motion-surface]' ? surfaces : selector === '.reveal' || selector === '.motion-reveal' ? reveals : [],
    createTextNode: text => text, createElement: () => element() });
  document.documentElement.dataset.theme = 'dark';
  const reduced = Object.assign(element(), { matches: false });
  const observers = [];
  class Observer { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} unobserve() {} }
  runInNewContext(readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8'), { document,
    window: { matchMedia: query => query.includes('reduced-motion') ? reduced : { matches: true }, IntersectionObserver: Observer },
    IntersectionObserver: Observer, localStorage: { getItem: () => null, setItem() {} }, setTimeout() {}, navigator: {}, Date });
  return { nodes, surfaces, reveals, document, reduced, observers };
}

// Ensure motion surfaces pause when they leave the viewport, independently of each other.
test('hero, GitHub and Contact animations pause independently outside the viewport', () => {
  const h = page();
  assert.ok(h.surfaces.every(surface => surface.dataset.inView === 'false'));
  h.observers[0].callback(h.surfaces.map(target => ({ target, isIntersecting: true, intersectionRatio: .5 })));
  assert.ok(h.surfaces.every(surface => surface.dataset.inView === 'true'));
  h.observers[0].callback([{ target: h.surfaces[0], isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(h.surfaces[0].dataset.inView, 'false');
  assert.equal(h.surfaces[1].dataset.inView, 'true');
  h.observers[0].callback([{ target: h.surfaces[1], isIntersecting: true, intersectionRatio: .02 }]);
  assert.equal(h.surfaces[1].dataset.inView, 'false');
  assert.equal(h.surfaces[2].dataset.inView, 'true');
});
// Verify the global pause toggle, hidden-tab behavior, and reduced-motion mode all work together.
test('global pause, background suspension and reduced motion work together', () => {
  const h = page(); const button = h.nodes['.motion-toggle']; const root = h.document.documentElement;
  button.fire('click'); assert.equal(root.dataset.motionPaused, 'true'); assert.equal(button.getAttribute('aria-pressed'), 'true');
  h.document.hidden = true; h.document.fire('visibilitychange');
  button.fire('click'); assert.equal(root.dataset.motionPaused, 'true');
  h.document.hidden = false; h.document.fire('visibilitychange'); assert.equal(root.dataset.motionPaused, 'false');
  h.reduced.matches = true; h.reduced.fire('change');
  assert.equal(root.dataset.motionPaused, 'true'); assert.equal(button.disabled, true); assert.ok(h.reveals[0].classList.contains('visible'));
  h.reduced.matches = false; h.reduced.fire('change'); assert.equal(button.disabled, false); assert.equal(root.dataset.motionPaused, 'false');
});
