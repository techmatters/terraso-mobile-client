# Contributing Guidelines

## General Guidance

- Knowledge about the project is stored in CONTRIBUTING.md files. These can be at the repository root or in subdirectories for knowledge that is only relevant to that folder. When editing files in a subdirectory, you should read that subdirectory's CONTRIBUTING.md as well as any in parent directories.
- If there's anything in the project that is hard to find, update or create a CONTRIBUTING.md file with instructions for how to find it.
- If there are any scripts or tasks that you have trouble finding the right invocation for, update or create a CONTRIBUTING.md with instructions for how to do that task.
- If there's anything in the project which is hard to understand, update or create comments in the file or a CONTRIBUTING.md file for higher-level architectural concerns.
- When making any changes to the project, update the documentation to reflect what you've done.

## Development Commands

### Setup and Installation

All development happens in the `dev-client/` directory. Before starting:

```bash
cd dev-client
npm install
```

Required environment variables in `.env` (copy from `.env.sample`):
- `MAPBOX_DOWNLOADS_TOKEN` - Required for map functionality
- `GOOGLE_OAUTH_APP_CLIENT_ID` - Required for authentication
- `POSTHOG_API_KEY` - Optional, only for debugging analytics

See README.md for full installation instructions including platform-specific dependencies.

### Running the App

Before first run or after dependency changes:
```bash
npm run prebuild
```

Run on Android:
```bash
npm run android                                    # Default device/emulator
npm run android -- --variant release               # Release build
npm run android -- --device "Pixel_6a_API_35"     # Specific device
```

Run on iOS:
```bash
npm run ios                                        # Simulator
npm run ios -- --configuration release             # Release build
npm run ios -- --device "Jane iPhone"              # Specific device
```

Start the development server (runs automatically with above commands):
```bash
npm run start
```

### Testing

```bash
npm test                    # Run all tests (unit + integration)
npm run test:unit          # Run unit tests only (fast, no external dependencies)
npm run test:integration   # Run integration tests only (slower, may use disk/network)
npm run update-tests       # Update snapshot tests (run when snapshots need updating)
npm test -- -u             # Alternative syntax for updating snapshots
```

Tests must pass for PRs to be merged. Tests are automatically run in CI.

### Code Quality

```bash
npm run lint               # Run ESLint + Prettier checks
npm run format             # Auto-fix linting and format code
npm run check-ts           # TypeScript type checking (no emit)
npm run check-modules      # Check for unused dependencies
npm run check-i18n         # Verify translation keys are present
```

Pre-commit hooks automatically run linting and type checking on staged files.

### Localization

```bash
npm run localization-to-po           # Convert JSON translations to .po format
npm run localization-to-json         # Convert .po translations to JSON format
npm run localization-check-missing   # Check for missing translation keys
```

### Maintenance

```bash
make clean             # Full clean: watchman, simulators, node_modules, rebuild
make clean-watchman    # Clear watchman cache (useful for file watching issues)
make clean-simulators  # Erase all iOS simulators
npm run clean-watchman # Clean watchman only (from dev-client/)
```

## Project Architecture

### Overview

This is a **React Native mobile app** built with **Expo** for Android and iOS. It's a soil data collection app (LandPKS Soil ID) that operates with **offline-first architecture** for field use with intermittent connectivity.

### Technology Stack

- **Framework**: React Native 0.76 with Expo 52
- **Language**: TypeScript 5.7
- **State Management**: Redux with custom persistence middleware
- **UI Libraries**:
  - Native Base (restricted usage - see ESLint rules)
  - React Native Paper
  - React Navigation (bottom tabs, native stack, material top tabs)
- **Maps**: Mapbox (@rnmapbox/maps)
- **Storage**: React Native MMKV for local key-value storage
- **Internationalization**: i18next with react-i18next
- **Testing**: Jest with React Testing Library
- **Analytics**: PostHog, Sentry
- **Build**: Expo prebuild generates native iOS/Android projects

### Directory Structure

```
dev-client/
├── src/
│   ├── App.tsx                    # Root application component
│   ├── screens/                   # Screen components (one per route)
│   ├── components/                # Reusable UI components
│   ├── navigation/                # Navigation configuration
│   ├── model/                     # Data models and types
│   │   └── sync/                  # Offline sync revision tracking
│   ├── store/                     # Redux store, actions, reducers
│   ├── services/                  # Business logic services
│   ├── persistence/               # Local storage utilities
│   ├── hooks/                     # Custom React hooks
│   ├── context/                   # React contexts
│   ├── utils/                     # General utilities
│   ├── schemas/                   # Validation schemas (Yup)
│   ├── translations/              # i18n JSON files (en, es, uk)
│   ├── assets/                    # Images, icons, fonts
│   ├── config/                    # App configuration
│   ├── auth/                      # Authentication logic
│   ├── theme.ts                   # Design system theme
│   └── constants.ts               # App-wide constants
├── __tests__/                     # Integration tests
│   └── snapshot/                  # Snapshot tests
├── jest/                          # Test utilities and setup
├── scripts/                       # Build and utility scripts
│   └── localization/              # Translation processing
├── patches/                       # patch-package modifications
├── app.config.ts                  # Expo configuration
├── babel.config.js                # Babel configuration
├── metro.config.js                # Metro bundler configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies and scripts
```

