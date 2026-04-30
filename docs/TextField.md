# TextField Design Spec

Status: Approved design (revised), not yet implemented.

## Motivation

The codebase currently has multiple overlapping text-input components:

- `src/components/inputs/TextInput.tsx` — wraps `react-native-paper`'s TextInput; controlled or uncontrolled; no Formik integration. ~5 call sites.
- `src/components/form/FormInput.tsx` — wraps `TextInput` plus `FormFieldWrapper` plus Formik via `useFieldContext`. ~15 call sites across 6 files.
- `src/screens/AddUserToProjectScreen/components/FreeformTextInput.tsx` — standalone with async `validationFunc`. **0 call sites — dead code.**
- Bare `react-native` `TextInput` — used in places like [ListFilter.tsx](../dev-client/src/components/ListFilter.tsx).

This means engineers face a "which input component do I import?" decision every time, and behavior diverges (label rendering, error display, validation timing) between components. We are also moving away from NativeBase, which complicates `FormInput`'s use of `FormControl`.

## Goals

- Two components, each with one responsibility:
  - **`TextField`** — pure, controlled text input. Renders label, helper text, error, counter. No knowledge of Formik.
  - **`FormTextField`** — thin wrapper around `TextField` that wires up Formik state.
- Built on `react-native-paper`. No NativeBase dependency.
- Consistent label, helper text, error, and counter rendering across the app.
- Migration is gradual; no behavioral surprises for existing screens.

### Why two components instead of one dual-mode component

A single `TextField` that auto-detects Formik via context (the original proposal) was prototyped and rejected during review. The dual-mode dispatch:

- Made the component's behavior depend implicitly on the presence of a `name` prop.
- Required `useFormikContext()` to run on every render even in controlled call sites.
- Created a footgun where an `error` prop could silently override Formik's auto-detected error.

Splitting into `TextField` (controlled) and `FormTextField` (Formik wrapper) keeps each component small and readable, with no implicit dispatch and no shared mode state. `FormTextField` is a thin shell that owns the Formik integration; `TextField` doesn't know Formik exists.

## Non-goals (deferred until a real use case exists)

- Variant prop (outlined / filled). Defer; one look only.
- Password visibility toggle, clear button, prefix/suffix slots.
- Multi-error display (showing more than one validation message at once).
- Per-validator error timing (one rule shown immediately, another on blur).
- minLength prop. Length minimums stay in the validation schema.
- Width prop. Caller's parent controls layout.

---

## API

### Shared display / behavior props

These are accepted by both components.

```ts
type TextFieldType = 'text' | 'email' | 'numeric';

type SharedTextFieldProps = {
  // Identification / accessibility
  label?: string;                       // floating label; placeholder shown if absent
  placeholder?: string;
  testID?: string;                      // forwarded to underlying RN TextInput
  accessibilityLabel?: string;          // defaults to `label`

  // Behavior
  type?: TextFieldType;                 // default 'text'
  multiline?: boolean;
  numberOfLines?: number;               // only meaningful with multiline
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;                   // renders asterisk after label

  // Display
  helperText?: string;
  showCounter?: boolean;                // requires maxLength (TS-enforced)
};
```

### `TextField` (controlled)

```ts
type TextFieldProps = SharedTextFieldProps & {
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  error?: string;                       // caller-controlled; renders red text below
};
```

A pure controlled component. No Formik, no context. The caller passes `value`, `onChangeText`, and (when invalid) `error`. Used directly for non-Formik inputs (e.g., search bars, settings screens with their own state).

### `FormTextField` (Formik wrapper)

```ts
type FormTextFieldProps<TValues extends Record<string, unknown>> =
  SharedTextFieldProps & {
    name: StringFieldKeys<TValues>;             // statically constrained
    errorVisibility?: 'onTouch' | 'always';     // default 'onTouch'
    onChangeText?: (value: string) => void;     // optional layered side-effect handler
    onBlur?: () => void;                        // optional layered side-effect handler
  };
```

`FormTextField` is **generic in the form's value shape** (`TValues`). The `name` prop is constrained at the type level to keys whose value is a string (after stripping `undefined`/`null`) — pointing it at a number, boolean, or array field is a compile-time error. The caller specifies the generic explicitly:

```tsx
type ProjectFormValues = {name: string; description: string; ownerId: number};

<FormTextField<ProjectFormValues> name="name" />          // OK
<FormTextField<ProjectFormValues> name="description" />   // OK
<FormTextField<ProjectFormValues> name="ownerId" />       // TS error: 'ownerId' not assignable
<FormTextField<ProjectFormValues> name="typo" />          // TS error: 'typo' not assignable
```

For a form that uses many `FormTextField`s, define a typed alias once and reuse it:

