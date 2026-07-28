# Electron proof of concept

This is a development-only shell for evaluating the existing journal inside a
macOS Electron window. It is deliberately not a production desktop build.

## Run

Use Node 22.13 or newer, then:

```bash
npm run desktop:dev
```

Electron starts the existing Next.js development server on
`http://127.0.0.1:4317`, waits for it to become available, and opens it in a
sandboxed desktop window. Quitting the app stops the server.

## Intentionally deferred

- packaged `.app` or DMG output
- a separate desktop data directory
- signing, notarization, and automatic updates
- native menus, shortcuts, file handling, Keychain, and notifications
- production server bundling and startup recovery
