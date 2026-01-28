# Testing Guide - Dating App

This document provides comprehensive instructions for running and writing tests for the Dating App.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [CI/CD Integration](#cicd-integration)
6. [Best Practices](#best-practices)

---

## Test Architecture

The testing suite is organized into multiple layers:

```
__tests__/
├── unit/              # Unit tests (Jest)
│   ├── lib/           # Library utilities
│   ├── hooks/         # React hooks
│   └── components/    # React components
├── integration/       # Integration tests (Jest)
│   ├── api/           # API route tests
│   └── db/            # Database tests
├── security/          # Security-focused tests
├── fixtures/          # Test data
├── mocks/             # MSW handlers and mocks
└── setup/             # Test configuration

cypress/
├── e2e/               # End-to-end tests
├── fixtures/          # Cypress fixtures
└── support/           # Cypress commands and setup
```

### Test Types

| Type | Framework | Purpose | Location |
|------|-----------|---------|----------|
| Unit | Jest | Test individual functions/components | `__tests__/unit/` |
| Integration | Jest | Test API routes and DB operations | `__tests__/integration/` |
| Security | Jest | Test auth, rate limiting, injection | `__tests__/security/` |
| E2E | Cypress | Test complete user flows | `cypress/e2e/` |

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (for integration tests)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install test dependencies
npm install -D jest ts-jest @types/jest jest-environment-jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw jest-mock-extended
npm install -D cypress @cypress/webpack-dev-server
```

### Environment Configuration

Create a `.env.test` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dating_test"
NEXTAUTH_SECRET="test-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup for Tests

```bash
# Create test database
npx prisma db push --accept-data-loss

# Or use SQLite for faster tests
DATABASE_URL="file:./test.db"
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- __tests__/unit/lib/auth.test.ts
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run API tests only
npm test -- __tests__/integration/api

# Run DB tests only
npm test -- __tests__/integration/db
```

### Security Tests

```bash
npm run test:security
```

### E2E Tests

```bash
# Open Cypress UI
npm run test:e2e

# Run headless
npm run test:e2e:headless

# Run specific spec
npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

### All Tests

```bash
npm test
```

---

## Writing Tests

### Unit Test Example

```typescript
// __tests__/unit/lib/auth.test.ts
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Password Utilities', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
});
```

### Integration Test Example

```typescript
// __tests__/integration/api/auth.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  it('should create user with valid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toHaveProperty('user');
  });
});
```

### E2E Test Example

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearDatabase();
  });

  it('should complete registration flow', () => {
    cy.visit('/auth/register');
    cy.getByTestId('name-input').type('Test User');
    cy.getByTestId('email-input').type('test@example.com');
    cy.getByTestId('password-input').type('SecurePass123!');
    cy.getByTestId('confirm-password-input').type('SecurePass123!');
    cy.getByTestId('submit-button').click();

    cy.url().should('include', '/auth/verify-email');
  });
});
```

### Custom Cypress Commands

```typescript
// cypress/support/commands.ts

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/auth/login');
  cy.getByTestId('email-input').type(email);
  cy.getByTestId('password-input').type(password);
  cy.getByTestId('submit-button').click();
  cy.url().should('not.include', '/auth/login');
});

// Create user via API
Cypress.Commands.add('createUser', (userData) => {
  return cy.task('createUser', userData);
});
```

---

## CI/CD Integration

### GitHub Actions

The E2E tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

Configuration: `.github/workflows/e2e.yml`

### Running in CI

```yaml
- name: Run Cypress tests
  uses: cypress-io/github-action@v6
  with:
    start: npm run start
    wait-on: 'http://localhost:3000'
    browser: chrome
```

### Artifacts

Failed tests automatically upload:
- Screenshots: `cypress/screenshots/`
- Videos: `cypress/videos/`

---

## Best Practices

### General

1. **Isolate tests**: Each test should be independent
2. **Clean up**: Use `beforeEach` to reset state
3. **Use fixtures**: Keep test data in fixtures
4. **Descriptive names**: Test names should describe the behavior

### Unit Tests

- Test one thing per test
- Mock external dependencies
- Cover edge cases

### Integration Tests

- Use real database (or in-memory SQLite)
- Test happy path and error cases
- Verify side effects (emails sent, data created)

### E2E Tests

- Test critical user flows
- Use custom commands for repeated actions
- Add `data-testid` attributes to elements
- Handle async operations properly

### Security Tests

- Test all protected routes
- Verify rate limiting works
- Test for common vulnerabilities (XSS, SQL injection)
- Test authorization (not just authentication)

---

## Data-TestId Attributes

Add these attributes to components for reliable E2E testing:

```tsx
// Login Form
<input data-testid="email-input" />
<input data-testid="password-input" />
<button data-testid="submit-button" />

// Profile
<textarea data-testid="bio-input" />
<input data-testid="age-input" />
<select data-testid="gender-select" />
<button data-testid="save-button" />

// Discovery
<div data-testid="profile-card" />
<button data-testid="like-button" />
<button data-testid="dislike-button" />
<button data-testid="super-like-button" />

// Matches
<div data-testid="match-card" />
<button data-testid="chat-button" />
<input data-testid="search-input" />

// Chat
<div data-testid="message-list" />
<input data-testid="message-input" />
<button data-testid="send-button" />
```

---

## Troubleshooting

### Common Issues

**Cypress not finding elements**
- Add `data-testid` attributes
- Increase timeout: `cy.get('[data-testid="x"]', { timeout: 10000 })`

**Database connection errors**
- Ensure test database exists
- Check DATABASE_URL in .env.test

**Flaky tests**
- Add proper waits for async operations
- Use `cy.wait('@alias')` for API calls

**Session issues**
- Clear cookies/localStorage in `beforeEach`
- Use `cy.clearCookies()` and `cy.clearLocalStorage()`

### Debugging

```bash
# Run Cypress with debug logs
DEBUG=cypress:* npm run test:e2e

# Run Jest with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "should login successfully"
```

---

## Coverage Goals

| Area | Target |
|------|--------|
| Unit Tests | 80%+ |
| Integration Tests | 70%+ |
| Overall | 75%+ |

Run coverage report:
```bash
npm run test:coverage
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Documentation](https://docs.cypress.io)
- [Testing Library](https://testing-library.com/docs/)
- [MSW Documentation](https://mswjs.io/docs/)
