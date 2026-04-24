# OmniClaw Enhanced - Security Best Practices Guide
# Version: 1.0.0
# Last Updated: 2026-03-27

## Table of Contents
1. [Introduction](#introduction)
2. [Application Security](#application-security)
3. [Data Security](#data-security)
4. [API Security](#api-security)
5. [Authentication & Authorization](#authentication--authorization)
6. [Network Security](#network-security)
7. [Cloud Security](#cloud-security)
8. [Secure Development](#secure-development)
9. [Incident Response](#incident-response)
10. [Compliance](#compliance)

---

## Introduction

This guide provides comprehensive security best practices for the OmniClaw Enhanced voice control system. It covers all aspects of security from development to deployment and operations.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimum necessary access for all users
3. **Security by Design**: Security built in from the start
4. **Zero Trust**: Verify explicitly, use least privilege access
5. **Assume Breach**: Design for when controls fail

### Threat Model

**Primary Threats:**
- Unauthorized access to user data
- API key exposure and abuse
- OAuth token theft
- Data breaches and leaks
- DDoS attacks
- Injection attacks (SQL, XSS, CSRF)
- Man-in-the-middle attacks

**Attack Surface:**
- Cloud Functions endpoints
- OAuth callbacks
- API integrations
- Database queries
- File uploads
- WebSocket connections

---

## Application Security

### Input Validation

**General Rules:**
```javascript
// ✅ GOOD: Validate and sanitize input
function processInput(input) {
  // Type validation
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }

  // Length validation
  if (input.length > 1000) {
    throw new Error('Input too long');
  }

  // Whitelist validation
  const sanitized = input.replace(/[<>\"']/g, '');

  return sanitized;
}

// ❌ BAD: Trusting input directly
function processInput(input) {
  return input; // Vulnerable to XSS
}
```

**Validation Checklist:**
- [ ] Validate all input types
- [ ] Enforce length limits
- [ ] Use whitelists, not blacklists
- [ ] Sanitize all user input
- [ ] Validate file uploads
- [ ] Check MIME types
- [ ] Scan uploads for malware

### Output Encoding

```javascript
// ✅ GOOD: Encode output
function renderOutput(userInput) {
  return escapeHtml(userInput);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ❌ BAD: Direct output
function renderOutput(userInput) {
  return `<div>${userInput}</div>`; // XSS vulnerable
}
```

### Error Handling

**Security Best Practices:**
```javascript
// ✅ GOOD: Secure error handling
async function secureFunction() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    // Log detailed error securely
    logger.error('Operation failed', {
      error: error.message,
      userId: req.user.id,
      timestamp: new Date()
    });

    // Return generic error to user
    throw new Error('Operation failed. Please try again.');
  }
}

// ❌ BAD: Exposing sensitive information
function insecureFunction() {
  try {
    return riskyOperation();
  } catch (error) {
    throw new Error(`Database error: ${error.stack}`); // Leaks implementation
  }
}
```

**Error Handling Rules:**
- [ ] Never expose stack traces to users
- [ ] Log errors securely with context
- [ ] Return generic error messages
- [ ] Sanitize error messages
- [ ] Monitor error rates
- [ ] Alert on suspicious errors

### Session Management

```javascript
// ✅ GOOD: Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // No JavaScript access
    maxAge: 1800000,     // 30 minutes
    sameSite: 'strict'   // CSRF protection
  },
  name: 'sessionId'      // Hide framework
}));
```

**Session Security:**
- [ ] Use HTTPS only
- [ ] Set HttpOnly flag
- [ ] Set SameSite to Strict
- [ ] Implement session timeout
- [ ] Regenerate session ID after login
- [ ] Destroy session on logout
- [ ] Limit concurrent sessions

---

## Data Security

### Encryption at Rest

**Firestore Encryption:**
```javascript
// Firestore automatically encrypts data at rest
// Additional application-level encryption:

const crypto = require('crypto');

function encryptSensitiveData(data) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

**Encryption Requirements:**
- [ ] AES-256 encryption algorithm
- [ ] Unique IV for each encryption
- [ ] Store encryption keys securely
- [ ] Use GCP KMS for key management
- [ ] Rotate encryption keys regularly
- [ ] Never hardcode encryption keys

### Encryption in Transit

```javascript
// ✅ GOOD: Enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ✅ GOOD: TLS configuration
const tlsOptions = {
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'HIGH'
  ].join(':')
};
```

**TLS Configuration:**
- [ ] Use TLS 1.2 or higher
- [ ] Disable SSL v2/v3
- [ ] Disable TLS 1.0/1.1
- [ ] Use strong cipher suites
- [ ] Enable HSTS
- [ ] Use valid certificates
- [ ] Configure certificate pinning

### Data Masking

```javascript
// ✅ GOOD: Mask sensitive data in logs
function maskSensitiveData(data) {
  return {
    ...data,
    email: maskEmail(data.email),
    phone: maskPhone(data.phone),
    ssn: maskSSN(data.ssn)
  };
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
}

function maskPhone(phone) {
  return phone.replace(/\d(?=\d{4})/g, '*');
}

// Never log sensitive data
logger.info('User updated', {
  userId: user.id,
  // ❌ BAD: email: user.email,
  // ✅ GOOD: email: maskEmail(user.email)
});
```

### Data Retention

```javascript
// ✅ GOOD: Automatic data deletion
async function deleteExpiredData() {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - 365); // 1 year

  await db.collection('user-activities')
    .where('createdAt', '<', retentionDate)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      return batch.commit();
    });
}

// Run daily
cron.schedule('0 0 * * *', deleteExpiredData);
```

---

## API Security

### Authentication

```javascript
// ✅ GOOD: API key authentication
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate API key
  const key = await ApiKey.findOne({ key: apiKey });

  if (!key || !key.isActive) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  // Check rate limit
  const usage = await getApiUsage(key.id);
  if (usage.count >= key.rateLimit) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  req.apiKey = key;
  next();
}
```

### Rate Limiting

```javascript
// ✅ GOOD: Rate limiting with Redis
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.apiKey?.id || req.ip;
  }
});

app.use('/api/', apiLimiter);
```

**Rate Limiting Strategy:**
- [ ] Per-IP rate limits
- [ ] Per-API-key limits
- [ ] Endpoint-specific limits
- [ ] Gradual throttling
- [ ] Retry-after header
- [ ] Monitor for abuse

### Input Validation

```javascript
// ✅ GOOD: Schema validation
const { body, validationResult } = require('express-validator');

app.post('/api/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('name').trim().isLength({ min: 2, max: 50 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

### API Key Management

```javascript
// ✅ GOOD: Secure API key generation
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// ✅ GOOD: API key rotation
async function rotateApiKey(keyId) {
  const oldKey = await ApiKey.findById(keyId);

  // Create new key
  const newKey = new ApiKey({
    key: generateApiKey(),
    userId: oldKey.userId,
    createdAt: new Date()
  });

  await newKey.save();

  // Revoke old key
  oldKey.isActive = false;
  oldKey.revokedAt = new Date();
  await oldKey.save();

  return newKey;
}
```

---

## Authentication & Authorization

### Password Security

```javascript
// ✅ GOOD: Password hashing with bcrypt
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Password policy
function validatePassword(password) {
  const policy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true
  };

  if (password.length < policy.minLength) {
    return false;
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    return false;
  }

  if (policy.requireSpecial && !/[!@#$%^&*]/.test(password)) {
    return false;
  }

  return true;
}
```

### JWT Security

```javascript
// ✅ GOOD: JWT configuration
const jwt = require('jsonwebtoken');

function generateToken(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'omniclaw-enhanced',
    audience: 'omniclaw-api'
  });
}

// ✅ GOOD: JWT validation
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'omniclaw-enhanced',
      audience: 'omniclaw-api'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### OAuth Security

```javascript
// ✅ GOOD: OAuth state parameter
function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function verifyState(state, storedState) {
  return crypto.timingSafeEqual(
    Buffer.from(state),
    Buffer.from(storedState)
  );
}

// ✅ GOOD: PKCE implementation
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

async function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256');
  hash.update(verifier);
  return hash.digest('base64url');
}
```

### Role-Based Access Control (RBAC)

```javascript
// ✅ GOOD: Role-based middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.get('/api/admin/users',
  authenticate,
  authorize('admin', 'superadmin'),
  async (req, res) => {
    // Admin only code
  }
);
```

---

## Network Security

### Firewall Rules

```javascript
// ✅ GOOD: IP whitelist middleware
function whitelistIPs(allowedIPs) {
  return (req, res, next) => {
    const clientIP = req.ip;

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({ error: 'IP not allowed' });
    }

    next();
  };
}

