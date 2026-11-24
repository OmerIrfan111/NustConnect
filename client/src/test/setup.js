import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrolling.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
