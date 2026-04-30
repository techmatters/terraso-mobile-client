# TextField Design Spec

Status: Approved design, not yet implemented.

## Motivation

The codebase currently has multiple overlapping text-input components:

- `src/components/inputs/TextInput.tsx` — wraps `react-native-paper`'s TextInput; controlled or uncontrolled; no Formik integration. ~5 call sites.
- `src/components/form/FormInput.tsx` — wraps `TextInput` plus `FormFieldWrapper` plus Formik via `useFieldContext`. ~15 call sites across 6 files.
- `src/screens/AddUserToProjectScreen/components/FreeformTextInput.tsx` — standalone with async `validationFunc`. **0 call sites — dead code.**
- Bare `react-native` `TextInput` — used in places like [ListFilter.tsx](../dev-client/src/components/ListFilter.tsx).

This means engineers face a "which input component do I import?" decision every time, and behavior diverges (label rendering, error display, validation timing) between components. We are also moving away from NativeBase, which complicates `FormInput`'s use of `FormControl`.

## Goals

- One component, **TextField**, usable in any context (inside Formik, controlled, or bare).
- Built on `react-native-paper` (matches current `TextInput`).
- No NativeBase dependency in TextField itself.
- Consistent label, helper text, error, and counter rendering across the app.
- Migration is gradual; no behavioral surprises for existing screens.

## Non-goals (deferred until a real use case exists)

- Variant prop (outlined / filled). Defer; one look only.
- Password visibility toggle, clear button, prefix/suffix slots.
- Multi-error display (showing more than one validation message at once).
- Per-validator error timing (one rule shown immediately, another on blur).
- minLength prop. Length minimums stay in the validation schema.
- Width prop. Caller's parent controls layout.

---

## API

```ts
type TextFieldType = 'text' | 'email' | 'numeric';

type TextFieldProps = {
  // Identification
  label?: string;                       // floating label; placeholder shown if absent
  placeholder?: string;
  testID?: string;                      // forwarded to underlying RN TextInput
  accessibilityLabel?: string;          // defaults to `label`

  // State (Formik mode)
  name?: string;                        // when set, reads from useFormikContext()

  // State (controlled mode)
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;

  // Behavior
  type?: TextFieldType;                 // default 'text'
  multiline?: boolean;
  numberOfLines?: number;               // only meaningful with multiline
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;                   // renders asterisk after label
  errorVisibility?: 'onTouch' | 'always';  // default 'onTouch'

  // Display
  helperText?: string;
  error?: string;                       // overrides Formik error if both present
  showCounter?: boolean;                // requires maxLength (TS-enforced)
};
```

The component is `forwardRef` to the underlying `react-native` `TextInput`. There is **no** `useImperativeHandle` — callers needing `focus()`, `blur()`, etc., have full access via the forwarded ref. For the common "focus on mount" case, use `autoFocus`.

Wrapped in `React.memo`. All other react-native-paper props pass through (e.g., `keyboardType` if a caller wants to override the `type` preset).

### `type` presets

| `type`      | `keyboardType`   | `autoCapitalize` | `autoComplete` |
| ----------- | ---------------- | ---------------- | -------------- |
| `'text'`    | `'default'`      | `'sentences'`    | (unset)        |
| `'email'`   | `'email-address'`| `'none'`         | `'email'`      |
| `'numeric'` | `'numeric'`      | `'none'`         | (unset)        |

`numeric` allows decimals and minus sign. (`number-pad` is integer-only and not exposed.)

---

## Behaviors

### Formik vs controlled mode

TextField calls `useFormikContext()` internally. Mode is determined by props:

- **`name` set** → Formik mode. TextField reads `values[name]`, `errors[name]`, `touched[name]`, and `submitCount` from context. Calls `setFieldValue(name, …)` on change and `handleBlur(name)` on blur.
- **`name` absent, `value`/`onChangeText` set** → controlled mode.
- **Neither** → bare uncontrolled (rare; works as a styled input).

**Mixing Formik and explicit handlers is allowed.** If `name` is set AND `onChangeText` is also passed, both run: Formik updates first (so `values[name]` is fresh), then the caller's `onChangeText` fires. This preserves the current pattern in [ManualSteepnessOverlaySheet.tsx:154](../dev-client/src/screens/SlopeScreen/components/ManualSteepnessOverlaySheet.tsx#L154) where percent ↔ degree conversion runs alongside Formik state.

If `error` (controlled error) is passed in Formik mode, it overrides Formik's auto-detected error.

### Validation runs continuously, errors display on touch

Formik validation runs on change (Formik default; keeps `isValid` accurate for submit-button state). Errors are **displayed** only when:

```
errors[name] !== undefined  &&  (touched[name] || submitCount > 0)
```

