// ***********************************************************
// E2E Support File
// This file runs before every single spec file
// ***********************************************************

import './commands';

// Handle uncaught exceptions from app
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on certain expected errors
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  if (err.message.includes('hydration')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// Log Cypress commands for debugging
Cypress.on('command:start', (command) => {
  if (Cypress.env('DEBUG')) {
    console.log(`[Cypress] ${command.get('name')} - ${command.get('args')}`);
  }
});

// Before each test, ensure clean state
beforeEach(() => {
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();

  // Intercept API calls for monitoring
  cy.intercept('POST', '/api/auth/**').as('authRequest');
  cy.intercept('GET', '/api/profile').as('profileRequest');
  cy.intercept('GET', '/api/discover').as('discoverRequest');
  cy.intercept('GET', '/api/matches').as('matchesRequest');
});

// TypeScript module declaration
export {};
