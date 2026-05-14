# TextField & FormTextField

Status: Implemented. Old `TextInput` / `FormInput` deprecated; deletion pending the last call-site migrations.

## Motivation

The codebase previously used `TextInput` and `FormInput`, which are now deprecated. Behavior diverged between them (label rendering, error display, validation timing), and we are moving away from NativeBase — which complicates `FormInput`'s use of `FormControl`. We now have two new components:

- **`TextField`** — pure, controlled text input. Knows nothing about Formik.
- **`FormTextField`** — thin wrapper that wires `TextField` to Formik state.

Source files own the API contract. See [TextField.tsx](../dev-client/src/components/inputs/TextField.tsx) and [FormTextField.tsx](../dev-client/src/components/form/FormTextField.tsx) for current props.

Side note: As of this writing, we still use bare `react-native` `TextInput` in a few places.

## Why two components, not one auto-detecting component

A single `TextField` that detects Formik via context (the original proposal) was prototyped and rejected during review. The dual-mode dispatch:

- Made behavior depend implicitly on the presence of a `name` prop.
- Forced `useFormikContext()` to run on every render even in controlled call sites.
- Created a footgun where an `error` prop could silently override Formik's auto-detected error.

Splitting keeps each component small and readable, with no implicit dispatch and no shared mode state. `FormTextField` is a thin shell that owns the Formik integration; `TextField` doesn't know Formik exists.

## Non-goals (deferred until a real use case exists)

- Variant prop (outlined / filled). One look only.
- Password visibility toggle, clear button, prefix/suffix slots.
- Multi-error display (showing more than one validation message at once).
- Per-validator error timing (one rule shown immediately, another on blur).
- `minLength` prop. Length minimums stay in the validation schema.
- Width prop. Caller's parent controls layout.

## Notable design decisions

- **Pure helpers, unit-tested in isolation.** Display-gating logic (`shouldShowError`) and the keyboard/capitalization/autoComplete `TYPE_PRESETS` table live in [TextFieldHelpers.ts](../dev-client/src/components/inputs/TextFieldHelpers.ts) with their own tests. This keeps the rules debuggable without rendering.
- **No memoization.** `FormTextField` subscribes to Formik context, so it re-renders on any form state change regardless of `React.memo`. `TextField` receives newly-created handler closures from its parent each render. Adding `memo` would be theatre.
- **No refs on `FormTextField`.** The generic-plus-`forwardRef` combination requires fragile type casts, and no current call site needs imperative access to a Formik-wired field. For imperative control, use `TextField` directly. `TextField` itself forwards refs to the underlying RN `TextInput`.
- **`name` is statically constrained to string-valued Formik fields.** `FormTextField<TValues>` rejects field names whose type isn't assignable to string. For multi-field forms, declare a typed alias once: `const FormField = FormTextField<MyFormValues>`. Nested paths (`"user.email"`, `"addresses[0].street"`) are not supported by the constraint — flatten the value shape or extend `StringFieldKeys` when needed.
- **Async / backend errors flow through Formik.** Push them in via `formik.setFieldError(name, message)` so they share the display channel with Yup errors (touch-gating, clearing on edit, etc.). Don't keep a separate error state in component-local variables.