// Usage
app.use('/api/admin',
  whitelistIPs(process.env.ALLOWED_ADMIN_IPS.split(','))
);
```

### DDoS Protection

```javascript
// ✅ GOOD: DDoS protection
const Ddos = require('ddos');
const ddos = new Ddos({ burst: 10, limit: 15 });

app.use(ddos.express);

// Additional protection
const rateLimit = require('express-rate-limit');

const ddosProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP
  message: 'Too many requests from this IP'
});

app.use(ddosProtection);
```

### Security Headers

```javascript
// ✅ GOOD: Security headers middleware
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));
```

---

## Cloud Security

### GCP Security Best Practices

```javascript
// ✅ GOOD: IAM roles
{
  "bindings": [
    {
      "role": "roles/cloudfunctions.invoker",
      "members": ["allUsers"]
    },
    {
      "role": "roles/datastore.user",
      "members": ["serviceAccount:omnicloud@project.iam.gserviceaccount.com"]
    }
  ]
}

// ✅ GOOD: Service account with minimal permissions
gcloud iam service-accounts create omnicloud-sa \
  --display-name "OmniClaw Service Account"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:omnicloud-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/datastore.user"
```

### Secret Management

```javascript
// ✅ GOOD: Using GCP Secret Manager
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.PROJECT_ID}/secrets/${secretName}/versions/latest`
  });

  return version.payload.data.toString('utf8');
}

// Usage
const apiKey = await getSecret('anthropic-api-key');
```

