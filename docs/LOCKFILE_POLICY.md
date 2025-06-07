# Lockfile Policy for RAoSanta

This project uses a lockfile (`package-lock.json`) to ensure deterministic and secure dependency resolution. Lockfiles are critical for:

- **Supply chain security:** Prevents dependency hijacking and ensures all contributors and CI/CD use the exact same dependency versions.
- **Reproducible builds:** Guarantees that every install produces the same dependency tree.
- **Faster CI/CD:** Dependency resolution is much faster with a lockfile.

## Best Practices

- Always commit `package-lock.json` to version control.
- Update dependencies using `npm install <package>@latest` and commit the updated lockfile.
- Review lockfile changes in pull requests for unexpected dependency updates.

For more details, see: https://www.aikido.dev/blog/why-we-need-lockfiles-to-secure-our-supply-chain
