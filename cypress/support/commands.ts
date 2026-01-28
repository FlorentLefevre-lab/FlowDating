/// <reference types="cypress" />

// ***********************************************
// Custom Commands for Dating App E2E Tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       * @param email - User email
       * @param password - User password
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Login programmatically via API (faster)
       * @param email - User email
       * @param password - User password
       */
      loginApi(email: string, password: string): Chainable<void>;

      /**
       * Create a user via Cypress task
       * @param userData - User data object
       */
      createUser(userData: {
        email: string;
        password?: string;
        name?: string;
        verified?: boolean;
        profile?: boolean;
      }): Chainable<any>;

      /**
       * Clear the test database
       */
      clearDatabase(): Chainable<boolean>;

      /**
       * Verify email for a user
       * @param email - User email to verify
       */
      verifyEmail(email: string): Chainable<boolean>;

      /**
       * Create multiple profiles for discovery
       * @param count - Number of profiles to create
       */
      createProfiles(count: number): Chainable<any[]>;

      /**
       * Create a like between users
       * @param from - Liker email
       * @param to - Liked user email
       */
      createLike(from: string, to: string): Chainable<any>;

      /**
       * Create a match between users
       * @param user1 - First user email
       * @param user2 - Second user email
       */
      createMatch(user1: string, user2: string): Chainable<any>;

      /**
       * Wait for page to be fully loaded
       */
      waitForPageLoad(): Chainable<void>;

      /**
       * Get element by data-testid
       * @param testId - The data-testid value
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Logout the current user
       */
      logout(): Chainable<void>;
    }
  }
}

// Login via UI (realistic flow)
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login');
  cy.waitForPageLoad();

  cy.getByTestId('email-input').clear().type(email);
  cy.getByTestId('password-input').clear().type(password);
  cy.getByTestId('submit-button').click();

  // Wait for successful redirect
  cy.url().should('not.include', '/auth/login', { timeout: 15000 });
});

// Login via API (faster, for setup)
Cypress.Commands.add('loginApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/callback/credentials',
    body: {
      email,
      password,
      csrfToken: '', // Will be handled by NextAuth
      callbackUrl: '/',
      json: true,
    },
    failOnStatusCode: false,
  }).then((response) => {
    // Visit the app to establish session
    cy.visit('/');
  });
});

// Create user via task
Cypress.Commands.add('createUser', (userData) => {
  return cy.task('createUser', userData);
});

// Clear database
Cypress.Commands.add('clearDatabase', () => {
  return cy.task('clearDatabase');
});

// Verify email
Cypress.Commands.add('verifyEmail', (email: string) => {
  return cy.task('verifyEmail', email);
});

// Create profiles
Cypress.Commands.add('createProfiles', (count: number) => {
  return cy.task('createProfiles', count);
});

// Create like
Cypress.Commands.add('createLike', (from: string, to: string) => {
  return cy.task('createLike', { from, to });
});

// Create match
Cypress.Commands.add('createMatch', (user1: string, user2: string) => {
  return cy.task('createMatch', { user1, user2 });
});

// Wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.document().its('readyState').should('eq', 'complete');
  // Wait for any loading indicators to disappear
  cy.get('body').should('not.have.class', 'loading');
});

// Get by data-testid helper
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.visit('/api/auth/signout');
  cy.getByTestId('signout-button').click();
  cy.url().should('include', '/auth/login');
});

export {};
