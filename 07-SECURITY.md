# LexVault — Security Requirements & Threat Model

## Threat Model Overview

LexVault handles legal documents that may contain sensitive information. The security posture must account for document confidentiality, data integrity, and system availability.

### Assets to Protect

| Asset | Sensitivity | Impact of Compromise |
|-------|------------|---------------------|
| Uploaded documents (PDF/TXT) | High | Confidential legal documents exposed |
| Document metadata | Medium | Jurisdiction assignments reveal legal strategy |
| User credentials | Critical | Account takeover, unauthorized document access |
| Audit logs | High | Tampering hides malicious activity |
| Extracted text content | High | Full-text search index contains document content |
| S3 storage keys | Critical | Direct access to all stored files |
| JWT signing secret | Critical | Forge tokens for any user |

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| External attacker | Data theft, ransomware | Web attacks, credential stuffing |
| Malicious user | Access other users' documents | Authenticated API abuse, IDOR |
| Insider (compromised account) | Data exfiltration | Valid credentials, normal access patterns |
| Automated bot | Credential stuffing, spam uploads | High volume, distributed |

---

## 1. Authentication & Authorization

### 1.1 Password Requirements

```typescript
const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  // Check against Have I Been Pwned API (k-anonymity model)
  checkBreachedPasswords: true,
};
```

**Implementation:**
- Hash with bcrypt, cost factor ≥ 12
- Never log passwords, even hashed
- Never return password hash in API responses
- Enforce password policy on registration AND password change
- Compare against top 100,000 common passwords (offline list)

### 1.2 JWT Token Security

```typescript
const JWT_CONFIG = {
  algorithm: 'HS256',                // HMAC-SHA256
  accessTokenExpiry: '15m',          // Short-lived access tokens
  refreshTokenExpiry: '7d',          // Longer refresh tokens
  issuer: 'lexvault.ca',
  audience: 'lexvault-api',
};
```

**Token handling rules:**
- Access tokens: stored in memory only (not localStorage, not cookies)
- Refresh tokens: stored in httpOnly, secure, SameSite=Strict cookie
- Token rotation: new refresh token issued on each refresh (old one invalidated)
- Revocation: maintain a Redis blocklist of revoked token JTIs
- Never include sensitive data in JWT payload (no email, no roles — just userId and JTI)

### 1.3 Rate Limiting

```typescript
const RATE_LIMITS = {
  // Auth endpoints — strictest limits
  login:          { windowMs: 15 * 60 * 1000, max: 10, keyBy: 'ip' },
  register:       { windowMs: 60 * 60 * 1000, max: 5,  keyBy: 'ip' },
  passwordReset:  { windowMs: 60 * 60 * 1000, max: 3,  keyBy: 'ip' },

  // API endpoints — per-user limits
  upload:         { windowMs: 60 * 60 * 1000, max: 50,  keyBy: 'userId' },
  search:         { windowMs: 60 * 1000,      max: 30,  keyBy: 'userId' },
  general:        { windowMs: 60 * 1000,      max: 100, keyBy: 'userId' },
};
```

**Implementation:** Use `express-rate-limit` with Redis store for distributed rate limiting. Return `429 Too Many Requests` with `Retry-After` header.

### 1.4 Authorization Model

```typescript
// Simple ownership-based authorization
// Every document belongs to exactly one user
// Users can only access their own documents

async function authorizeDocumentAccess(userId: string, documentId: string): Promise<Document> {
  const document = await db.document.findUnique({ where: { id: documentId } });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  // SECURITY: Always check ownership. This prevents IDOR attacks.
  if (document.userId !== userId) {
    // Return 404, not 403, to avoid leaking existence of other users' documents
    throw new NotFoundError('Document not found');
  }

  return document;
}
```

---

## 2. File Upload Security

### 2.1 File Validation Pipeline

```
Upload received
    │
    ▼
[1] Check Content-Length header ──── > 50MB? → 413 Reject
    │
    ▼
[2] Read first 4096 bytes (magic bytes)
    │
    ▼
[3] Detect file type via magic bytes ── Not PDF/TXT? → 415 Reject
    │
    ▼
[4] Verify MIME matches extension ──── Mismatch? → 415 Reject
    │
    ▼
[5] Sanitize filename ──────────────── Strip path components,
    │                                    replace unsafe chars,
    │                                    truncate to 255 chars
    ▼
[6] Generate random storage key ────── UUID-based, no user input
    │
    ▼
[7] Stream to S3 ──────────────────── Content-Type set by server,
    │                                    not client header
    ▼
[8] Create DB record ─────────────── Within same transaction
    │
    ▼
[9] Audit log entry
    │
    ▼
    Success (201)
```

