/**
 * Integration Tests for Auth API Routes
 * Tests registration, login, logout, password reset functionality
 */

import bcrypt from 'bcryptjs';
import {
  testPrisma,
  createTestUser,
  cleanupTestUsersByEmail,
  createRequest,
  mockAuthSession,
  clearMockSession,
  createAuthenticatedSession,
  generateTestId,
} from './setup';

// Import route handlers (auth module is mocked in jest.integration.setup.ts)
import { POST as registerPOST } from '../../../app/api/auth/register/route';
import { POST as logoutPOST } from '../../../app/api/auth/logout/route';
import { POST as forgotPasswordPOST } from '../../../app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '../../../app/api/auth/reset-password/route';

const TEST_EMAIL_PREFIX = 'auth-test';

describe('Auth API Routes', () => {
  beforeAll(async () => {
    await cleanupTestUsersByEmail(TEST_EMAIL_PREFIX);
  });

  afterAll(async () => {
    await cleanupTestUsersByEmail(TEST_EMAIL_PREFIX);
    clearMockSession();
  });

  beforeEach(() => {
    clearMockSession();
    jest.clearAllMocks();
  });

  // ============================================
  // POST /api/auth/register
  // ============================================
  describe('POST /api/auth/register', () => {
    it('should create user with valid data', async () => {
      const email = `${TEST_EMAIL_PREFIX}-register-valid@test.local`;
      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Test User',
          email,
          password: 'SecurePassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(email);
      expect(data.user.name).toBe('Test User');
      expect(data.message).toContain('Compte cree');

      // Verify user exists in database
      const dbUser = await testPrisma.user.findUnique({
        where: { email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.emailVerified).toBeNull(); // Not verified yet
    });

    it('should hash password before storing', async () => {
      const email = `${TEST_EMAIL_PREFIX}-hash-test@test.local`;
      const plainPassword = 'MyPlainPassword123!';

      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Hash Test User',
          email,
          password: plainPassword,
        },
      });

      await registerPOST(request);

      const dbUser = await testPrisma.user.findUnique({
        where: { email },
        select: { hashedPassword: true },
      });

      expect(dbUser?.hashedPassword).not.toBe(plainPassword);
      expect(dbUser?.hashedPassword).toBeDefined();

      // Verify the hash is valid bcrypt
      const isValidHash = await bcrypt.compare(plainPassword, dbUser!.hashedPassword!);
      expect(isValidHash).toBe(true);
    });

    it('should return 400 for invalid email', async () => {
      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'invalid-email-format',
          password: 'SecurePassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toContain('email');
    });

    it('should return 400 for weak password (less than 6 characters)', async () => {
      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Test User',
          email: `${TEST_EMAIL_PREFIX}-weak-pwd@test.local`,
          password: '12345', // Too short
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toContain('mot de passe');
    });

    it('should return 400 for short name', async () => {
      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'A', // Too short
          email: `${TEST_EMAIL_PREFIX}-short-name@test.local`,
          password: 'SecurePassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for existing email', async () => {
      const email = `${TEST_EMAIL_PREFIX}-existing@test.local`;

      // First, create the user
      await createTestUser({
        email,
        name: 'Existing User',
        password: 'ExistingPassword123!',
      });

      // Try to register with the same email
      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Another User',
          email,
          password: 'AnotherPassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('existe deja');
    });

    it('should send verification email on successful registration', async () => {
      const { sendEmailVerification } = require('@/lib/email');
      const email = `${TEST_EMAIL_PREFIX}-verify-email@test.local`;

      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Verify Email User',
          email,
          password: 'SecurePassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(sendEmailVerification).toHaveBeenCalledWith(email, expect.any(String));
      expect(data.emailSent).toBe(true);
    });

    it('should not return password in response', async () => {
      const email = `${TEST_EMAIL_PREFIX}-no-pwd-response@test.local`;

      const request = createRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'No Password User',
          email,
          password: 'SecurePassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.hashedPassword).toBeUndefined();
      expect(data.user.password).toBeUndefined();
    });
  });

  // ============================================
  // POST /api/auth/logout
  // ============================================
  describe('POST /api/auth/logout', () => {
    it('should successfully logout authenticated user', async () => {
      const user = await createTestUser({
        email: `${TEST_EMAIL_PREFIX}-logout@test.local`,
        name: 'Logout User',
        password: 'Password123!',
      });

      mockAuthSession(createAuthenticatedSession(user));

      const request = createRequest('/api/auth/logout', { method: 'POST' });
      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('nettoyee');

      // Verify cookies are being cleared
      const cookies = response.headers.getSetCookie();
      expect(cookies.length).toBeGreaterThan(0);
    });

    it('should clear session cookies even when not authenticated', async () => {
      clearMockSession(); // No authenticated user

      const request = createRequest('/api/auth/logout', { method: 'POST' });
      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============================================
  // POST /api/auth/forgot-password
  // ============================================
  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const { sendPasswordResetEmail } = require('@/lib/email');
      const email = `${TEST_EMAIL_PREFIX}-forgot-existing@test.local`;

      await createTestUser({
        email,
        name: 'Forgot Password User',
        password: 'OldPassword123!',
      });

      const request = createRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(email, expect.any(String));
    });

    it('should return 200 even for non-existent email (security)', async () => {
      const email = `${TEST_EMAIL_PREFIX}-nonexistent@test.local`;

      const request = createRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      // For security, we should not reveal if email exists
      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
      expect(data.message).toContain('Si un compte existe');
    });

    it('should return 400 for invalid email format', async () => {
      const request = createRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'not-an-email' },
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle OAuth-only users gracefully', async () => {
      const email = `${TEST_EMAIL_PREFIX}-oauth-only@test.local`;

      // Create user without password (OAuth user)
      await testPrisma.user.create({
        data: {
          email,
          name: 'OAuth User',
          hashedPassword: null,
          primaryAuthMethod: 'GOOGLE',
        },
      });

      const request = createRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('connexion sociale');
    });

    it('should delete old tokens before creating new one', async () => {
      const email = `${TEST_EMAIL_PREFIX}-old-tokens@test.local`;

      await createTestUser({
        email,
        name: 'Old Tokens User',
        password: 'Password123!',
      });

      // Create an old token manually
      await testPrisma.passwordResetToken.create({
        data: {
          email,
          token: 'old-token-123',
          expires: new Date(Date.now() + 3600000),
        },
      });

      const request = createRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });

      await forgotPasswordPOST(request);

      // Old token should be deleted
      const tokens = await testPrisma.passwordResetToken.findMany({
        where: { email },
      });

      expect(tokens.length).toBe(1);
      expect(tokens[0].token).not.toBe('old-token-123');
    });
  });

  // ============================================
  // POST /api/auth/reset-password
  // ============================================
  describe('POST /api/auth/reset-password', () => {
    it('should change password with valid token', async () => {
      const email = `${TEST_EMAIL_PREFIX}-reset-valid@test.local`;
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';

      await createTestUser({
        email,
        name: 'Reset Password User',
        password: oldPassword,
      });

      // Create a valid reset token
      const token = `valid-token-${generateTestId()}`;
      await testPrisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires: new Date(Date.now() + 3600000), // 1 hour from now
        },
      });

      const request = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: newPassword },
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('succes');

      // Verify password was changed
      const user = await testPrisma.user.findUnique({
        where: { email },
        select: { hashedPassword: true },
      });

      const isOldPasswordValid = await bcrypt.compare(oldPassword, user!.hashedPassword!);
      const isNewPasswordValid = await bcrypt.compare(newPassword, user!.hashedPassword!);

      expect(isOldPasswordValid).toBe(false);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const request = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'invalid-nonexistent-token',
          password: 'NewPassword123!',
        },
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalide');
    });

    it('should return 400 for expired token', async () => {
      const email = `${TEST_EMAIL_PREFIX}-expired-token@test.local`;

      await createTestUser({
        email,
        name: 'Expired Token User',
        password: 'OldPassword123!',
      });

      // Create an expired token
      const token = `expired-token-${generateTestId()}`;
      await testPrisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        },
      });

      const request = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: 'NewPassword123!' },
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expire');
    });

    it('should invalidate token after use', async () => {
      const email = `${TEST_EMAIL_PREFIX}-invalidate-token@test.local`;

      await createTestUser({
        email,
        name: 'Invalidate Token User',
        password: 'OldPassword123!',
      });

      const token = `use-once-token-${generateTestId()}`;
      await testPrisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires: new Date(Date.now() + 3600000),
        },
      });

      // First use - should succeed
      const request1 = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: 'NewPassword1!' },
      });

      const response1 = await resetPasswordPOST(request1);
      expect(response1.status).toBe(200);

      // Second use - should fail (token deleted)
      const request2 = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: 'NewPassword2!' },
      });

      const response2 = await resetPasswordPOST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(data2.error).toContain('invalide');
    });

    it('should return 400 for weak new password', async () => {
      const email = `${TEST_EMAIL_PREFIX}-weak-new-pwd@test.local`;

      await createTestUser({
        email,
        name: 'Weak New Password User',
        password: 'OldPassword123!',
      });

      const token = `weak-pwd-token-${generateTestId()}`;
      await testPrisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires: new Date(Date.now() + 3600000),
        },
      });

      const request = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          password: '12345', // Too short
        },
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
