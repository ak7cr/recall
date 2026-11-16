import '@testing-library/jest-dom';

// jsdom does not implement these layout APIs; stub them so components can call them safely.
window.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
