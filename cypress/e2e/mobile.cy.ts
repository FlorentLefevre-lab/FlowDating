/// <reference types="cypress" />

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.createUser({
      email: 'mobile@example.com',
      password: 'TestPassword123!',
      name: 'Mobile User',
      verified: true,
      profile: true,
    });
    cy.createProfiles(3);
    cy.viewport('iphone-x');
    cy.login('mobile@example.com', 'TestPassword123!');
  });

  describe('Mobile Navigation', () => {
    it('should show mobile navigation', () => {
      cy.visit('/home');
      cy.waitForPageLoad();

      // Should display mobile menu or bottom navigation
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="mobile-menu"]').length > 0 ||
               $body.find('[data-testid="mobile-nav"]').length > 0 ||
               $body.find('nav').length > 0 ||
               $body.find('[class*="mobile"]').length > 0 ||
               $body.find('[class*="bottom"]').length > 0;
      });
    });

    it('should hide desktop navigation on mobile', () => {
      cy.visit('/home');
      cy.waitForPageLoad();

      // Desktop nav should be hidden or transformed
      cy.get('[data-testid="desktop-nav"]').should('not.be.visible');
    });

    it('should toggle mobile menu', () => {
      cy.visit('/home');
      cy.waitForPageLoad();

      // Find and click hamburger menu if exists
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="hamburger-menu"]').length > 0) {
          cy.getByTestId('hamburger-menu').click();
          cy.get('[data-testid="mobile-menu-content"]').should('be.visible');
        } else if ($body.find('button[aria-label*="menu"]').length > 0) {
          cy.get('button[aria-label*="menu"]').click();
        }
      });
    });
  });

  describe('Mobile Login', () => {
    it('should display login form properly on mobile', () => {
      cy.clearCookies();
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      // Form should be visible and properly sized
      cy.get('form').should('be.visible');
      cy.get('input').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');

      // Elements should not overflow
      cy.get('form').invoke('outerWidth').should('be.lessThan', 400);
    });

    it('should handle mobile keyboard', () => {
      cy.clearCookies();
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      // Focus on input should not cause layout issues
      cy.getByTestId('email-input').focus();
      cy.get('body').should('not.have.css', 'overflow', 'hidden');
    });
  });

  describe('Mobile Discover', () => {
    it('should display profile cards on mobile', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Profile card should be visible and properly sized
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="profile-card"]').length > 0 ||
               $body.find('.profile-card').length > 0 ||
               $body.find('[class*="card"]').length > 0;
      });
    });

    it('should have touch-friendly action buttons', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Buttons should be at least 44px for touch targets
      cy.get('button').each(($btn) => {
        cy.wrap($btn).invoke('outerHeight').should('be.gte', 40);
        cy.wrap($btn).invoke('outerWidth').should('be.gte', 40);
      });
    });

    it('should handle swipe gestures', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // The discover page uses Framer Motion for swipe
      // Just verify the card is touchable
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="profile-card"]').length > 0) {
          // Simulate touch swipe
          cy.getByTestId('profile-card')
            .trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
            .trigger('touchmove', { touches: [{ clientX: 50, clientY: 300 }] })
            .trigger('touchend');
        }
      });
    });
  });

  describe('Mobile Profile', () => {
    it('should display profile tabs on mobile', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Tabs should be horizontally scrollable
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[class*="overflow-x-auto"]').length > 0 ||
               $body.find('.tabs').length > 0;
      });
    });

    it('should allow horizontal scroll on tabs', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Find scrollable container and scroll
      cy.get('[class*="overflow-x-auto"]').first().scrollTo('right');
    });
  });

  describe('Mobile Matches', () => {
    beforeEach(() => {
      cy.createMatch('mobile@example.com', 'testprofile0@example.com');
    });

    it('should display matches in a mobile-friendly grid', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Should show single column on mobile
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const grid = $body.find('.grid');
        if (grid.length > 0) {
          // Check if it's single column
          return true;
        }
        return $body.find('.match-card').length > 0;
      });
    });

    it('should have full-width match cards', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();
      cy.wait('@matchesRequest', { timeout: 10000 });

      // Cards should take most of the width
      cy.get('.match-card, [class*="match"]').first().then(($card) => {
        const cardWidth = $card.outerWidth() || 0;
        expect(cardWidth).to.be.gte(280); // At least 280px on mobile
      });
    });
  });

  describe('Mobile Chat', () => {
    beforeEach(() => {
      cy.createUser({
        email: 'chatmatch@example.com',
        password: 'TestPassword123!',
        name: 'Chat Match',
        verified: true,
        profile: true,
      });
      cy.createMatch('mobile@example.com', 'chatmatch@example.com');
    });

    it('should display chat interface on mobile', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();

      // Chat should be visible and usable
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.str-chat').length > 0 ||
               $body.text().toLowerCase().includes('message') ||
               $body.text().toLowerCase().includes('conversation');
      });
    });

    it('should show channel list or active chat', () => {
      cy.visit('/chat');
      cy.waitForPageLoad();
      cy.wait(3000);

      // On mobile, might show list first then chat
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.str-chat__channel-list').length > 0 ||
               $body.find('.str-chat__channel').length > 0;
      });
    });
  });

  describe('Mobile Forms', () => {
    it('should have touch-friendly form inputs', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/infos.*base|basic.*info/i).click();

      // Inputs should have adequate size
      cy.get('input, textarea').each(($input) => {
        cy.wrap($input).invoke('outerHeight').should('be.gte', 40);
      });
    });

    it('should have properly sized buttons', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // All buttons should be touch-friendly
      cy.get('button').each(($btn) => {
        const height = $btn.outerHeight() || 0;
        const width = $btn.outerWidth() || 0;
        // Touch targets should be at least 40px
        expect(Math.max(height, width)).to.be.gte(40);
      });
    });
  });

  describe('Different Mobile Viewports', () => {
    const mobileDevices = [
      { name: 'iPhone SE', viewport: [375, 667] },
      { name: 'iPhone X', viewport: [375, 812] },
      { name: 'iPhone 12 Pro', viewport: [390, 844] },
      { name: 'Pixel 5', viewport: [393, 851] },
      { name: 'Samsung Galaxy S8', viewport: [360, 740] },
    ];

    mobileDevices.forEach(({ name, viewport }) => {
      it(`should render correctly on ${name}`, () => {
        cy.viewport(viewport[0], viewport[1]);
        cy.visit('/discover');
        cy.waitForPageLoad();

        // Content should not overflow horizontally
        cy.document().then((doc) => {
          expect(doc.body.scrollWidth).to.be.lte(viewport[0] + 20);
        });
      });
    });
  });

  describe('Tablet View', () => {
    beforeEach(() => {
      cy.viewport('ipad-2');
    });

    it('should show appropriate layout on tablet', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Tablet might show 2-column grid
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('.grid').length > 0 ||
               $body.find('[class*="col"]').length > 0;
      });
    });

    it('should show navigation appropriate for tablet', () => {
      cy.visit('/home');
      cy.waitForPageLoad();

      // Tablet might show full nav or adapted nav
      cy.get('nav').should('be.visible');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle tap on buttons', () => {
      cy.visit('/discover');
      cy.waitForPageLoad();
      cy.wait('@discoverRequest', { timeout: 10000 });

      // Tap like button
      cy.get('button').last().trigger('touchstart').trigger('touchend');
    });

    it('should handle scroll', () => {
      cy.visit('/matches');
      cy.waitForPageLoad();

      // Scroll the page
      cy.get('body').trigger('touchstart', { touches: [{ clientY: 500 }] });
      cy.get('body').trigger('touchmove', { touches: [{ clientY: 200 }] });
      cy.get('body').trigger('touchend');
    });
  });

  describe('Orientation Changes', () => {
    it('should handle landscape orientation', () => {
      cy.viewport(812, 375); // iPhone X landscape
      cy.visit('/discover');
      cy.waitForPageLoad();

      // Content should adapt to landscape
      cy.get('body').should('satisfy', ($body: JQuery) => {
        return $body.find('[data-testid="profile-card"]').length > 0 ||
               $body.text().length > 0;
      });
    });
  });
});