### 2.2 File Type Detection

```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};

async function validateFileType(buffer: Buffer, originalName: string): Promise<string> {
  // SECURITY: Detect type from magic bytes, not from the filename or Content-Type header
  const detected = await fileTypeFromBuffer(buffer);

  // TXT files have no magic bytes — if file-type returns undefined,
  // check if content is valid UTF-8 text
  if (!detected) {
    if (isValidUTF8(buffer) && originalName.endsWith('.txt')) {
      return 'text/plain';
    }
    throw new FileTypeError('Unable to determine file type');
  }

  if (!ALLOWED_TYPES[detected.mime]) {
    throw new FileTypeError(`File type ${detected.mime} is not allowed. Only PDF and TXT are accepted.`);
  }

  return detected.mime;
}
```

### 2.3 Filename Sanitization

```typescript
function sanitizeFilename(original: string): string {
  // SECURITY: Remove path traversal sequences
  let safe = original.replace(/[/\\]/g, '_');

  // Remove null bytes and control characters
  safe = safe.replace(/[\x00-\x1f\x7f]/g, '');

  // Replace potentially dangerous characters
  safe = safe.replace(/[<>:"|?*]/g, '_');

  // Collapse multiple underscores/dots
  safe = safe.replace(/_{2,}/g, '_').replace(/\.{2,}/g, '.');

  // Truncate to 255 characters (filesystem limit)
  if (safe.length > 255) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 255 - ext.length) + ext;
  }

  // SECURITY: Never use this as the S3 key — always use a generated UUID key.
  // This sanitized name is stored as metadata for display only.
  return safe;
}
```

### 2.4 Content Security for Served Files

```typescript
// When serving files for download, set restrictive headers
function setDownloadHeaders(res: Response, filename: string, contentType: string) {
  // SECURITY: Force download, prevent browser from rendering potentially malicious content
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

  // SECURITY: Override Content-Type to prevent XSS via uploaded HTML-in-PDF etc.
  res.setHeader('Content-Type', contentType);

  // SECURITY: Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // SECURITY: Prevent the file from being framed
  res.setHeader('X-Frame-Options', 'DENY');

  // SECURITY: CSP for the download response
  res.setHeader('Content-Security-Policy', "default-src 'none'");
}
```

---

## 3. API Security

### 3.1 HTTP Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Required for Tailwind
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
```

### 3.2 CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://lexvault.ca']
    : ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400,
}));
```

### 3.3 SQL Injection Prevention

**Enforced at architecture level:**
- All database access goes through Prisma ORM (parameterized queries)
- Raw SQL is prohibited except in migration files
- ESLint rule flags any use of string template literals near database calls

```typescript
// FORBIDDEN — never do this
const results = await db.$queryRaw(`SELECT * FROM documents WHERE title = '${userInput}'`);

// REQUIRED — use Prisma's parameterized queries
const results = await db.document.findMany({
  where: { title: { contains: userInput, mode: 'insensitive' } },
});

// If raw SQL is absolutely necessary, use tagged template literals
const results = await db.$queryRaw(
  Prisma.sql`SELECT * FROM documents WHERE title = ${userInput}`
);
```

### 3.4 Request Validation Middleware

```typescript
// Generic validation middleware factory
function validate(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        type: 'https://lexvault.ca/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: `Invalid ${source}`,
        extensions: {
          errors: result.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
          requestId: req.headers['x-request-id'],
        },
      });
    }

    // Replace raw input with validated, typed data
    req[source] = result.data;
    next();
  };
}

// Usage
router.post('/documents',
  authenticate,
  validate(uploadDocumentSchema, 'body'),
  uploadController.create,
);
```

---

## 4. Data Protection

### 4.1 Encryption