```tsx
const FormField = FormTextField<ProjectFormValues>;
<FormField name="name" />
```

`FormTextField` does **not** accept `value` or `error` — both come from Formik. To surface async backend errors, the caller pushes them via Formik's `setFieldError(name, message)` rather than passing an `error` prop.

`onChangeText` and `onBlur` on `FormTextField` are *side-effect handlers*: they run **after** Formik has updated its state. The caller does not need to (and should not) call `setFieldValue` / `setFieldTouched` for the same field — `FormTextField` does that automatically. See "Layered handlers" below.

`FormTextField` throws a clear error if rendered outside a `<Formik>` provider; React contexts can't be enforced at compile time.

### Refs

`TextField` is `forwardRef` to the underlying `react-native` `TextInput`. The full RN TextInput surface (`focus`, `blur`, `clear`, `measure`, …) is available. There is no `useImperativeHandle`. For "focus on mount", use `autoFocus` rather than holding a ref.

`FormTextField` does **not** forward refs. The combination of generics and `forwardRef` forces fragile type casts, and no current call site needs imperative access to a Formik-wired field. If imperative control is genuinely required, drop down to `TextField` and wire the controlled state manually.

### `type` presets

| `type`      | `keyboardType`   | `autoCapitalize` | `autoComplete` |
| ----------- | ---------------- | ---------------- | -------------- |
| `'text'`    | `'default'`      | `'sentences'`    | (unset)        |
| `'email'`   | `'email-address'`| `'none'`         | `'email'`      |
| `'numeric'` | `'numeric'`      | `'none'`         | (unset)        |

`numeric` allows decimals and minus sign. (`number-pad` is integer-only and not exposed.)

---

## Behaviors

### Validation runs continuously, errors display on touch

`FormTextField` reads `errors[name]`, `touched[name]`, and `submitCount` from Formik. By default, an error is **displayed** only when:

```
errors[name] !== undefined  &&  (touched[name] || submitCount > 0)
```

Formik's validation itself runs continuously (so `isValid` stays accurate for submit-button state); only the *display* is gated. Override the gating per-field via `errorVisibility="always"` if a specific field needs immediate feedback.

`TextField` (the controlled component) has no touched-tracking. Whatever string the caller passes as `error` is displayed when set.

### Layered handlers

When a caller passes `onChangeText` or `onBlur` to `FormTextField`, these run **after** Formik's own state update for the field. The pattern:

```
1. user types into input
2. FormTextField's internal handler runs:
     formik.setFieldValue(name, value)         // current field updated
3. caller's onChangeText runs (if provided):
     side effects, e.g., update other Formik fields
```

This is for side effects only. The caller does **not** call `setFieldValue` (or `handleChange`) for the same field — that would double-update.

This is a *behavior change* from the existing `FormInput`, where a caller-supplied `onChangeText` overrode Formik's update entirely (because it was spread after via `{...props}`), forcing the caller to remember to call `handleChange(name)` manually. The migration of [ManualSteepnessOverlaySheet.tsx](../dev-client/src/screens/SlopeScreen/components/ManualSteepnessOverlaySheet.tsx) (the only known site that uses this pattern) needs to *remove* the existing `handleChange('slopeSteepnessPercent')(text)` call from its `onChangeText` handler.

### Async / backend errors

For errors that come from outside Yup (e.g., the "user already in project" check in [AddTeamMemberForm.tsx](../dev-client/src/screens/AddUserToProjectScreen/components/AddTeamMemberForm.tsx)), the caller pushes the message into Formik via `setFieldError(name, message)`. It then flows through the same display channel as Yup errors, clears on next edit, and obeys the same `errorVisibility` rules.

### One error message at a time

If multiple validation rules fail simultaneously, Yup picks one (typically the first). The components display whatever string is supplied — they do not stack errors.

### Required indicator

`required` prop renders an asterisk after the label text. The asterisk rides along with the floating label: it appears in the upper-left when the field has input, or in place of the placeholder when empty.

For accessibility, the visual asterisk does not translate to a screen reader, so when `required` is true the component augments the `accessibilityLabel` to read `"<label>, required"` (e.g., `"Email, required"`). Callers who pass an explicit `accessibilityLabel` are responsible for its content.

Decoupled from the validation schema. Yup `.required()` is independent. The prop is purely a visual / a11y indication; the schema enforces validation.

### Helper text and counter

- **Helper text** appears below the input, left-aligned with the input text. Same color as today's helper text (`theme.colors.text.primary`).
- **Counter** appears below the input, also left-aligned with the input text. Format: `current / max` (e.g., `120 / 500`). Shown only when `showCounter` is true; requires `maxLength` (enforced at the type level).
- **Error** replaces helper text when displayed. Red, matching today's error styling. Error and helper text never appear simultaneously.
- If both helper text and counter are shown (no error), they share the row: helper text on the line, counter on the next line — both left-aligned.