Default behavior. Override via `errorVisibility="always"` for fields that need immediate feedback.

In controlled mode, `error` displays whenever it's a non-empty string. The caller controls when that happens.

For async backend errors in Formik mode (e.g., "user already in project" in [AddTeamMemberForm.tsx](../dev-client/src/screens/AddUserToProjectScreen/components/AddTeamMemberForm.tsx)), recommend using Formik's `setFieldError(name, message)` so the error flows through the same channel and clears on next edit. The `error` prop is available as an escape hatch but `setFieldError` is the canonical pattern.

### One error message at a time

If multiple validation rules fail simultaneously, Yup picks one (typically the first). TextField displays whatever string is supplied — it does not stack errors.

### Required indicator

`required` prop renders an asterisk after the label text. The asterisk rides along with the floating label: it appears in the upper-left when the field has input, or in place of the placeholder when empty. Required fields announce "required" to screen readers via `accessibilityLabel` augmentation.

The prop is decoupled from the validation schema. Yup `.required()` is independent. Caller passes `required` for visual indication; the schema enforces validation.

### Helper text and counter

- **Helper text** appears below the input, left-aligned with the input text. Same color as today's helper text (`theme.colors.text.primary`).
- **Counter** appears below the input, also left-aligned with the input text. Format: `current / max` (e.g., `120 / 500`). Shown only when `showCounter` is true; requires `maxLength` (enforced at the type level).
- **Error** replaces helper text when displayed. Red, matching today's error styling. Error and helper text never appear simultaneously.
- If both helper text and counter are shown (no error), they share the row: helper text on the line, counter on the next line — both left-aligned.

### Multiline

`multiline` is a prop on the same component. With `multiline`, min height is 100px. `numberOfLines` controls the rendered height for the populated state. No separate `<TextArea>` component.

### Disabled state

Lighter background and lighter underline (Material Design pattern). Concretely:

- Background: lightened from `theme.colors.input.filled.enabledFill` (currently `#EFEFEF`) — likely `#F5F5F5` or 50% opacity overlay. Final value to be confirmed during implementation against the rest of the design system.
- Underline: 50% opacity of normal underline color.
- Text: keeps current text color but with reduced opacity (e.g., 0.6).

### Visual variant

One look only: `react-native-paper`'s `flat` mode + custom light gray background + gray underline. No `variant` prop. If a future screen needs an outlined treatment, add the prop then.

Default width: 100%. Caller's parent (HStack, VStack, View) controls layout.

---

## Migration plan

1. **Build TextField** at `src/components/inputs/TextField.tsx`. Old `TextInput` and `FormInput` continue to work unchanged.
2. **Migrate call sites one PR at a time**:
   - Map `<FormInput name="x" textInputLabel="Y" helpText="Z" maxLength={N}>` → `<TextField name="x" label="Y" helperText="Z" maxLength={N}>`.
   - Map `<TextInput value={v} onChangeText={s} label="L">` → `<TextField value={v} onChangeText={s} label="L">`.
   - Map `<FormField name="x"><FormInput …/></FormField>` (one site: [CreateSiteForm.tsx](../dev-client/src/screens/CreateSiteScreen/components/CreateSiteForm.tsx)) → `<TextField name="x" …/>`.
   - Drop the `id="project-form-name"` artifact in [ProjectForm.tsx:144](../dev-client/src/screens/CreateProjectScreen/components/ProjectForm.tsx#L144). Confirmed unreferenced anywhere.
   - Convert AddTeamMember-style async errors to use `setFieldError`.
3. **Refactor SiteNoteForm**: replace its `formInputRef.current.focus()` with `<TextField autoFocus />` ([SiteNoteForm.tsx:33-37](../dev-client/src/screens/SiteNotesScreen/components/SiteNoteForm.tsx#L33)).
4. **Delete `FreeformTextInput.tsx`** as part of the same rollout (zero call sites; already dead).
5. **When old `TextInput.tsx` and `FormInput.tsx` have no remaining consumers**, delete them.
6. `FormField`, `FormFieldWrapper`, and `useFieldContext` **stay** — they remain in use for `FormSwitch`, `FormRadio`, `FormCheckbox`. Out of scope.

Snapshot tests under `__tests__/snapshot/` will diff during migration. Each migration PR regenerates the affected snapshots.

---

## Open implementation notes

- Disabled state exact background hex and opacity values: confirm with designer during implementation.
- Whether any specific field needs `errorVisibility="always"`: ask designer once the new behavior is in front of them. Default `'onTouch'` is a behavior change from today (errors currently appear on first keystroke).
- Counter color near the limit (e.g., turn red within 10% of max): not specified; defer until designer asks for it.