| Data State | Method | Details |
|-----------|--------|---------|
| In transit | TLS 1.3 | Enforced via HSTS, certificate pinning in mobile apps |
| At rest (S3) | AES-256 | S3 server-side encryption (SSE-S3 or SSE-KMS) |
| At rest (database) | Disk encryption | PostgreSQL on encrypted volumes |
| Passwords | bcrypt | Cost factor ≥ 12, per-password salt |
| IP addresses in audit logs | SHA-256 hash | Irreversible, for pattern matching only |

### 4.2 Data Isolation

```
User A ──→ Documents A ──→ S3 keys: uploads/userA_uuid/...
                          DB rows: user_id = A

User B ──→ Documents B ──→ S3 keys: uploads/userB_uuid/...
                          DB rows: user_id = B
```

- Every database query includes `WHERE user_id = $authenticated_user_id`
- S3 keys are namespaced by user ID
- No shared document access in MVP (future: explicit sharing with audit trail)
- Database row-level security (RLS) as defense-in-depth if using Supabase/managed Postgres

### 4.3 Data Retention & Deletion

```typescript
// Soft delete: mark deleted, retain for 30 days, then hard delete
async function deleteDocument(userId: string, documentId: string, context: RequestContext) {
  const document = await authorizeDocumentAccess(userId, documentId);

  await db.transaction(async (tx) => {
    // Soft delete in database
    await tx.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'document.delete',
        resourceType: 'document',
        resourceId: documentId,
        requestId: context.requestId,
        outcome: 'success',
      },
    });
  });

  // Schedule S3 object deletion after retention period
  await scheduler.schedule('delete-s3-object', {
    key: document.fileKey,
    executeAt: addDays(new Date(), 30),
  });
}
```

---

## 5. Infrastructure Security

### 5.1 Network Architecture

```
Internet
    │
    ▼
[CDN / WAF]  ← Rate limiting, DDoS protection, geo-blocking
    │
    ▼
[Load Balancer]  ← TLS termination, health checks
    │
    ▼
[Application Servers]  ← No direct internet access
    │
    ├──▶ [PostgreSQL]  ← Private subnet, no public IP
    ├──▶ [Redis]       ← Private subnet, no public IP
    └──▶ [S3/MinIO]    ← Private endpoint or VPC endpoint
```

### 5.2 Dependency Security

- `pnpm audit` runs in CI on every PR — build fails on critical/high vulnerabilities
- Renovate/Dependabot configured for automated security update PRs
- Lock file (`pnpm-lock.yaml`) committed and integrity-checked in CI
- No `postinstall` scripts from third-party packages without review
- Subresource Integrity (SRI) on any CDN-loaded scripts

### 5.3 Container Security (Docker)

```dockerfile
# Use minimal base image
FROM node:20-alpine AS runtime

# Run as non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Don't include dev dependencies in production image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Read-only filesystem where possible
# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

---

## 6. Security Testing Checklist

### Pre-Release Security Review

- [ ] All dependencies scanned — zero critical/high vulnerabilities
- [ ] OWASP Top 10 review completed for all endpoints
- [ ] File upload abuse tests pass (wrong types, oversized, path traversal, polyglot files)
- [ ] Authentication bypass tests pass (expired tokens, malformed tokens, missing tokens)
- [ ] IDOR tests pass (user A cannot access user B's documents)
- [ ] SQL injection tests pass (all inputs parameterized)
- [ ] XSS tests pass (all user input escaped in responses, CSP headers set)
- [ ] CSRF protection verified (SameSite cookies, no state-changing GETs)
- [ ] Rate limiting verified on auth and upload endpoints
- [ ] Audit logs verified for all state-changing operations
- [ ] Error responses contain no stack traces or internal details
- [ ] Security headers verified (run `securityheaders.com` scan)
- [ ] TLS configuration verified (run `ssllabs.com` scan, target A+)
- [ ] Secrets not present in codebase (`git secrets --scan`)
- [ ] Docker image runs as non-root

### Ongoing Security Practices

| Activity | Frequency | Owner |
|----------|----------|-------|
| Dependency audit | Every PR + weekly | CI automation |
| Penetration testing | Quarterly | External firm or internal security team |
| Audit log review | Monthly | Security lead |
| Access key rotation | Every 90 days | DevOps |
| Incident response drill | Biannually | Full team |
| Security training | Annually | All developers |