### Cloud Functions Security

```yaml
# ✅ GOOD: Secure deployment configuration
gcloud functions deploy omniclaw-analytics \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --security-policy ddos-policy \
  --max-instances 100 \
  --memory 256MB \
  --timeout 30s \
  --entry-point analyticsHandler
```

---

## Secure Development

### Dependency Management

```bash
# ✅ GOOD: Regular dependency updates
npm audit
npm audit fix
npm outdated
npm update

# Use npm-check-updates
npx npm-check-updates -u
npm install
```

### Code Quality

```javascript
// ✅ GOOD: ESLint security rules
module.exports = {
  extends: [
    'plugin:security/recommended'
  ],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error'
  }
};
```

### Testing

```javascript
// ✅ GOOD: Security testing
describe('Security Tests', () => {
  test('should sanitize user input', async () => {
    const malicious = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/api/users')
      .send({ name: malicious });

    expect(response.body.name).not.toContain('<script>');
  });

  test('should prevent SQL injection', async () => {
    const malicious = "'; DROP TABLE users; --";
    const response = await request(app)
      .get(`/api/users?id=${malicious}`);

    expect(response.status).toBe(400);
  });

  test('should enforce rate limits', async () => {
    const promises = Array(101).fill(null).map(() =>
      request(app).get('/api/test')
    );

    const responses = await Promise.all(promises);
    const rateLimitErrors = responses.filter(r => r.status === 429);

    expect(rateLimitErrors.length).toBeGreaterThan(0);
  });
});
```