### Multiline

`multiline` is a prop on the same component (no separate `<TextArea>`). With `multiline`, min height is 100px. `numberOfLines` controls the rendered height for the populated state.

### Disabled state

Lighter background and lighter underline (Material Design pattern). Concretely:

- Background: lightened from `theme.colors.input.filled.enabledFill` (currently `#EFEFEF`) — likely `#F5F5F5` or 50% opacity overlay. Final value to be confirmed during implementation against the rest of the design system.
- Underline: 50% opacity of normal underline color.
- Text: keeps current text color but with reduced opacity (e.g., 0.6).

### Visual variant

One look only: `react-native-paper`'s `flat` mode + custom light gray background + gray underline. No `variant` prop. If a future screen needs an outlined treatment, add the prop then.

Default width: 100%. Caller's parent (HStack, VStack, View) controls layout.

---

## Implementation notes

### Pure helpers

Logic that doesn't require rendering lives in `TextField.helpers.ts` and is unit-tested in isolation:

- `shouldShowError(error, touched, submitCount, visibility) -> boolean` — the touch-gating rule above.
- `TYPE_PRESETS` — table for keyboard / autoCapitalize / autoComplete.
- `TextFieldType`, `ErrorVisibility` — shared types.

The `required`-asterisk and counter formatting are inlined in `TextField` itself (one-line each; not worth separate helpers).

### Memoization

`React.memo` is **not** used on either component. `FormTextField` subscribes to Formik context, so it re-renders on any form-level state change regardless of memo. `TextField` receives newly-created handler closures from `FormTextField` each render, which would invalidate memo's shallow check anyway. The runtime cost of re-render is negligible for a single text input; adding memo would be theatre.

### Limitations

- `name` is constrained to top-level string keys of `TValues`. Nested Formik paths (e.g., `"user.email"`, `"addresses[0].street"`) are not currently supported by the type constraint. If a form needs nested fields, either flatten the value shape or extend `StringFieldKeys` to a path-aware variant when the need arises.

---

## Migration plan

1. **Build `TextField`** at `src/components/inputs/TextField.tsx` and **`FormTextField`** at `src/components/form/FormTextField.tsx`. Old `TextInput` and `FormInput` continue to work unchanged.
2. **Migrate call sites one PR at a time**:
   - Map `<FormInput name="x" textInputLabel="Y" helpText="Z" maxLength={N}>` → `<FormTextField name="x" label="Y" helperText="Z" maxLength={N}>`.
   - Map `<TextInput value={v} onChangeText={s} label="L">` → `<TextField value={v} onChangeText={s} label="L">`.
   - Map `<FormField name="x"><FormInput …/></FormField>` (one site: [CreateSiteForm.tsx](../dev-client/src/screens/CreateSiteScreen/components/CreateSiteForm.tsx)) → `<FormTextField name="x" …/>`.
   - Drop the `id="project-form-name"` artifact in [ProjectForm.tsx:144](../dev-client/src/screens/CreateProjectScreen/components/ProjectForm.tsx#L144). Confirmed unreferenced anywhere.
   - Convert AddTeamMember-style async errors to use `setFieldError`.
   - In [ManualSteepnessOverlaySheet.tsx](../dev-client/src/screens/SlopeScreen/components/ManualSteepnessOverlaySheet.tsx), remove the redundant `handleChange('slopeSteepnessPercent')(text)` call from the layered `onChangeText` handler — `FormTextField` updates the field automatically. The cross-field `handleChange('slopeSteepnessDegree')(...)` calls remain.
3. **Refactor SiteNoteForm**: replace its `formInputRef.current.focus()` with `<FormTextField autoFocus />` ([SiteNoteForm.tsx:33-37](../dev-client/src/screens/SiteNotesScreen/components/SiteNoteForm.tsx#L33)).
4. **Delete `FreeformTextInput.tsx`** as part of the same rollout (zero call sites; already dead).
5. **When old `TextInput.tsx` and `FormInput.tsx` have no remaining consumers**, delete them.
6. `FormField`, `FormFieldWrapper`, and `useFieldContext` **stay** — they remain in use for `FormSwitch`, `FormRadio`, `FormCheckbox`. Out of scope.

Snapshot tests under `__tests__/snapshot/` will diff during migration. Each migration PR regenerates the affected snapshots.

---

## Open implementation notes

- Disabled state exact background hex and opacity values: confirm with designer during implementation.
- Whether any specific field needs `errorVisibility="always"`: ask designer once the new behavior is in front of them. Default `'onTouch'` is a behavior change from today (errors currently appear on first keystroke).
- Counter color near the limit (e.g., turn red within 10% of max): not specified; defer until designer asks for it.
