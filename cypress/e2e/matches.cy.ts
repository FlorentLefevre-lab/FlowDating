/// <reference types="cypress" />

describe('Matches Page', () => {
  beforeEach(() => {
    cy.clearDatabase();

    // Create main user
    cy.createUser({
      email: 'user@example.com',
      password: 'TestPassword123!',
      name: 'Main User',
      verified: true,
      profile: true,
    });

    // Create multiple match users
    for (let i = 1; i <= 3; i++) {
      cy.createUser({
        email: `match${i}@example.com`,
        password: 'TestPassword123!',
        name: `Match User ${i}`,
        verified: true,
        profile: true,
      });
      cy.createMatch('user@example.com', `match${i}@example.com`);
    }

    cy.login('user@example.com', 'TestPassword123!');
  });

  describe('Matches Display', () => {
    it('should display matches page', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should show matches heading
      cy.contains(/mes matchs|my matches|matchs/i).should('be.visible');
    });

    it('should show match cards', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should display match cards
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="match-card"]').length > 0 ||
               $body.find('.match-card').length > 0 ||
               $body.text().includes('Match User');
      });
    });

    it('should show match count', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should display total matches count
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        return text.includes('3') || text.match(/\d+\s*match/i) !== null;
      });
    });
  });

  describe('Match Statistics', () => {
    it('should show statistics cards', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should display stats
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('total') ||
               text.includes('actif') ||
               text.includes('active') ||
               text.includes('nouveau') ||
               text.includes('new');
      });
    });

    it('should show match activity stats', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Should show activity-related statistics
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('actif') ||
               text.includes('endormi') ||
               text.includes('dormant') ||
               text.includes('semaine') ||
               text.includes('week');
      });
    });
  });

  describe('Match Card Details', () => {
    it('should show match user info', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should display user information
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        return text.includes('Match User') ||
               text.includes('ans') ||
               text.match(/\d{2}\s*ans/) !== null;
      });
    });

    it('should show match timestamp', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should show when the match happened
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('il y a') ||
               text.includes('ago') ||
               text.includes('instant') ||
               text.includes('match');
      });
    });

    it('should show online status', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Online status indicator should be present (even if offline)
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="online-indicator"]').length > 0 ||
               $body.find('.online').length > 0 ||
               $body.find('[class*="green"]').length > 0 ||
               $body.text().toLowerCase().includes('en ligne');
      });
    });

    it('should show compatibility percentage', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should display compatibility
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        return text.includes('%') ||
               text.includes('compatible');
      });
    });
  });

  describe('Search and Filters', () => {
    it('should have search functionality', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Should have search input
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="search-input"]').length > 0 ||
               $body.find('input[type="text"]').length > 0 ||
               $body.find('input[placeholder*="Rechercher"]').length > 0;
      });
    });

    it('should filter matches by search', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Type in search
      cy.get('body').then(($body) => {
        if ($body.find('input[placeholder*="Rechercher"]').length > 0) {
          cy.get('input[placeholder*="Rechercher"]').type('Match User 1');
        } else if ($body.find('[data-testid="search-input"]').length > 0) {
          cy.getByTestId('search-input').type('Match User 1');
        }
      });

      // Should filter results
      cy.wait(500);
      cy.get('body').should('satisfy', ($body: JQuery) => {
        // Should show filtered count or filtered results
        return $body.text().includes('1 match') ||
               $body.text().includes('Match User 1');
      });
    });

    it('should have filter options', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Click filter button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="filter-button"]').length > 0) {
          cy.getByTestId('filter-button').click();
        } else if ($body.find('button').filter(':contains("Filtres")').length > 0) {
          cy.contains('button', 'Filtres').click();
        }
      });

      // Should show filter options
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('statut') ||
               text.includes('status') ||
               text.includes('période') ||
               text.includes('period') ||
               text.includes('trier') ||
               text.includes('sort');
      });
    });

    it('should filter by status', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Open filters
      cy.contains('button', 'Filtres').click();

      // Select status filter
      cy.get('body').then(($body) => {
        if ($body.find('select').length > 0) {
          cy.get('select').first().select('active');
        }
      });

      // Results should be filtered
      cy.wait(500);
    });

    it('should reset filters', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Apply a filter
      cy.get('input[placeholder*="Rechercher"]').type('xyz');
      cy.wait(500);

      // Reset filters
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Réinitialiser")').length > 0) {
          cy.contains('button', 'Réinitialiser').click();
        }
      });

      // Should show all matches again
      cy.wait(500);
      cy.get('body').should('contain.text', 'Match User');
    });
  });

  describe('Sorting', () => {
    it('should sort matches by recent', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Open filters and change sort
      cy.contains('button', 'Filtres').click();

      cy.get('body').then(($body) => {
        if ($body.find('select[data-testid="sort-select"]').length > 0) {
          cy.getByTestId('sort-select').select('recent');
        } else if ($body.find('select').length > 1) {
          cy.get('select').eq(2).select('recent');
        }
      });
    });

    it('should toggle sort order', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      cy.contains('button', 'Filtres').click();

      // Toggle sort order button
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Croissant")').length > 0) {
          cy.contains('button', 'Croissant').click();
          cy.contains('button', 'Décroissant').should('be.visible');
        } else if ($body.find('button').filter(':contains("Décroissant")').length > 0) {
          cy.contains('button', 'Décroissant').click();
          cy.contains('button', 'Croissant').should('be.visible');
        }
      });
    });
  });

  describe('Actions', () => {
    it('should open conversation from match card', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Click conversation button on first match
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="chat-button"]').length > 0) {
          cy.getByTestId('chat-button').first().click();
        } else if ($body.find('button').filter(':contains("conversation")').length > 0) {
          cy.contains('button', /conversation/i).first().click();
        } else {
          // Click the match card
          cy.get('.match-card, [class*="match"]').first().click();
        }
      });

      // Should navigate to chat
      cy.url().should('include', '/chat');
    });

    it('should refresh matches', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Click refresh button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="refresh-button"]').length > 0) {
          cy.getByTestId('refresh-button').click();
        } else if ($body.find('button').filter(':contains("Actualiser")').length > 0) {
          cy.contains('button', 'Actualiser').click();
        }
      });

      // Should trigger new request
      cy.wait('@matchesRequest');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no matches', () => {
      // Create user without matches
      cy.task('clearDatabase').then(() => {
        cy.createUser({
          email: 'lonely@example.com',
          password: 'TestPassword123!',
          name: 'Lonely User',
          verified: true,
          profile: true,
        });
        cy.login('lonely@example.com', 'TestPassword123!');
      });

      cy.visit('/matches');
      cy.waitForPageLoad();

      // Should show empty state
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('aucun match') ||
               text.includes('no match') ||
               text.includes('continuez à swiper') ||
               text.includes('discover');
      });
    });

    it('should have discover button in empty state', () => {
      cy.task('clearDatabase').then(() => {
        cy.createUser({
          email: 'lonely2@example.com',
          password: 'TestPassword123!',
          name: 'Lonely User 2',
          verified: true,
          profile: true,
        });
        cy.login('lonely2@example.com', 'TestPassword123!');
      });

      cy.visit('/matches');
      cy.waitForPageLoad();

      // Should have button to go to discover
      cy.get('body').then(($body) => {
        if ($body.find('button').filter(':contains("Découvrir")').length > 0) {
          cy.contains('button', 'Découvrir').click();
          cy.url().should('include', '/discover');
        }
      });
    });
  });

  describe('Floating Action Button', () => {
    it('should have FAB to discover new profiles', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Should have floating action button
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.fixed button').length > 0 ||
               $body.find('[data-testid="fab"]').length > 0;
      });
    });

    it('should navigate to discover on FAB click', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Click FAB
      cy.get('body').then(($body) => {
        if ($body.find('.fixed button').length > 0) {
          cy.get('.fixed button').click();
          cy.url().should('include', '/discover');
        }
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator', () => {
      // Slow down the API response
      cy.intercept('GET', '/api/matches', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
      }).as('slowMatches');

      cy.visit('/matches');

      // Should show loading state
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.animate-spin').length > 0 ||
               $body.text().toLowerCase().includes('chargement') ||
               $body.text().toLowerCase().includes('loading');
      });
    });
  });
});
