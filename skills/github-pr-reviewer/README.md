# GitHub Pull Request Reviewer

## Overview
This skill integrates with GitHub to fetch diffs of a target pull request, analyze changes, and leave helpful review comments directly on lines of code.

## Use Cases
- CI/CD quality gate checking.
- First-pass code reviews for open-source contributions.
- Automatic checks for standard formatting/lint constraints.

## Inputs
- `repo_owner`: Owner organization or user name.
- `repo_name`: Name of repository.
- `pr_number`: Numeric index of pull request.

## Outputs
- Review comments published to the GitHub API.

## Examples
Running for `PSMRI/AMRIT` PR `123` post-comments directly to the PR thread.

## Limitations
- Requires a GitHub access token with permission to write pull request review comments.
- Only scans text diff hunks under 1MB.

## Troubleshooting
- **Error: Bad credentials**: Ensure the configured GitHub token has the required repository permissions.
- **Rate limit exceeded**: Reduce request frequency or use a token with higher limits.