---

## Incident Response

### Detection

```javascript
// ✅ GOOD: Security monitoring
const securityEvents = {
  multipleFailedLogins: async (userId) => {
    const attempts = await LoginAttempt.count({
      userId,
      success: false,
      timestamp: { $gte: new Date(Date.now() - 300000) } // 5 minutes
    });

    if (attempts >= 5) {
      await SecurityAlert.create({
        type: 'BRUTE_FORCE',
        userId,
        severity: 'HIGH'
      });

      // Lock account
      await User.update(userId, { locked: true });
    }
  },

  unusualAPIUsage: async (apiKeyId) => {
    const usage = await APIUsage.aggregate([
      { $match: { apiKeyId, timestamp: { $gte: new Date(Date.now() - 3600000) } } },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]);

    if (usage[0]?.total > 1000) {
      await SecurityAlert.create({
        type: 'API_ABUSE',
        apiKeyId,
        severity: 'MEDIUM'
      });
    }
  }
};
```

### Response

```javascript
// ✅ GOOD: Automated response
async function handleSecurityAlert(alert) {
  switch (alert.type) {
    case 'BRUTE_FORCE':
      // Lock account
      await User.update(alert.userId, { locked: true });
      // Notify user
      await sendEmail(alert.userId, 'Account locked due to suspicious activity');
      break;

    case 'API_ABUSE':
      // Revoke API key
      await ApiKey.update(alert.apiKeyId, { active: false });
      // Notify admin
      await notifyAdmin('API key revoked due to abuse');
      break;

    case 'DATA_BREACH':
      // Trigger incident response
      await triggerIncidentResponse(alert);
      break;
  }
}
```

---

## Compliance

### GDPR Implementation

```javascript
// ✅ GOOD: GDPR compliance
const gdpr = {
  // Right to access
  async exportUserData(userId) {
    const userData = await User.findById(userId);
    const activities = await Activity.find({ userId });

    return {
      personalData: userData,
      activities: activities,
      exportDate: new Date()
    };
  },

  // Right to erasure
  async deleteUserData(userId) {
    await User.delete(userId);
    await Activity.deleteMany({ userId });
    await AuditLog.create({ action: 'USER_DELETED', userId });
  },

  // Right to rectification
  async updateUserData(userId, updates) {
    await User.update(userId, updates);
    await AuditLog.create({ action: 'USER_UPDATED', userId, updates });
  }
};
```

### Audit Logging

```javascript
// ✅ GOOD: Comprehensive audit logging
async function auditLog(action, userId, details) {
  await AuditLog.create({
    timestamp: new Date(),
    action,
    userId,
    details,
    ipAddress: details.ip,
    userAgent: details.userAgent,
    success: details.success !== false
  });
}

// Usage
await auditLog('USER_LOGIN', userId, {
  success: true,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});
```

---

## Conclusion

This security guide provides a comprehensive foundation for securing the OmniClaw Enhanced system. Key takeaways:

1. **Defense in Depth**: Implement multiple layers of security
2. **Zero Trust**: Verify everything explicitly
3. **Continuous Monitoring**: Detect and respond to threats quickly
4. **Regular Updates**: Keep dependencies and systems updated
5. **Security Testing**: Regular penetration testing and code reviews
6. **Incident Response**: Be prepared for security incidents
7. **Compliance**: Meet regulatory requirements

### Next Steps

1. Conduct security audit using `security-audit.sh`
2. Review and update security policies
3. Implement automated security scanning
4. Train development team on secure practices
5. Schedule regular security reviews

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GCP Security Best Practices](https://cloud.google.com/security)
- [Node.js Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [GDPR Compliance Guide](https://gdpr-info.eu/)

---

**Document Control**

- **Version:** 1.0.0
- **Author:** Security Team
- **Last Updated:** 2026-03-27
- **Next Review:** 2026-09-27
