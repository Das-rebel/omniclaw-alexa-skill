# Contributing to TMLPD

Thank you for your interest in contributing to TMLPD (TreeQuest Multi-LLM Parallel Deployment)! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation Standards](#documentation-standards)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a welcoming and inclusive environment. Please be respectful, constructive, and collaborative.

### Our Pledge

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs. **actual behavior**
- **Environment details** (OS, TreeQuest version, etc.)
- **Screenshots or logs** if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear description** of the suggested enhancement
- **Use cases** and benefits
- **Potential implementation approach** (if known)
- **Alternatives considered**

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Development Setup

### Prerequisites

- Python 3.8+
- TreeQuest CLI installed
- Git
- Multiple LLM API keys configured

### Setup Steps

```bash
# Fork and clone your fork
git clone https://github.com/your-username/tmlpd-skill.git
cd tmlpd-skill

# Create a virtual environment (optional)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install TreeQuest
pip install treequest-ai

# Copy skill files locally for testing
mkdir -p ~/.claude/skills
cp src/skills/* ~/.claude/skills/

# Test the skill
~/.claude/skills/test-tmlpd.sh
```

### Project Structure

```
tmlpd-skill/
├── src/
│   └── skills/           # Main skill files
│       ├── TMLPD.md
│       ├── TMLPD-QUICKREF.md
│       ├── tmlpd-category.yaml
│       ├── tmlpd-phase.yaml
│       └── tmlpd-monitoring.yaml
├── examples/             # Example configurations
├── docs/                 # Additional documentation
├── tests/                # Test files
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

## Pull Request Process

### Before Submitting

1. **Update Documentation** - Ensure docs reflect your changes
2. **Add Tests** - Write tests for new features
3. **Run Tests** - Ensure all tests pass
4. **Update README** - If applicable, update usage examples

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated documentation

## Checklist
- [ ] Code follows project standards
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests for changes
- [ ] All tests pass
```

### Review Process

1. Automated checks must pass
2. At least one maintainer approval
3. No unresolved conflicts
4. PR reviewed and discussed

## Coding Standards

### YAML Configuration

- Use 2 spaces for indentation
- Add comments for complex configurations
- Provide examples for optional fields
- Validate YAML syntax before committing

### Documentation

- Use clear, concise language
- Provide code examples
- Include prerequisites and setup steps
- Add troubleshooting sections

### File Naming

- Use lowercase with hyphens: `tmlpd-config.yaml`
- Descriptive names: `tmlpd-category-mode.yaml`
- Consistent naming conventions

## Documentation Standards

### Markdown Style

- Use ATX-style headings (`# Header`)
- Include line breaks between paragraphs
- Use code blocks with language specification
- Add alt text to images
- Use tables for structured data

### Example Format

```bash
# Always show the command
command-name --argument value

# Show expected output
Expected output here
```

### Configuration Examples

```yaml
# Always comment complex configurations
deployment:
  name: "Example Deployment"  # Clear description
  agents: [...]               # Explain arrays
```

## Testing Guidelines

### Manual Testing

Test your changes with:

```bash
# Run verification script
~/.claude/skills/test-tmlpd.sh

# Test with sample project
cd /path/to/test-project
treequest-parallel --config=test-config.yaml
```

### Test Checklist

- [ ] Skill loads without errors
- [ ] Configuration files are valid YAML
- [ ] Examples work as documented
- [ ] Links and references are correct
- [ ] Documentation is clear and complete

### Automated Testing

If adding test scripts:

```bash
#!/bin/bash
# Test script naming: test-*.sh
set -e  # Exit on error
# Add your test logic
```

## Release Process

### Version Bumping

- Follow Semantic Versioning (MAJOR.MINOR.PATCH)
- Update version in all relevant files
- Update CHANGELOG.md

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Git tag created
- [ ] GitHub release created

## Getting Help

- **Documentation:** Check existing docs first
- **Issues:** Search existing issues
- **Discussions:** Start a discussion for questions
- **Discord:** Join our community (if available)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in significant contributions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TMLPD! 🚀
