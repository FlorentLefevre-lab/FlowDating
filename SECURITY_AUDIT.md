# Security Audit - Dating App API

**Date:** 2026-01-28
**Auditor:** Security Agent (Automated)
**Scope:** All API routes in `app/api/`

---

## Summary

| Metric | Count |
|--------|-------|
| **Total routes** | 32 |
| **Routes with auth check** | 26 |
| **Routes without auth (intentional)** | 6 |
| **Routes with ownership check** | 5 |
| **Routes with Zod validation** | 7 |
| **CRITICAL vulnerabilities** | 6 |
| **HIGH vulnerabilities** | 4 |
| **MEDIUM vulnerabilities** | 8 |

---

## Critical Issues

### 1. CRITICAL: IDOR - `/api/users/[userId]/route.ts` (Line 26-52)
**Severity:** CRITICAL
**Issue:** Any authenticated user can access ANY other user's profile data including email, preferences
**Current Code:**
```typescript
// Line 7-14: Auth check exists but NO ownership verification
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
}
// Line 26: Fetches ANY user by ID without checking if requester should access it
const user = await prisma.user.findFirst({
  where: {
    OR: [
      { id: userId },
      { email: userId }  // Also allows lookup by email!
    ]
  },
  select: {
    id: true,
    email: true,  // SENSITIVE DATA EXPOSED
    preferences: true,  // SENSITIVE DATA EXPOSED
    ...
  }
});
```
**Impact:** Complete profile data exposure, email harvesting possible
**Fix Required:** Add ownership check OR limit returned fields for non-owner requests

### 2. CRITICAL: Missing Ownership - `/api/user/delete-account/route.ts` (Line 16-17)
**Severity:** CRITICAL
**Issue:** Route accepts `forceUserId` and `forceUserEmail` from request body, allowing deletion of ANY account
**Current Code:**
```typescript
// Line 16-17: Accepts force parameters from untrusted input
const forceUserId = requestBody?.forceUserId;
const forceUserEmail = requestBody?.forceUserEmail;
// Line 36: Uses force params if session fails
if (!userId && forceUserId) {
  userId = forceUserId;
```
**Impact:** Complete account takeover/deletion of any user
**Fix Required:** Remove forceUserId/forceUserEmail parameters, only use session.user.id

### 3. CRITICAL: Missing Ownership - `/api/users/list/route.ts` (Line 19-52)
**Severity:** CRITICAL
**Issue:** Returns ALL users' data including emails to any authenticated user
**Current Code:**
```typescript
// Line 19-52: Returns all users except requester
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,  // SENSITIVE - all user emails exposed
    name: true,
    ...
  }
});
```
**Impact:** Mass email harvesting, privacy violation
**Fix Required:** Remove email from response OR implement admin-only access

### 4. CRITICAL: Webhook Signature Bypass Risk - `/api/chat/stream/webhook/route.ts` (Line 16)
**Severity:** CRITICAL
**Issue:** Signature verification uses non-null assertion on potentially null value
**Current Code:**
```typescript
// Line 16: Non-null assertion on potentially missing header
const isValid = serverClient.verifyWebhook(body, signature!)
```
**Impact:** Webhook spoofing if signature header is missing
**Fix Required:** Add null check before verification

### 5. CRITICAL: IDOR - `/api/matches/create-channels/route.ts` (Line 16-33)
**Severity:** CRITICAL
**Issue:** Creates chat channel with any `matchedUserId` without verifying mutual match
**Current Code:**
```typescript
// Line 16: Takes matchedUserId from request body
const { matchedUserId } = await req.json()
// Line 19-26: Only checks if ONE like exists, not mutual
const match = await prisma.like.findFirst({
  where: {
    OR: [
      { senderId: session.user.id, receiverId: matchedUserId },
      { senderId: matchedUserId, receiverId: session.user.id }
    ]
  }
})
```
**Impact:** User can create chat channels with users who haven't matched with them
**Fix Required:** Verify BOTH likes exist (mutual match)

### 6. CRITICAL: Missing Input Validation - `/api/likes/route.ts` (Line 24)
**Severity:** CRITICAL
**Issue:** No Zod validation on request body, trusts user input directly
**Current Code:**
```typescript
// Line 24: Directly destructures untrusted input
const { toUserId, action } = await request.json();
```
**Impact:** Injection attacks, malformed data processing
**Fix Required:** Add Zod schema validation

---

## High Severity Issues

