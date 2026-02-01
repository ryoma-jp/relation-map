# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Relation Map project.

## Overview

The project uses GitHub Actions for automated testing, security scanning, and Docker image building. All workflows are defined in `.github/workflows/`.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Jobs:**

#### Backend Tests
- Runs backend unit tests with pytest
- Uses PostgreSQL service container
- Generates code coverage report
- Uploads coverage to Codecov
- Runs on: Ubuntu Latest with Python 3.11

**Test Command:**
```bash
pytest tests/ -v --tb=short --cov=. --cov-report=term --cov-report=xml
```

#### Frontend Tests
- Runs frontend unit tests with Jest
- Uses React Testing Library
- Generates code coverage report
- Uploads coverage to Codecov
- Runs on: Ubuntu Latest with Node.js 20

**Test Command:**
```bash
npm test -- --coverage --watchAll=false --passWithNoTests
```

#### E2E Tests
- Runs after backend and frontend tests pass
- Uses Docker Compose to start all services
- Runs Playwright tests in Docker container
- Uploads test reports and screenshots on failure
- Cleans up Docker resources after completion

**Test Command:**
```bash
docker compose -f docker-compose.e2e.yml run --rm e2e-test
```

#### Test Summary
- Aggregates results from all test jobs
- Generates GitHub Actions summary
- Always runs, even if tests fail
- Displays test status for each component

### 2. CodeQL Security Analysis (`codeql.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Weekly on Monday at midnight (scheduled)
- Manual workflow dispatch

**Analysis:**
- Scans Python code for security vulnerabilities
- Scans JavaScript/TypeScript code for security issues
- Uses security-and-quality query suite
- Results visible in Security tab

### 3. Docker Build and Push (`docker-build.yml`)

**Triggers:**
- Push to `main` branch
- Git tags matching `v*.*.*` pattern
- Manual workflow dispatch

**Actions:**
- Builds Docker images for backend and frontend
- Pushes images to GitHub Container Registry (ghcr.io)
- Tags images with:
  - Branch name
  - Git SHA
  - Semantic version (if tag)
- Uses BuildKit cache for faster builds

**Registry:**
- `ghcr.io/<username>/relation-map-backend`
- `ghcr.io/<username>/relation-map-frontend`

## Dependabot Configuration

Dependabot automatically creates PRs for:
- Backend Python dependencies (weekly)
- Frontend npm dependencies (weekly)
- E2E test dependencies (weekly)
- GitHub Actions versions (weekly)
- Docker base images (weekly)

**Configuration:** `.github/dependabot.yml`

## Pull Request Template

All PRs use a template that requires:
- Description of changes
- Link to related issue
- Type of change selection
- Testing confirmation
- Checklist completion

**Template:** `.github/pull_request_template.md`

## Issue Templates

### Bug Report
- Structured form for reporting bugs
- Required fields: description, steps to reproduce, expected behavior
- Optional fields: screenshots, logs, environment details

### Feature Request
- Structured form for proposing new features
- Required fields: problem statement, proposed solution
- Optional fields: alternatives, mockups, contribution offer

**Templates:** `.github/ISSUE_TEMPLATE/`

## Local Testing

Before pushing code, run tests locally:

```bash
# Backend tests
bash run-backend-tests.sh

# Frontend tests
bash run-frontend-tests.sh

# E2E tests
bash run-e2e-tests.sh
```

## Status Checks

Pull requests require:
- [ ] Backend unit tests passing
- [ ] Frontend unit tests passing
- [ ] E2E tests passing (optional, can fail)
- [ ] Code quality checks passing

## Secrets and Environment Variables

### Required Secrets
- `CODECOV_TOKEN` (optional): For code coverage uploads
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Environment Variables
Backend tests:
- `POSTGRES_USER=test_user`
- `POSTGRES_PASSWORD=test_password`
- `POSTGRES_DB=relationmap_test`
- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`

Frontend tests:
- `CI=true`

E2E tests:
- `BASE_URL=http://frontend-e2e:3000`
- `CI=true`

## Artifacts

The following artifacts are uploaded:
- Backend test coverage (XML)
- Frontend test coverage (JSON/HTML)
- E2E test reports (HTML)
- E2E screenshots (on failure)

Artifacts are retained for 90 days.

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Check:**
1. Environment variables match
2. Database schema is up to date
3. Dependencies are locked (package-lock.json, requirements.txt)
4. Docker images are building correctly

### Docker Build Failing

**Common Issues:**
1. Dockerfile syntax errors
2. Missing files in build context
3. Network issues during dependency installation
4. Base image not available

**Solution:**
```bash
# Test build locally
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend
```

### E2E Tests Timing Out

**Possible Causes:**
1. Services taking too long to start
2. Frontend build errors
3. Network connectivity issues in Docker

**Solution:**
- Increase wait times in `run-e2e-tests.sh`
- Check service logs: `docker compose -f docker-compose.e2e.yml logs`

### Codecov Upload Failing

**Notes:**
- Codecov upload is set to `continue-on-error: true`
- Tests will pass even if coverage upload fails
- Check Codecov token if uploads consistently fail

## Best Practices

1. **Run tests locally before pushing**
2. **Keep tests fast** - Target < 10 minutes total CI time
3. **Write descriptive commit messages**
4. **Update tests when changing functionality**
5. **Review CI logs** if tests fail
6. **Keep dependencies up to date** via Dependabot
7. **Add tests for bug fixes** to prevent regressions

## Monitoring

### GitHub Actions Dashboard
- View all workflow runs: `https://github.com/<username>/relation-map/actions`
- Filter by workflow, branch, or status
- Download logs and artifacts

### Security Alerts
- CodeQL results: Security tab → Code scanning alerts
- Dependabot alerts: Security tab → Dependabot alerts

## Future Improvements

Planned enhancements:
- [ ] Performance testing with load tests
- [ ] Deployment to staging/production environments
- [ ] Automated changelog generation
- [ ] Release automation with semantic-release
- [ ] Integration with Slack/Discord for notifications
- [ ] Code coverage trending and enforcement
- [ ] Browser compatibility testing matrix
- [ ] Visual regression testing

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Codecov Action](https://github.com/codecov/codecov-action)
- [CodeQL Action](https://github.com/github/codeql-action)
- [Playwright Documentation](https://playwright.dev/)
