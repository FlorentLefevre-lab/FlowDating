# Data-TestID Reference

This document lists all `data-testid` attributes that should be added to components for E2E testing.

## Why Data-TestIDs?

Using `data-testid` attributes provides:
- Stable selectors that don't break when CSS changes
- Clear intent that the element is used for testing
- Better test maintainability

## Implementation Priority

### High Priority (Critical User Flows)

#### Authentication Components

**LoginForm (`app/components/auth/LoginForm.tsx`)**
```tsx
<input data-testid="email-input" {...register('email')} />
<input data-testid="password-input" {...register('password')} />
<button data-testid="submit-button" type="submit">Se connecter</button>
<button data-testid="google-login-button">Continuer avec Google</button>
<button data-testid="facebook-login-button">Continuer avec Facebook</button>
```

**RegisterForm (`app/components/auth/RegisterForm.tsx`)**
```tsx
<input data-testid="name-input" {...register('name')} />
<input data-testid="email-input" {...register('email')} />
<input data-testid="password-input" {...register('password')} />
<input data-testid="confirm-password-input" {...register('confirmPassword')} />
<button data-testid="submit-button" type="submit">Créer mon compte</button>
```

**ForgotPassword Page (`app/auth/forgot-password/page.tsx`)**
```tsx
<input data-testid="email-input" />
<button data-testid="submit-button">Envoyer</button>
```

**ResetPassword Page (`app/auth/reset-password/page.tsx`)**
```tsx
<input data-testid="password-input" />
<input data-testid="confirm-password-input" />
<button data-testid="submit-button">Réinitialiser</button>
```

### Medium Priority (Main Features)

#### Profile Components

**BasicInfoForm (`app/components/profile/BasicInfoForm.tsx`)**
```tsx
<input data-testid="name-input" />
<input data-testid="age-input" />
<textarea data-testid="bio-input" />
<input data-testid="location-input" />
<button data-testid="save-button">Sauvegarder</button>
<button data-testid="cancel-button">Annuler</button>
```

**PersonalInfoForm (`app/components/profile/PersonalInfoForm.tsx`)**
```tsx
<select data-testid="gender-select" />
<input data-testid="profession-input" />
<input data-testid="interests-input" />
<button data-testid="save-button">Sauvegarder</button>
```

**PreferencesForm (`app/components/profile/PreferencesForm.tsx`)**
```tsx
<input data-testid="min-age-input" />
<input data-testid="max-age-input" />
<input data-testid="distance-input" />
<select data-testid="gender-preference-select" />
<button data-testid="save-button">Sauvegarder</button>
```

**PhotosManager (`app/components/profile/PhotosManager.tsx`)**
```tsx
<input data-testid="photo-upload-input" type="file" />
<button data-testid="upload-button">Télécharger</button>
<div data-testid="photo-preview" />
<button data-testid="delete-photo-button" />
<button data-testid="set-primary-button" />
```

#### Discovery Components

**DiscoverPage (`app/discover/page.tsx`)**
```tsx
<div data-testid="profile-card" />
<button data-testid="like-button">💖</button>
<button data-testid="dislike-button">👎</button>
<button data-testid="super-like-button">⭐</button>
<div data-testid="profile-bio" />
<span data-testid="interest-tag" />
<span data-testid="online-indicator" />
<button data-testid="reload-button">Recharger</button>
```

#### Matches Components

**MatchesPage (`app/matches/page.tsx`)**
```tsx
<div data-testid="match-card" />
<button data-testid="chat-button">Démarrer une conversation</button>
<input data-testid="search-input" placeholder="Rechercher..." />
<button data-testid="filter-button">Filtres</button>
<button data-testid="refresh-button">Actualiser</button>
<select data-testid="status-filter" />
<select data-testid="sort-select" />
```

#### Chat Components

**ChatPage (`app/chat/page.tsx`)**
```tsx
<div data-testid="channel-list" />
<div data-testid="channel-preview" />
<div data-testid="message-list" />
<textarea data-testid="message-input" />
<button data-testid="send-button" />
<button data-testid="sync-button" />
<div data-testid="channel-header" />
```

### Lower Priority (Navigation & Layout)

**Navbar (`app/components/layout/Navbar.tsx`)**
```tsx
<nav data-testid="desktop-nav" />
<nav data-testid="mobile-nav" />
<button data-testid="hamburger-menu" />
<div data-testid="mobile-menu-content" />
<button data-testid="user-menu" />
<button data-testid="logout-button" />
```

**Match Modal**
```tsx
<div data-testid="match-modal" />
<button data-testid="send-message-button" />
<button data-testid="continue-swiping-button" />
```

## Implementation Example

Before:
```tsx
<input
  {...register('email')}
  type="email"
  className="w-full px-3 py-2 border..."
  placeholder="votre.email@example.com"
/>
```

After:
```tsx
<input
  {...register('email')}
  type="email"
  data-testid="email-input"
  className="w-full px-3 py-2 border..."
  placeholder="votre.email@example.com"
/>
```

## Notes

1. **Naming Convention**: Use kebab-case (e.g., `email-input`, `submit-button`)
2. **Uniqueness**: Ensure IDs are unique within a page/component
3. **Semantic**: Names should describe what the element does, not how it looks
4. **No Implementation Details**: Avoid names like `red-button` or `top-nav`

## Verification

After adding data-testids, run:
```bash
npm run test:e2e
```

Tests should pass without relying on fragile CSS selectors or text content.
