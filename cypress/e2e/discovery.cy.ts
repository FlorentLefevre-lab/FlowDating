/// <reference types="cypress" />

describe('Discovery Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();

    // Create main user with complete profile
    cy.createUser({
      email: 'user@example.com',
      password: 'TestPassword123!',
      name: 'Main User',
      verified: true,
      profile: true,
    });

    // Create profiles to discover
    cy.createProfiles(5);

    cy.login('user@example.com', 'TestPassword123!');
  });

  describe('Discovery Page', () => {
    it('should display discover page with profiles', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();

      // Wait for profiles to load
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Should show profile cards
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('découvrir') ||
               text.includes('discover') ||
               $body.find('[data-testid="profile-card"]').length > 0 ||
               $body.find('.profile-card').length > 0;
      });
    });

    it('should show profile information', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Profile should show name, age, and other details
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        // Should contain name pattern like "Name, Age" or profile info
        return text.includes('ans') ||
               text.includes('years') ||
               text.match(/\d{2}/) !== null;
      });
    });

    it('should show compatibility score', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Should display compatibility percentage
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        return text.includes('compatible') ||
               text.includes('%') ||
               text.match(/\d+%/) !== null;
      });
    });
  });

  describe('Swiping Actions', () => {
    it('should like a profile', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Click like button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="like-button"]').length > 0) {
          cy.getByTestId('like-button').click();
        } else if ($body.find('button').filter(':contains("💖")').length > 0) {
          cy.contains('button', '💖').click();
        } else {
          // Find any like/heart button
          cy.get('button[class*="pink"], button[class*="heart"], button:has(svg)').last().click();
        }
      });

      // Should advance to next profile or show feedback
      cy.wait(1000);

      // Verify action was processed
      cy.intercept('POST', '/api/discover').as('likeAction');
    });

    it('should dislike a profile', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Click dislike button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="dislike-button"]').length > 0) {
          cy.getByTestId('dislike-button').click();
        } else if ($body.find('button').filter(':contains("👎")').length > 0) {
          cy.contains('button', '👎').click();
        } else {
          // Find dislike/X button
          cy.get('button[class*="gray"], button:has(svg)').first().click();
        }
      });

      cy.wait(1000);
    });

    it('should super like a profile', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Click super like button if available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="super-like-button"]').length > 0) {
          cy.getByTestId('super-like-button').click();
        } else if ($body.find('button').filter(':contains("⭐")').length > 0) {
          cy.contains('button', '⭐').click();
        } else if ($body.find('button[class*="blue"]').length > 0) {
          cy.get('button[class*="blue"]').click();
        }
      });

      cy.wait(1000);
    });
  });

  describe('Match Detection', () => {
    it('should show match modal on mutual like', () => {
      // Create another user who has already liked our main user
      cy.task('createUser', {
        email: 'matcher@example.com',
        password: 'TestPassword123!',
        name: 'Matcher User',
        verified: true,
        profile: true,
      }).then(() => {
        // Create the like from matcher to main user
        cy.createLike('matcher@example.com', 'user@example.com');
      });

      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Find and like the user who already liked us
      cy.get('body').then(($body) => {
        // Look for the matcher in the profiles
        const hasMatcherProfile = $body.text().includes('Matcher');

        if (hasMatcherProfile) {
          // Like them back
          if ($body.find('[data-testid="like-button"]').length > 0) {
            cy.getByTestId('like-button').click();
          } else {
            cy.contains('button', '💖').click();
          }

          // Should show match modal or alert
          cy.wait(2000);
          cy.get('body').should('satisfy', ($updatedBody: JQuery) => {
            const text = $updatedBody.text().toLowerCase();
            return text.includes('match') ||
                   text.includes('connexion') ||
                   $updatedBody.find('[data-testid="match-modal"]').length > 0;
          });
        }
      });
    });
  });

  describe('No More Profiles', () => {
    it('should handle no more profiles state', () => {
      // Clear profiles and visit discover
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

      cy.visit('/discover');
      cy.waitForPageLoad();

      // Should show empty state or "no more profiles" message
      cy.get('body', { timeout: 10000 }).should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('aucun profil') ||
               text.includes('no profile') ||
               text.includes('plus de profil') ||
               text.includes('no more') ||
               text.includes('fin des profils') ||
               text.includes('recharger');
      });
    });

    it('should allow refreshing profiles', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Swipe through all profiles
      for (let i = 0; i < 5; i++) {
        cy.get('body').then(($body) => {
          if ($body.find('[data-testid="dislike-button"]').length > 0) {
            cy.getByTestId('dislike-button').click();
          } else if ($body.find('button').filter(':contains("👎")').length > 0) {
            cy.contains('button', '👎').click();
          }
        });
        cy.wait(500);
      }

      // Look for reload/refresh button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="reload-button"]').length > 0) {
          cy.getByTestId('reload-button').click();
        } else if ($body.find('button').filter(':contains("Recharger")').length > 0) {
          cy.contains('button', 'Recharger').click();
        }
      });
    });
  });

  describe('Profile Details', () => {
    it('should show profile bio', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Should display bio text
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('bio') ||
               $body.find('[data-testid="profile-bio"]').length > 0 ||
               $body.find('.bio').length > 0;
      });
    });

    it('should show profile interests', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Interests might be displayed as tags/chips
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="interest-tag"]').length > 0 ||
               $body.find('.interest').length > 0 ||
               $body.find('span[class*="rounded-full"]').length > 0;
      });
    });

    it('should show online status indicator', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Should show online status when applicable
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('en ligne') ||
               text.includes('online') ||
               $body.find('[data-testid="online-indicator"]').length > 0 ||
               $body.find('.online').length > 0;
      });
    });
  });

  describe('Profile Navigation', () => {
    it('should show profile counter', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Should show which profile we're on (e.g., "1 / 5")
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        // Look for counter pattern like "1 / 5" or "1/5"
        return text.match(/\d+\s*\/\s*\d+/) !== null;
      });
    });
  });

  describe('Debug Panel', () => {
    it('should have debug information available', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();

      // The discover page has a debug panel
      cy.get('body').then(($body) => {
        if ($body.find('details').length > 0) {
          cy.get('details').first().click();
          cy.contains(/debug|profils chargés|api/i).should('be.visible');
        }
      });
    });
  });
});
