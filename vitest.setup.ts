import '@testing-library/jest-dom/vitest';

// Aura DataGrid virtualizes from the scroll container size. happy-dom reports 0,
// which would hide every row.
const view = { width: 800, height: 800 };
for (const property of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight']) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get: () => (property.endsWith('Width') ? view.width : view.height),
  });
}
