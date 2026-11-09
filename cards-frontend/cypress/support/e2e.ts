// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

import "./commands";

// Prevent uncaught exceptions from failing tests if needed
Cypress.on("uncaught:exception", (err) => {
  // Returning false here prevents Cypress from failing the test
  // for known benign errors
  if (err.message.includes("ResizeObserver loop limit exceeded")) {
    return false;
  }
  return true;
});
