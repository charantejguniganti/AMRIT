# Docker Security Auditor

## Overview
This skill audits container structures (Dockerfiles, Docker Compose specifications) to identify security anomalies, root escalation opportunities, secrets leakage, and obsolete base image references.

## Use Cases
- CI/CD container security compliance audits.
- Local developer sanity checks before docker push.
- Hardening assessments of legacy setups.

## Inputs
- `file_path`: Path to a `Dockerfile` or `docker-compose.yml` configuration (filesystem MCP required).

## Outputs
- Markdown audit report listing identified configuration problems, risk levels, and suggested remediations.

## Examples
Auditing:
```dockerfile
FROM alpine
CMD ["sh"]
```
Outputs warning about the missing `USER` configuration and latest/unpinned image tags.

## Limitations
- Only processes Dockerfile and Compose specifications.
- Static file analysis; doesn't audit active runtime container networks.

## Troubleshooting
- **Error: Unsupported file format**: Ensure your file is named `Dockerfile`, `docker-compose.yml`, or `docker-compose.yaml`.
- **Permission errors**: Check user access permissions on the file.
