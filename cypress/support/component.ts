// ***********************************************************
// Component Testing Support File
// ***********************************************************

import './commands';

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof import('cypress/react18').mount;
    }
  }
}

// Import commands for component testing
import { mount } from 'cypress/react18';

Cypress.Commands.add('mount', mount);

export {};