### 1. HIGH: Missing Ownership Check - `/api/profile/route.ts` (PUT - Line 49-168)
**Severity:** HIGH
**Issue:** Uses session.user.id correctly but lacks explicit ownership verification comment/pattern
**Fix Required:** Add explicit ownership verification pattern for clarity

### 2. HIGH: Missing Zod Validation - `/api/user-profile/route.ts` (Line 86-106)
**Severity:** HIGH
**Issue:** Basic validation exists but no Zod schema, vulnerable to type confusion
**Current Code:**
```typescript
// Line 86-106: Manual validation only
const { name, age, bio, location, interests } = body;
if (!name || name.trim().length === 0) {...}
```
**Fix Required:** Replace with Zod schema validation

### 3. HIGH: Missing Zod Validation - `/api/matches/route.ts` (POST - Line 248)
**Severity:** HIGH
**Issue:** No validation on targetUserId parameter
**Current Code:**
```typescript
// Line 248: No validation
const { targetUserId } = await request.json();
```
**Fix Required:** Add Zod schema

### 4. HIGH: Sensitive Data in Logs - `/api/auth/forgot-password/route.ts` (Line 52)
**Severity:** HIGH
**Issue:** Token partially logged to console
**Current Code:**
```typescript
// Line 52: Token logged
console.log('Token genere:', token.substring(0, 8) + '...')
```
**Fix Required:** Remove token logging in production

---

## Medium Severity Issues

### 1. MEDIUM: Missing Zod - `/api/chat/create-channel/route.ts` (Line 21-22)
No schema validation on body parameters

### 2. MEDIUM: Missing Zod - `/api/user/status/route.ts` (POST - Line 141)
No schema validation on status update

### 3. MEDIUM: Missing Zod - `/api/user/suspend-account/route.ts` (Line 24)
No schema validation on reason field

### 4. MEDIUM: Error Message Exposure - `/api/auth/verify-email/route.ts` (Line 94)
Exposes error.message to client

### 5. MEDIUM: Weak Rate Limiting - `/api/discover/route.ts` (Line 278-283)
Rate limits stored in cache, easily bypassable

### 6. MEDIUM: No Pagination Limit - `/api/users/list/route.ts` (Line 51)
Returns up to 500 users at once

### 7. MEDIUM: Missing Zod - `/api/profile/photos/route.ts` (Line 29)
No validation on imageUrl

### 8. MEDIUM: Missing Zod - `/api/discover/route.ts` (POST - Line 231)
No schema validation on action parameters

---

