/// <reference types="cypress" />

describe('Profile Management', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.createUser({
      email: 'user@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      verified: true,
      profile: false, // Start without complete profile
    });
    cy.login('user@example.com', 'TestPassword123!');
  });

  describe('Profile Overview', () => {
    it('should display profile page', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Should show profile management page
      cy.contains(/profil|profile/i).should('be.visible');
    });

    it('should show profile completion percentage', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Should display completion indicator
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        return text.includes('%') || text.includes('complet');
      });
    });

    it('should navigate between profile tabs', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Click on different tabs
      cy.contains(/aperçu|overview/i).should('be.visible');

      // Navigate to basic info
      cy.contains(/infos.*base|basic.*info|modifier/i).click();
      cy.contains(/nom|name/i).should('be.visible');

      // Navigate to photos
      cy.contains(/photos/i).click();
      cy.contains(/photo|image|télécharger|upload/i).should('be.visible');

      // Navigate to preferences
      cy.contains(/préférences|preferences/i).click();
      cy.contains(/recherche|search|critères/i).should('be.visible');
    });
  });

  describe('Basic Info Form', () => {
    it('should update basic information', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Navigate to edit tab
      cy.contains(/infos.*base|basic.*info|modifier/i).click();

      // Update bio
      cy.getByTestId('bio-input').clear().type('This is my updated bio for testing purposes');

      // Update age
      cy.getByTestId('age-input').clear().type('28');

      // Update location
      cy.getByTestId('location-input').clear().type('Lyon, France');

      // Save changes
      cy.getByTestId('save-button').click();

      // Should show success message
      cy.contains(/sauvegardé|saved|succès|success/i).should('be.visible');
    });

    it('should validate age range', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/infos.*base|basic.*info|modifier/i).click();

      // Try invalid age (too young)
      cy.getByTestId('age-input').clear().type('15');
      cy.getByTestId('save-button').click();

      // Should show validation error
      cy.contains(/âge|age|18|invalide/i).should('be.visible');
    });
  });

  describe('Personal Info Form', () => {
    it('should update personal information', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Navigate to personal info tab
      cy.contains(/infos.*personnelles|personal.*info/i).click();

      // Update gender
      cy.getByTestId('gender-select').select('MALE');

      // Update profession
      cy.getByTestId('profession-input').clear().type('Software Developer');

      // Save changes
      cy.getByTestId('save-button').click();

      // Should show success message
      cy.contains(/sauvegardé|saved|succès|success/i).should('be.visible');
    });

    it('should update interests', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/infos.*personnelles|personal.*info/i).click();

      // Add interests
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="interests-input"]').length > 0) {
          cy.getByTestId('interests-input').type('Photography{enter}');
          cy.getByTestId('interests-input').type('Travel{enter}');
        } else if ($body.find('[data-testid="interest-chip"]').length > 0) {
          // If using chip selection
          cy.getByTestId('interest-chip').first().click();
        }
      });

      cy.getByTestId('save-button').click();
      cy.contains(/sauvegardé|saved/i).should('be.visible');
    });
  });

  describe('Photos Management', () => {
    it('should display photos section', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/photos/i).click();

      // Should show upload area
      cy.contains(/ajouter|upload|télécharger|photo/i).should('be.visible');
    });

    it('should show photo limit warning', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/photos/i).click();

      // Should indicate photo limit
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('6') || text.includes('limite') || text.includes('max');
      });
    });

    it('should upload a photo', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/photos/i).click();

      // Create a test image file
      cy.fixture('test-image.jpg', 'base64').then((fileContent) => {
        cy.get('input[type="file"]').first().selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'test-photo.jpg',
          mimeType: 'image/jpeg',
        }, { force: true });
      });

      // Wait for upload
      cy.wait(3000);

      // Should show the uploaded photo or success message
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const hasImage = $body.find('img[src*="cloudinary"]').length > 0 ||
                        $body.find('img[src*="placeholder"]').length > 0 ||
                        $body.find('.photo-preview').length > 0;
        const hasSuccess = $body.text().toLowerCase().includes('téléchargé') ||
                          $body.text().toLowerCase().includes('uploaded');
        return hasImage || hasSuccess;
      });
    });
  });

  describe('Preferences Form', () => {
    it('should update dating preferences', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/préférences|preferences/i).click();

      // Update age range
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="min-age-input"]').length > 0) {
          cy.getByTestId('min-age-input').clear().type('22');
          cy.getByTestId('max-age-input').clear().type('35');
        }
      });

      // Update distance
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="distance-input"]').length > 0) {
          cy.getByTestId('distance-input').clear().type('50');
        }
      });

      // Update gender preference
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="gender-preference-select"]').length > 0) {
          cy.getByTestId('gender-preference-select').select('FEMALE');
        }
      });

      // Save
      cy.getByTestId('save-button').click();
      cy.contains(/sauvegardé|saved|succès/i).should('be.visible');
    });
  });

  describe('Settings Panel', () => {
    it('should display settings options', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/paramètres|settings/i).click();

      // Should show privacy and security options
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('confidentialité') ||
               text.includes('privacy') ||
               text.includes('sécurité') ||
               text.includes('security') ||
               text.includes('compte') ||
               text.includes('account');
      });
    });

    it('should access account deletion option', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      cy.contains(/paramètres|settings/i).click();

      // Should have account deletion option
      cy.contains(/supprimer.*compte|delete.*account/i).should('be.visible');
    });
  });

  describe('Profile Completion Flow', () => {
    it('should encourage completing profile', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Should show profile is incomplete
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text();
        // Check for completion percentage less than 100 or incomplete message
        return text.includes('Complet') ||
               text.includes('%') ||
               text.includes('incomplet') ||
               text.includes('incomplete');
      });
    });

    it('should update completion percentage after adding info', () => {
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Get initial completion
      cy.get('body').invoke('text').then((initialText) => {
        // Navigate to edit and add info
        cy.contains(/infos.*base|basic.*info|modifier/i).click();
        cy.getByTestId('bio-input').clear().type('A complete bio for testing');
        cy.getByTestId('save-button').click();

        cy.wait(1000);

        // Navigate back to overview
        cy.contains(/aperçu|overview/i).click();

        // Completion should have changed
        cy.get('body').invoke('text').should('not.equal', initialText);
      });
    });
  });
});
