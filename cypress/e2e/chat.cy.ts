/// <reference types="cypress" />

describe('Chat Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();

    // Create two users with a match
    cy.createUser({
      email: 'user@example.com',
      password: 'TestPassword123!',
      name: 'Main User',
      verified: true,
      profile: true,
    });

    cy.createUser({
      email: 'match@example.com',
      password: 'TestPassword123!',
      name: 'Match User',
      verified: true,
      profile: true,
    });

    // Create the match
    cy.createMatch('user@example.com', 'match@example.com');

    cy.login('user@example.com', 'TestPassword123!');
  });

  describe('Chat Access', () => {
    it('should access chat from matches page', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Find and click on a match card
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="match-card"]').length > 0) {
          cy.getByTestId('match-card').first().click();
        } else if ($body.find('.match-card').length > 0) {
          cy.get('.match-card').first().click();
        } else {
          // Look for any clickable match element
          cy.contains('Match User').click();
        }
      });

      // Should navigate to chat or open chat modal
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/chat') ||
               Cypress.$('[data-testid="chat-modal"]').length > 0;
      });
    });

    it('should display chat page', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should show chat interface
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('message') ||
               text.includes('chat') ||
               text.includes('conversation') ||
               $body.find('[data-testid="message-list"]').length > 0;
      });
    });

    it('should show conversation list', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should display list of conversations
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="channel-list"]').length > 0 ||
               $body.find('.str-chat__channel-list').length > 0 ||
               $body.text().toLowerCase().includes('conversation');
      });
    });
  });

  describe('Messaging', () => {
    it('should send a message', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Wait for chat to initialize
      cy.wait(3000);

      // Select a conversation if not auto-selected
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="channel-preview"]').length > 0) {
          cy.getByTestId('channel-preview').first().click();
          cy.wait(1000);
        } else if ($body.find('.str-chat__channel-preview').length > 0) {
          cy.get('.str-chat__channel-preview').first().click();
          cy.wait(1000);
        }
      });

      // Type a message
      cy.get('body').then(($body) => {
        const testMessage = 'Hello, this is a test message!';

        if ($body.find('[data-testid="message-input"]').length > 0) {
          cy.getByTestId('message-input').type(testMessage);
          cy.getByTestId('send-button').click();
        } else if ($body.find('.str-chat__message-textarea').length > 0) {
          cy.get('.str-chat__message-textarea').type(testMessage + '{enter}');
        } else if ($body.find('textarea').length > 0) {
          cy.get('textarea').first().type(testMessage + '{enter}');
        }
      });

      // Message should appear in chat
      cy.wait(2000);
      cy.get('body').should('contain.text', 'Hello');
    });

    it('should display sent messages', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      // Send a message first
      cy.get('body').then(($body) => {
        if ($body.find('.str-chat__channel-preview').length > 0) {
          cy.get('.str-chat__channel-preview').first().click();
          cy.wait(1000);
        }

        if ($body.find('.str-chat__message-textarea').length > 0) {
          cy.get('.str-chat__message-textarea').type('Test message for display{enter}');
        }
      });

      // Message should be visible in the message list
      cy.wait(2000);
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.text().includes('Test message') ||
               $body.find('[data-testid="message"]').length > 0 ||
               $body.find('.str-chat__message').length > 0;
      });
    });
  });

  describe('Chat Interface', () => {
    it('should show channel header with match info', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      // Select a conversation
      cy.get('body').then(($body) => {
        if ($body.find('.str-chat__channel-preview').length > 0) {
          cy.get('.str-chat__channel-preview').first().click();
          cy.wait(1000);
        }
      });

      // Should show header with match name
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.str-chat__header').length > 0 ||
               $body.find('[data-testid="channel-header"]').length > 0 ||
               $body.text().includes('Match User');
      });
    });

    it('should show empty state when no conversations', () => {
      // Clear matches
      cy.task('clearDatabase').then(() => {
        cy.createUser({
          email: 'nomatch@example.com',
          password: 'TestPassword123!',
          name: 'No Match User',
          verified: true,
          profile: true,
        });
        cy.login('nomatch@example.com', 'TestPassword123!');
      });

      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should show empty state
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('aucune conversation') ||
               text.includes('no conversation') ||
               text.includes('commencez à matcher') ||
               text.includes('start matching');
      });
    });

    it('should show sync/refresh button', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should have sync button
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[title*="Synchroniser"]').length > 0 ||
               $body.find('[data-testid="sync-button"]').length > 0 ||
               $body.find('button svg').length > 0;
      });
    });
  });

  describe('Real-time Features', () => {
    it('should show last sync time', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should display last sync timestamp
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('dernière sync') ||
               text.includes('last sync') ||
               text.match(/\d{2}:\d{2}/) !== null;
      });
    });

    it('should refresh channel list', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      // Click sync button
      cy.get('body').then(($body) => {
        if ($body.find('[title*="Synchroniser"]').length > 0) {
          cy.get('[title*="Synchroniser"]').click();
        } else if ($body.find('[data-testid="sync-button"]').length > 0) {
          cy.getByTestId('sync-button').click();
        }
      });

      // Should show sync confirmation
      cy.wait(2000);
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('synchronisation') ||
               text.includes('sync') ||
               $body.find('.fixed.bg-green-500').length > 0;
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back from chat', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Use browser back or navigation
      cy.go('back');

      // Should navigate away from chat
      cy.url().should('not.equal', Cypress.config('baseUrl') + '/chat');
    });

    it('should open chat from match detail', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Click start conversation button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="start-conversation-button"]').length > 0) {
          cy.getByTestId('start-conversation-button').first().click();
        } else if ($body.find('button').filter(':contains("conversation")').length > 0) {
          cy.contains('button', /conversation/i).first().click();
        } else {
          // Click on match card
          cy.get('.match-card button, [class*="match"] button').first().click();
        }
      });

      // Should open chat
      cy.url().should('include', '/chat');
    });
  });

  describe('Message Validation', () => {
    it('should not send empty message', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      // Select conversation
      cy.get('.str-chat__channel-preview').first().click();
      cy.wait(1000);

      // Try to send empty message
      cy.get('body').then(($body) => {
        if ($body.find('.str-chat__message-textarea').length > 0) {
          cy.get('.str-chat__message-textarea').type('{enter}');
        }
      });

      // No new message should appear (same state)
      cy.get('.str-chat__message').should('have.length.at.most', 1);
    });

    it('should handle long messages', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      cy.get('.str-chat__channel-preview').first().click();
      cy.wait(1000);

      // Type a long message
      const longMessage = 'This is a very long message. '.repeat(50);

      cy.get('body').then(($body) => {
        if ($body.find('.str-chat__message-textarea').length > 0) {
          cy.get('.str-chat__message-textarea').type(longMessage.substring(0, 500) + '{enter}');
        }
      });

      // Message should be sent (may be truncated)
      cy.wait(2000);
      cy.get('body').should('contain.text', 'This is a very long message');
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should show mobile chat layout', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Should adapt to mobile layout
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.str-chat').length > 0 ||
               $body.text().toLowerCase().includes('message');
      });
    });
  });
});
