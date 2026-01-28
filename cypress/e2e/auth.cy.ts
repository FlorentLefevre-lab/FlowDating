/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();
  });

  describe('Registration', () => {
    it('should complete full registration flow', () => {
      cy.visit('/auth/register');
      cy.waitForPageLoad();

      // Fill registration form
      cy.getByTestId('name-input').type('Test User');
      cy.getByTestId('email-input').type('newuser@example.com');
      cy.getByTestId('password-input').type('SecurePass123!');
      cy.getByTestId('confirm-password-input').type('SecurePass123!');
      cy.getByTestId('submit-button').click();

      // Should show success message or redirect to verification page
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/auth/verify-email') ||
               url.includes('/auth/login');
      });

      // If redirected to verification page
      cy.get('body').then(($body) => {
        if ($body.text().includes('Vérifiez votre email') || $body.text().includes('verification')) {
          cy.contains(/vérifi|email|verification/i).should('be.visible');
        }
      });
    });

    it('should show validation error for invalid email', () => {
      cy.visit('/auth/register');
      cy.waitForPageLoad();

      cy.getByTestId('name-input').type('Test User');
      cy.getByTestId('email-input').type('invalid-email');
      cy.getByTestId('password-input').type('SecurePass123!');
      cy.getByTestId('confirm-password-input').type('SecurePass123!');
      cy.getByTestId('submit-button').click();

      // Should show email validation error
      cy.contains(/email invalide|invalid email/i).should('be.visible');
    });

    it('should show validation error for weak password', () => {
      cy.visit('/auth/register');
      cy.waitForPageLoad();

      cy.getByTestId('name-input').type('Test User');
      cy.getByTestId('email-input').type('test@example.com');
      cy.getByTestId('password-input').type('123');
      cy.getByTestId('confirm-password-input').type('123');
      cy.getByTestId('submit-button').click();

      // Should show password validation error
      cy.contains(/mot de passe.*caractères|password.*characters|au moins/i).should('be.visible');
    });

    it('should show validation error for mismatched passwords', () => {
      cy.visit('/auth/register');
      cy.waitForPageLoad();

      cy.getByTestId('name-input').type('Test User');
      cy.getByTestId('email-input').type('test@example.com');
      cy.getByTestId('password-input').type('SecurePass123!');
      cy.getByTestId('confirm-password-input').type('DifferentPass456!');
      cy.getByTestId('submit-button').click();

      // Should show password mismatch error
      cy.contains(/ne correspondent pas|passwords.*match/i).should('be.visible');
    });

    it('should show error for existing email', () => {
      // Create user first
      cy.createUser({
        email: 'existing@example.com',
        password: 'TestPassword123!',
        name: 'Existing User',
        verified: true,
      });

      cy.visit('/auth/register');
      cy.waitForPageLoad();

      cy.getByTestId('name-input').type('New User');
      cy.getByTestId('email-input').type('existing@example.com');
      cy.getByTestId('password-input').type('SecurePass123!');
      cy.getByTestId('confirm-password-input').type('SecurePass123!');
      cy.getByTestId('submit-button').click();

      // Should show existing email error
      cy.contains(/existe déjà|already exists|email.*utilisé/i).should('be.visible');
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      // Create a verified user
      cy.createUser({
        email: 'user@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        verified: true,
        profile: true,
      });
    });

    it('should login successfully with valid credentials', () => {
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      cy.getByTestId('email-input').type('user@example.com');
      cy.getByTestId('password-input').type('TestPassword123!');
      cy.getByTestId('submit-button').click();

      // Should redirect to home or dashboard
      cy.url().should('satisfy', (url: string) => {
        return url.includes('/home') ||
               url.includes('/dashboard') ||
               url.includes('/discover') ||
               url.includes('/profile');
      });
    });

    it('should show error for invalid password', () => {
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      cy.getByTestId('email-input').type('user@example.com');
      cy.getByTestId('password-input').type('WrongPassword123!');
      cy.getByTestId('submit-button').click();

      // Should show error message
      cy.contains(/incorrect|invalide|erreur/i).should('be.visible');
      cy.url().should('include', '/auth/login');
    });

    it('should show error for non-existent user', () => {
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      cy.getByTestId('email-input').type('nonexistent@example.com');
      cy.getByTestId('password-input').type('TestPassword123!');
      cy.getByTestId('submit-button').click();

      // Should show error message (generic for security)
      cy.contains(/incorrect|invalide|erreur/i).should('be.visible');
    });

    it('should navigate to registration page', () => {
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      cy.contains(/s'inscrire|créer.*compte|register/i).click();
      cy.url().should('include', '/auth/register');
    });

    it('should navigate to forgot password page', () => {
      cy.visit('/auth/login');
      cy.waitForPageLoad();

      cy.contains(/oublié|forgot/i).click();
      cy.url().should('include', '/auth/forgot-password');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.createUser({
        email: 'logoutuser@example.com',
        password: 'TestPassword123!',
        name: 'Logout User',
        verified: true,
        profile: true,
      });
      cy.login('logoutuser@example.com', 'TestPassword123!');
    });

    it('should logout successfully', () => {
      // Navigate to settings or find logout button
      cy.visit('/profile');
      cy.waitForPageLoad();

      // Look for logout button in settings or menu
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="logout-button"]').length > 0) {
          cy.getByTestId('logout-button').click();
        } else if ($body.find('[data-testid="user-menu"]').length > 0) {
          cy.getByTestId('user-menu').click();
          cy.getByTestId('logout-button').click();
        } else {
          // Try via API
          cy.visit('/api/auth/signout');
        }
      });

      // Should redirect to login
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.createUser({
        email: 'resetuser@example.com',
        password: 'OldPassword123!',
        name: 'Reset User',
        verified: true,
      });
    });

    it('should request password reset', () => {
      cy.visit('/auth/forgot-password');
      cy.waitForPageLoad();

      cy.getByTestId('email-input').type('resetuser@example.com');
      cy.getByTestId('submit-button').click();

      // Should show success message
      cy.contains(/email envoyé|email sent|vérifiez|check your email/i).should('be.visible');
    });

    it('should show success even for non-existent email (security)', () => {
      cy.visit('/auth/forgot-password');
      cy.waitForPageLoad();

      cy.getByTestId('email-input').type('nonexistent@example.com');
      cy.getByTestId('submit-button').click();

      // Should show same success message (prevent user enumeration)
      cy.contains(/email envoyé|email sent|vérifiez|check your email/i).should('be.visible');
    });
  });

  describe('Email Verification', () => {
    it('should verify email and allow login', () => {
      // Create unverified user
      cy.createUser({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
        name: 'Unverified User',
        verified: false,
      });

      // Try to login - should be rejected or redirect to verification
      cy.visit('/auth/login');
      cy.getByTestId('email-input').type('unverified@example.com');
      cy.getByTestId('password-input').type('TestPassword123!');
      cy.getByTestId('submit-button').click();

      // May show error or redirect to verification prompt
      cy.get('body').should('satisfy', ($body: JQuery) => {
        const text = $body.text().toLowerCase();
        return text.includes('vérif') ||
               text.includes('verif') ||
               text.includes('email') ||
               text.includes('confirm');
      });

      // Verify the email via task
      cy.verifyEmail('unverified@example.com');

      // Now login should work
      cy.visit('/auth/login');
      cy.getByTestId('email-input').type('unverified@example.com');
      cy.getByTestId('password-input').type('TestPassword123!');
      cy.getByTestId('submit-button').click();

      // Should redirect to app
      cy.url({ timeout: 10000 }).should('not.include', '/auth/login');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route without auth', () => {
      cy.visit('/profile');
      cy.url().should('include', '/auth/login');
    });

    it('should redirect to login when accessing discover without auth', () => {
      cy.visit('/discover');
      cy.url().should('include', '/auth/login');
    });

    it('should redirect to login when accessing matches without auth', () => {
      cy.visit('/matches');
      cy.url().should('include', '/auth/login');
    });

    it('should redirect to login when accessing chat without auth', () => {
      cy.visit('/chat');
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Session Persistence', () => {
    beforeEach(() => {
      cy.createUser({
        email: 'session@example.com',
        password: 'TestPassword123!',
        name: 'Session User',
        verified: true,
        profile: true,
      });
    });

    it('should persist session after page reload', () => {
      cy.login('session@example.com', 'TestPassword123!');
      cy.url().should('not.include', '/auth/login');

      // Reload the page
      cy.reload();

      // Should still be logged in
      cy.url().should('not.include', '/auth/login');
    });
  });
});