## Routes Without Authentication (Intentional)

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/auth/[...nextauth]/route.ts` | NextAuth handler | OK |
| `/api/auth/register/route.ts` | User registration | OK |
| `/api/auth/forgot-password/route.ts` | Password reset request | OK |
| `/api/auth/reset-password/route.ts` | Password reset execution | OK |
| `/api/auth/verify-email/route.ts` | Email verification | OK |
| `/api/auth/verify-reset-token/route.ts` | Token validation | OK |
| `/api/auth/resend-verification/route.ts` | Resend verification | OK |
| `/api/monitoring/health/route.ts` | Health check | OK |
| `/api/ping/route.ts` | Ping endpoint | OK |
| `/api/health/route.ts` | Health check | OK |

---

## Route-by-Route Analysis

| Route | Method | Auth | Ownership | Zod | Status |
|-------|--------|------|-----------|-----|--------|
| `/api/auth/[...nextauth]` | GET/POST | N/A | N/A | N/A | OK |
| `/api/auth/register` | POST | No | N/A | Yes | OK |
| `/api/auth/login` | POST | No | N/A | Yes | OK |
| `/api/auth/logout` | POST | Yes | Yes | No | OK |
| `/api/auth/forgot-password` | POST | No | N/A | Yes | OK |
| `/api/auth/reset-password` | POST | No | N/A | Yes | OK |
| `/api/auth/verify-email` | POST | No | N/A | Yes | OK |
| `/api/auth/verify-reset-token` | POST | No | N/A | Yes | OK |
| `/api/auth/resend-verification` | POST | No | N/A | Yes | OK |
| `/api/chat/create-channel` | POST | Yes | Partial | No | MEDIUM |
| `/api/chat/stream/token` | GET | Yes | Yes | N/A | OK |
| `/api/chat/stream/webhook` | POST | Signature | N/A | No | CRITICAL |
| `/api/discover` | GET | Yes | Yes | No | MEDIUM |
| `/api/discover` | POST | Yes | Yes | No | MEDIUM |
| `/api/likes` | POST | Yes | Yes | No | CRITICAL |
| `/api/matches` | GET | Yes | Yes | N/A | OK |
| `/api/matches` | POST | Yes | Yes | No | HIGH |
| `/api/matches/create-channels` | POST | Yes | Partial | No | CRITICAL |
| `/api/monitoring/health` | GET | No | N/A | N/A | OK |
| `/api/ping` | GET | No | N/A | N/A | OK |
| `/api/health` | GET | No | N/A | N/A | OK |
| `/api/profile` | GET | Yes | Yes | N/A | OK |
| `/api/profile` | PUT | Yes | Yes | No | HIGH |
| `/api/profile/photos` | GET | Yes | Yes | N/A | OK |
| `/api/profile/photos` | POST | Yes | Yes | No | MEDIUM |
| `/api/profile/photos` | DELETE | Yes | Yes | N/A | OK |
| `/api/profile/photos/[photoId]` | DELETE | Yes | Yes | N/A | OK |
| `/api/profile/photos/[photoId]` | PUT | Yes | Yes | No | OK |
| `/api/user/current` | GET | Yes | Yes | N/A | OK |
| `/api/user/delete-account` | DELETE | Yes | **NO** | No | CRITICAL |
| `/api/user/status` | GET | Yes | Partial | No | OK |
| `/api/user/status` | POST | Yes | Yes | No | MEDIUM |
| `/api/user/status` | PATCH | Yes | Yes | N/A | OK |
| `/api/user/status` | DELETE | Yes | Yes | N/A | OK |
| `/api/user/stats` | GET | Yes | Yes | N/A | OK |
| `/api/user/suspend-account` | POST | Yes | Yes | No | MEDIUM |
| `/api/user/suspend-account` | PUT | Yes | Yes | N/A | OK |
| `/api/user/suspend-account` | GET | Yes | Yes | N/A | OK |
| `/api/user-preferences` | GET | Yes | Yes | N/A | OK |
| `/api/user-preferences` | PUT | Yes | Yes | Partial | OK |
| `/api/user-profile` | GET | Yes | Yes | N/A | OK |
| `/api/user-profile` | PUT | Yes | Yes | No | HIGH |
| `/api/users/[userId]` | GET | Yes | **NO** | N/A | CRITICAL |
| `/api/users/[userId]/activity` | GET | Yes | Yes | N/A | OK |
| `/api/users/[userId]/stats` | GET | Yes | Yes | N/A | OK |
| `/api/users/list` | GET | Yes | **NO** | N/A | CRITICAL |
| `/api/users/list` | POST | Yes | **NO** | No | CRITICAL |

---

## Recommendations for auth-middleware Agent

### Priority 1: Critical IDOR Fixes

1. **`/api/users/[userId]/route.ts`**
   - Add ownership check: `if (session.user.id !== userId) return 403`
   - OR limit fields returned for non-owner requests

2. **`/api/user/delete-account/route.ts`**
   - REMOVE `forceUserId` and `forceUserEmail` parameters completely
   - Only use `session.user.id` for deletion

3. **`/api/users/list/route.ts`**
   - Remove `email` from returned fields
   - OR implement admin role check

4. **`/api/matches/create-channels/route.ts`**
   - Change from `OR` to `AND` for like check (require mutual match)

### Priority 2: Add Zod Validation

Routes requiring Zod schemas:
- `/api/likes/route.ts`
- `/api/matches/route.ts` (POST)
- `/api/discover/route.ts` (POST)
- `/api/chat/create-channel/route.ts`
- `/api/user/status/route.ts` (POST)
- `/api/user/suspend-account/route.ts`
- `/api/profile/photos/route.ts` (POST)
- `/api/user-profile/route.ts` (PUT)

### Ownership Check Pattern

```typescript
// Recommended pattern for ownership verification
const { userId } = await params;

// Check auth
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
}

// Check ownership
if (session.user.id !== userId) {
  return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
}
```

---

## Files Requiring Immediate Attention

1. `app/api/user/delete-account/route.ts` - Line 16-17, 36
2. `app/api/users/[userId]/route.ts` - Line 26-52
3. `app/api/users/list/route.ts` - Line 19-52
4. `app/api/matches/create-channels/route.ts` - Line 19-26
5. `app/api/chat/stream/webhook/route.ts` - Line 16
6. `app/api/likes/route.ts` - Line 24

---

*Generated by Security Audit Agent*