### Key Architectural Patterns

#### Path Aliases
Always use path aliases instead of relative imports:
```typescript
import {Button} from 'terraso-mobile-client/components/Button';
import {useSoilData} from 'terraso-mobile-client/hooks/useSoilData';
// NOT: import {Button} from '../../components/Button';
```

Configured in `tsconfig.json`:
- `terraso-mobile-client/*` → `./src/*`
- `@testing/*` → `./jest/*`

#### Offline-First Architecture
See `dev-client/docs/Offline.md` for comprehensive documentation. Key concepts:

1. **Connectivity Detection**: `@react-native-community/netinfo` with React context
2. **Local Persistence**: Custom Redux middleware syncs state to MMKV storage
3. **Client-Side Business Logic**: TypeScript reimplementations of server operations
4. **Revision Tracking**: Monotonically-increasing revision IDs per entity track changes
5. **Push/Pull System**:
   - `PushDispatcher` sends local changes to server when online
   - `PullDispatcher` fetches server changes periodically
6. **Sync Records**: Track which entities need syncing, handle conflicts

#### State Management
- Redux store with custom persistence middleware
- State is automatically persisted to device storage on changes
- Loaded back into Redux on app start
- Transient data excluded from persistence

#### Testing Strategy
- **Unit tests**: Live alongside source files with `.test.ts(x)` suffix in `src/`
- **Integration tests**: Separate in `__tests__/` directory
- **Snapshot tests**: Subset of integration tests in `__tests__/snapshot/`
- Test utilities in `jest/` mapped to `@testing` import path

## Project Conventions

### Code Style

#### ESLint Rules
- React imports not required (new JSX transform)
- No `react-in-jsx-scope` needed
- Enforce curly brace presence in JSX: `<Component prop={value}>`
- No unstable nested components (except as props)
- **Restricted imports from Native Base**: Cannot import `Box`, `Column`, `Row`, `View`, `Badge`, `Text`, `Heading` (use alternatives)
- **No relative imports**: Use path aliases instead of `./` or `../`

#### Prettier Configuration
- Single quotes
- Semicolons required
- Arrow parens: avoid when possible
- Trailing commas: all
- Bracket same line: true
- Bracket spacing: false
- Import ordering enforced (see `.prettierrc` for order)

#### Import Order
1. React core
2. React-related packages
3. Expo packages
4. Third-party modules
5. terraso-client-shared
6. terraso-mobile-client (general)
7. terraso-mobile-client config/assets/theme

### TypeScript
- Strict mode enabled via `@react-native/typescript-config`
- All source must type-check (`npm run check-ts`)
- Path mappings in `tsconfig.json`

### Git Workflow

#### Commits
- **Conventional Commits** enforced via commitlint
- Format: `type(scope): message`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
- Husky pre-commit hooks run lint-staged checks

#### Pre-commit Hooks
Automatically run on staged files:
- ESLint on `.ts`, `.tsx` files
- TypeScript type checking
- Prettier formatting check on `.json`, `.ts`, `.tsx`, `.html`

### File Conventions

#### Copyright Headers
All source files should include AGPL-3.0 copyright header:
```typescript
/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * ...
 */
```

#### Test Files
- Unit tests: `*.test.ts` or `*.test.tsx` alongside source
- Integration tests: Any file in `__tests__/` directory
- Snapshot tests: Subdirectory `__tests__/snapshot/`

### Dependencies
- Node.js >= 18 required
- Dependencies managed with npm (not yarn or pnpm)
- Lock file: `package-lock.json`
- Patches applied with `patch-package` in `patches/`
- Unused dependencies checked with `depcheck` (`.depcheckrc` for config)

### Build Configuration
- Java 17 required (compatible with Gradle 8.3)
- Android: compileSdk 35, targetSdk 35, buildTools 35.0.0
- iOS: Minimum system version 12.0
- Expo autolinking excludes: `expo-application`, `expo-keep-awake`

### Environment Setup
All environment configuration in `.env` file (never committed):
- Development: Use `.env.sample` as template
- CI/CD: Injected via GitHub Actions
- Validated at build time in `app.config.ts`
- Access via Expo Constants in code

### Shared Code
- `terraso-client-shared` is a Git dependency (not npm)
- Pinned to specific commit hash in `package.json`
- Contains utilities shared between web and mobile clients

### Special Notes for AI Agents

- When making changes to offline sync, consult `dev-client/docs/Offline.md`
- Import order is enforced by Prettier - let it auto-fix
- Use `npm run format` before committing
- Snapshot tests fail often during UI changes - use `npm run update-tests` to update them
- Path aliases are mandatory - never use relative imports
- The app runs in `dev-client/` directory, not repository root
- All npm commands should be run from `dev-client/` directory
- Makefile commands should be run from repository root
