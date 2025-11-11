# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Terraso Mobile Client, a React Native app built with Expo for soil analysis and mapping. The app is called "LandPKS Soil ID" and helps users analyze soil color, create sites, and track agricultural data.

## Development Commands

All commands should be run from the `dev-client` directory:

```bash
cd dev-client
```

### Essential Commands
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator
- `npm run prebuild` - Generate native files (run before first build)
- `npm run start` - Start Metro bundler

### Testing
- `npm run test` - Run all tests (unit + integration)
- `npm run test:unit` - Run unit tests only (fast, in src/)
- `npm run test:integration` - Run integration tests only (slow, in __tests__/)
- `npm run update-tests` - Update snapshot tests

### Code Quality
- `npm run lint` - Run ESLint + Prettier checks
- `npm run format` - Auto-fix ESLint + format with Prettier
- `npm run check-ts` - TypeScript type checking
- `npm run check-modules` - Check for unused dependencies

### From Root Directory
- `make lint` - Full lint check (includes TypeScript and modules)
- `make setup-git-hooks` - Install commit hooks

## Architecture

### State Management
- Redux Toolkit with custom middleware architecture
- Store located in `src/store/`
- Global reducers for cross-cutting concerns: `soilIdGlobalReducer`, `siteGlobalReducer`, `projectGlobalReducer`
- Custom persistence middleware for offline support

### Key Directories
- `src/components/` - Reusable UI components
- `src/screens/` - Screen-level components
- `src/context/` - React Context providers
- `src/hooks/` - Custom React hooks
- `src/navigation/` - React Navigation setup
- `src/model/` - Redux slices and business logic
- `src/services/` - External API integration
- `src/translations/` - i18n files (en.json, es.json, uk.json)

### Testing Structure
- Unit tests: `.test.ts/tsx` files alongside source code
- Integration tests: `__tests__/` directory with full app testing
- Snapshot tests: `__tests__/snapshot/` for UI regression testing
- Test utilities: `jest/` directory (mapped to `@testing` import)

### Key Technologies
- Expo SDK 54 with dev-client
- React Native 0.81.5
- Redux Toolkit + React Redux
- React Navigation v7
- Native Base UI components
- Mapbox for mapping (`@rnmapbox/maps`)
- i18next for internationalization
- Formik + Yup for forms
- PostHog for analytics

### Configuration
- Environment config in `app.config.ts`
- Requires `.env` file with Mapbox and optional PostHog tokens
- Two Jest configs: `jest.unit.config.js` and `jest.integration.config.js`

### Import Aliases
- `terraso-mobile-client/` maps to `src/`
- `@testing/` maps to `jest/` directory
- Use modified full path, not relative paths (example: `terraso-mobile-client/model/sync/records`; not `/Users/myName/Documents/dev/mobile-client/dev-client/src/model/sync/records` or `./records`)

## Development Notes

- Always run `npm run prebuild` before building for iOS/Android
- Use `npm run android -- --variant release` for release builds
- Don't use `a` or `i` subcommands with `npm run start`
- The app uses a shared library: `terraso-client-shared`
- Git hooks enforce code style and commit message structure
- Supports offline functionality with custom persistence layer
- always run "npm run format" before committing.