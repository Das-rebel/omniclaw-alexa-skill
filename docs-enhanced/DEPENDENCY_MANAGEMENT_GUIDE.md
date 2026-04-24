# Dependency Management Guide

**Complete guide to managing dependencies in OmniClaw Enhanced**

## Table of Contents

1. [Overview](#overview)
2. [Adding New Dependencies](#adding-new-dependencies)
3. [Updating Dependencies](#updating-dependencies)
4. [Security Patching](#security-patching)
5. [License Compliance](#license-compliance)
6. [Testing After Updates](#testing-after-updates)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

OmniClaw Enhanced uses a comprehensive dependency management system to keep dependencies secure, up-to-date, and compliant with licensing requirements.

### Key Principles

- **Security First**: Automatic patching of critical vulnerabilities within 24 hours
- **Test-Driven**: All updates must pass tests before being applied
- **Gradual Updates**: Patch → Minor → Major progression
- **Rollback Ready**: Automatic rollback on test failures
- **License Compliant**: All dependencies must use permissive licenses

## Adding New Dependencies

### 1. Research Phase

Before adding a new dependency:

```bash
# Check if the package exists and is maintained
npm view <package-name>

# Check for known vulnerabilities
npm audit <package-name>

# Check license
npm view <package-name> license

# Check download stats (popularity/maintenance)
npm view <package-name> downloads
```

### 2. License Check

Verify the license is compatible:

**Allowed Licenses:**
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- CC0-1.0

**Problematic Licases:**
- GPL (requires code disclosure)
- AGPL (requires network source disclosure)
- SSPL (not OSI-approved)

### 3. Install and Test

```bash
# Install the package
npm install <package-name>

# Save to package.json
npm install <package-name> --save

# Or for dev dependency
npm install <package-name> --save-dev

# Run tests to ensure compatibility
npm test
```

### 4. Verify

```bash
# Run license check
./dependency-manager/cli/dep-cli.sh licenses

# Run vulnerability scan
./dependency-manager/cli/dep-cli.sh vulnerabilities
```

## Updating Dependencies

### Automated Updates

The system provides automated updates based on severity:

#### Patch Updates (Bug Fixes)

**When**: Weekly (Sunday 2 AM UTC)
**Risk**: Low (backward compatible)
**Action**: Automatic
**Example**: 1.2.3 → 1.2.4

```bash
# Manually trigger patch updates
./dependency-manager/cli/dep-cli.sh update --patch-only
```

#### Minor Updates (New Features)

**When**: Monthly (1st Sunday 3 AM UTC)
**Risk**: Medium (usually backward compatible)
**Action**: PR review required
**Example**: 1.2.3 → 1.3.0

```bash
# Check for minor updates
./dependency-manager/cli/dep-cli.sh outdated

# Create PR for review
./dependency-manager/cli/dep-cli.sh update
```

#### Major Updates (Breaking Changes)

**When**: Manual only
**Risk**: High (may break code)
**Action**: Manual review and testing
**Example**: 1.2.3 → 2.0.0

```bash
# Check for major updates
./dependency-manager/cli/dep-cli.sh outdated

# Review changelog
npm view <package> versions
npm view <package> homepage

# Manual update with testing
npm install <package>@<version>
npm test
```

### Update Workflow

1. **Scan** current dependencies
2. **Check** for outdated packages
3. **Review** changelogs for major/minor updates
4. **Update** using appropriate method
5. **Test** thoroughly
6. **Deploy** if tests pass
7. **Monitor** for issues

## Security Patching

### Critical Vulnerabilities

**Response Time**: Within 24 hours

```bash
# Check for vulnerabilities
./dependency-manager/cli/dep-cli.sh vulnerabilities

# Auto-patch critical issues
./dependency-manager/cli/dep-cli.sh update --patch-only
```

### Vulnerability Response Process

1. **Detection**: Automated scan detects vulnerability
2. **Assessment**: Determine severity level
3. **Patch**: Apply patch if available
4. **Test**: Run full test suite
5. **Deploy**: If tests pass
6. **Rollback**: If tests fail

### Security Sources

- npm audit
- GitHub Security Advisories
- Snyk (optional)
- Node Security Platform (optional)

### Manual Security Check

```bash
# Run npm audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Fix only package updates (no breaking changes)
npm audit fix --package-lock-only

# Check specific package
npm audit <package-name>
```

## License Compliance

### Checking Licenses

```bash
# Check all dependencies
./dependency-manager/cli/dep-cli.sh licenses

# Export for README
./dependency-manager/cli/dep-cli.sh licenses --export-readme
```

### Compliance Process

1. **Scan** all dependencies
2. **Identify** problematic licenses
3. **Review** non-compliant packages
4. **Replace** with alternatives if needed
5. **Document** any exceptions

### License Categories

#### Permissive (Allowed)
- MIT: Most permissive, no restrictions
- Apache-2.0: Permissive + patent grant
- BSD: Permissive with attribution requirement
- ISC: Similar to MIT

#### Copyleft (Review Required)
- GPL: Requires source disclosure
- LGPL: Lesser GPL, allows linking
- MPL: Mozilla Public License

#### Proprietary (Avoid)
- Commercial licenses requiring payment
- Custom restrictive licenses

## Testing After Updates

### Test Types

1. **Unit Tests**: Fast, isolated tests
2. **Integration Tests**: Component interaction tests
3. **E2E Tests**: Full workflow tests
4. **Regression Tests**: Compare with baseline

### Running Tests

```bash
# Run all tests
./dependency-manager/cli/dep-cli.sh test

# Run specific test suite
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Regression Detection

```bash
# Create baseline
npm test
cp dependency-manager/data/test-results.json dependency-manager/data/baseline.json

# After update, compare
./dependency-manager/cli/dep-cli.sh test
node dependency-manager/testing/regression-detector.js \
  dependency-manager/data/baseline.json \
  dependency-manager/data/test-results.json
```

### Coverage Requirements

- **Minimum**: 70%
- **Target**: 80%
- **Ideal**: 90%+

```bash
# Check coverage
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Troubleshooting

### Issue: npm install fails

**Symptoms**:
- `ECONNRESET` errors
- `ETIMEDOUT` errors
- `ENOENT` errors

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try different registry
npm install --registry=https://registry.npmjs.org/
```

### Issue: Tests fail after update

**Symptoms**:
- Test suite fails
- Coverage decreased
- Regressions detected

**Solutions**:
```bash
# Check rollback history
./dependency-manager/cli/dep-cli.sh status

# Rollback to previous version
npm install <package>@<previous-version>

# Or use automatic rollback
node dependency-manager/testing/rollback-handler.js rollback
```

### Issue: Vulnerability scan fails

**Symptoms**:
- `npm audit` hangs
- Returns error
- Shows false positives

**Solutions**:
```bash
# Update npm audit database
npm audit fix --force

# Check GitHub for known issues
npm view <package> homepage

# Report false positive to npm
# https://www.npmjs.com/advisories/report
```

### Issue: License check shows violations

**Symptoms**:
- GPL license detected
- Non-compliant packages found

**Solutions**:
```bash
# Review license report
cat dependency-manager/data/license-report.json

# Find alternatives
# https://www.npms.io/
# https://bundlephobia.com/

# Replace with compatible package
npm uninstall <problematic-package>
npm install <alternative-package>
```

## Best Practices

### 1. Version Ranges

Use specific version ranges:

```json
{
  "dependencies": {
    "exact-package": "1.2.3",           // Exact version
    "patch-safe": "^1.2.3",              // Allow patches (1.2.x)
    "minor-safe": "~1.2.3",              // Allow minors (1.x)
    "latest-safe": ">=1.2.3 <2.0.0"     // Range with cap
  }
}
```

### 2. Lock Files

**Always commit** `package-lock.json`:

```bash
git add package-lock.json
git commit -m "Lock dependency versions"
```

**Benefits**:
- Reproducible installs
- Prevents version drift
- Catches security updates
- Ensures team consistency

### 3. Regular Updates

**Weekly**:
```bash
./dependency-manager/cli/dep-cli.sh outdated
./dependency-manager/cli/dep-cli.sh update --patch-only
```

**Monthly**:
```bash
./dependency-manager/cli/dep-cli.sh vulnerabilities
./dependency-manager/cli/dep-cli.sh licenses
```

**Quarterly**:
```bash
# Review major updates
npm outdated
# Update changelog
# Plan migrations
```

### 4. Testing Strategy

**Before deploying**:
1. Run full test suite
2. Check coverage report
3. Run integration tests
4. Test in staging environment
5. Monitor production logs

**After deploying**:
1. Monitor error rates
2. Check performance metrics
3. Review logs for warnings
4. Watch for deprecated APIs

### 5. Dependency Hygiene

**Remove unused dependencies**:
```bash
# Check for unused
npx depcheck

# Remove unused
npm uninstall <unused-package>

# Prune extraneous
npm prune
```

**Keep dependencies minimal**:
- Prefer smaller packages
- Avoid dependency chains
- Use tree-shaking
- Consider bundle size

### 6. Documentation

**Document decisions**:
```markdown
# DEPENDENCIES.md

## Why We Use Package X
- Feature: Y
- Alternative: Z (rejected because...)

## Version Constraints
- Package A: Locked to 1.x (breaking changes in 2.0)
- Package B: Allow patches only (stable API)

## Known Issues
- Package C v2.1.0 has issue #123
- Workaround: Use v2.0.9 until fixed
```

### 7. Security Monitoring

**Automated alerts**:
- Enable GitHub Dependabot
- Set up Snyk monitoring
- Configure npm audit notifications
- Subscribe to security advisories

**Manual reviews**:
- Review security mailing lists
- Check CVE database
- Monitor package repositories
- Update dependencies regularly

## Emergency Procedures

### Critical Vulnerability Found

1. **Assess**: Determine impact
2. **Patch**: Apply fix immediately
3. **Test**: Run critical tests only
4. **Deploy**: Push to production
5. **Verify**: Monitor for issues
6. **Document**: Record the incident

```bash
# Emergency patch script
./dependency-manager/cli/dep-cli.sh vulnerabilities
npm audit fix --force
npm test -- --testPathPattern="critical"
git commit -am "Emergency security patch"
git push
```

### Update Breaks Production

1. **Rollback**: Revert immediately
2. **Investigate**: Find root cause
3. **Fix**: Create patch
4. **Test**: Thoroughly test
5. **Deploy**: With monitoring

```bash
# Emergency rollback
git revert HEAD
git push
./deploy.sh rollback
```

## Metrics and Monitoring

### Key Metrics

- **Dependencies Count**: Total number of dependencies
- **Outdated Count**: Number of outdated packages
- **Vulnerabilities**: Count by severity
- **License Compliance**: Percentage compliant
- **Test Pass Rate**: After updates
- **Rollback Rate**: Frequency of rollbacks

### Monitoring

```bash
# Generate weekly report
./dependency-manager/cli/dep-cli.sh status > weekly-report.txt

# Track trends
git log --oneline --grep="chore: update" > updates.log

# Monitor rollback frequency
ls -la dependency-manager/backups/ | wc -l
```

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Node Security Platform](https://npmjs.com/advisories)
- [GitHub Security Advisories](https://github.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [SemVer Calculator](https://semver.npmjs.com/)
- [Bundlephobia](https://bundlephobia.com/) - Check package sizes

---

**Last Updated**: 2026-03-27
**Version**: 1.0.0
