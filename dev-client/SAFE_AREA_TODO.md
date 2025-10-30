# Screens Needing Safe Area Bottom Padding

This document tracks screens that need to be updated to use SafeScrollView or SafeBottomPaddingView for proper handling of Android soft navigation buttons.

## Status Legend
- ✅ Fixed
- 🔴 High Priority - Has buttons/forms at bottom
- 🟡 Medium Priority - Should be reviewed
- ⚪ Low Priority - Informational screens

---

## Already Fixed ✅

1. **LocationDashboardContent.tsx** - Uses SafeScrollView
2. **ColorCropScreen.tsx** - Uses SafeScrollView with 100px minimum padding
3. **ColorAnalysisHomeScreen.tsx** - Uses SafeScrollView with 100px minimum padding
4. **StandaloneOverlaySheet.tsx** - Uses bottomInset prop
5. **SoilScreen.tsx** - Uses SafeScrollView

---

## HIGH PRIORITY 🔴 - Forms with Bottom Buttons

These have interactive elements at the bottom that are likely cut off:

### 1. CreateSiteForm.tsx
- **Path:** `src/screens/CreateSiteScreen/components/CreateSiteForm.tsx`
- **Issue:** ScrollView with ContainedButton at end (line 149-156)
- **Structure:** KeyboardAvoidingView > ScrollView > Column > View with Button
- **Fix:** Replace ScrollView with SafeScrollView

### 2. CreateProjectForm.tsx
- **Path:** `src/screens/CreateProjectScreen/components/CreateProjectForm.tsx`
- **Issue:** ScrollView with ContainedButton at end (line 115-122)
- **Structure:** KeyboardAvoidingView > ScrollView > Box > View with Button
- **Fix:** Replace ScrollView with SafeScrollView

### 3. ProjectSettingsScreen.tsx
- **Path:** `src/screens/ProjectSettingsScreen/ProjectSettingsScreen.tsx`
- **Issue:** ScrollView with delete button at bottom (line 71-99)
- **Structure:** ScrollView > Column > ProjectForm > DeleteButton
- **Fix:** Replace ScrollView with SafeScrollView

### 4. ProjectInputScreen.tsx
- **Path:** `src/screens/ProjectInputScreen/ProjectInputScreen.tsx`
- **Issue:** ScrollView with accordions and buttons (line 79-135)
- **Structure:** Column > ScrollView > Box > Accordion > ContainedButton
- **Fix:** Replace ScrollView with SafeScrollView

### 5. SiteTransferProjectScreen.tsx
- **Path:** `src/screens/SiteTransferProjectScreen/SiteTransferProjectScreen.tsx`
- **Issue:** ScrollView with FAB button and forms (line 59+)
- **Structure:** ScreenScaffold > ScrollView > forms
- **Fix:** Replace ScrollView with SafeScrollView

---

## MEDIUM PRIORITY 🟡 - Guide/Educational Screens

### 6. ColorGuideScreen.tsx
- **Path:** `src/screens/SoilScreen/ColorScreen/ColorGuideScreen.tsx`
- **Issue:** React Native ScrollView (not native-base) with ContainedButton at bottom
- **Structure:** ScreenScaffold > ScrollView > ContainedButton
- **Fix:** Import SafeScrollView, convert from React Native to native-base ScrollView

### 7. TextureGuideScreen.tsx
- **Path:** `src/screens/SoilScreen/TextureGuideScreen.tsx`
- **Issue:** ScrollView with multiple buttons and image content
- **Structure:** ScrollView with multiple ContainedButton elements
- **Fix:** Replace ScrollView with SafeScrollView

### 8. WelcomeScreen.tsx
- **Path:** `src/screens/WelcomeScreen.tsx`
- **Issue:** ScrollView with FAB button (line 49+)
- **Structure:** ScrollView > Fab
- **Fix:** Replace ScrollView with SafeScrollView

---

## MEDIUM PRIORITY 🟡 - Selection Screens

### 9. SlopeSteepnessScreen.tsx
- **Path:** `src/screens/SlopeScreen/SlopeSteepnessScreen.tsx`
- **Issue:** ScrollView with ImageRadio elements and DoneFab (line 22+)
- **Structure:** ScreenScaffold > ScrollView > ImageRadio + DoneFab
- **Fix:** Replace ScrollView with SafeScrollView

### 10. TextureScreen.tsx
- **Path:** `src/screens/SoilScreen/TextureScreen.tsx`
- **Issue:** ScrollView with ImageRadio selection and ContainedButton
- **Structure:** SoilPitInputScreenScaffold > ScrollView
- **Fix:** Replace ScrollView with SafeScrollView

---

## MEDIUM PRIORITY 🟡 - Note/Editing Screens

### 11. AddSiteNoteScreen.tsx
- **Path:** `src/screens/SiteNotesScreen/AddSiteNoteScreen.tsx`
- **Issue:** Uses ScreenFormWrapper with fixed `pb={10}` (line 106)
- **Structure:** ScreenFormWrapper > Column > Box with textarea
- **Fix:** Consider updating ScreenFormWrapper to use SafeBottomPaddingView

### 12. EditPinnedNoteScreen.tsx
- **Path:** `src/screens/EditPinnedNoteScreen.tsx`
- **Issue:** Uses ScreenFormWrapper with fixed padding (line 107)
- **Structure:** ScreenFormWrapper > Column with textarea
- **Fix:** Same as AddSiteNoteScreen

### 13. EditSiteNoteContent.tsx
- **Path:** `src/screens/SiteNotesScreen/components/EditSiteNoteContent.tsx`
- **Issue:** Part of editing flow, uses ScreenFormWrapper
- **Structure:** ScreenFormWrapper wrapper
- **Fix:** Same as AddSiteNoteScreen

---

## MEDIUM PRIORITY 🟡 - Team Management Screens

### 14. AddTeamMemberForm.tsx
- **Path:** `src/screens/AddUserToProjectScreen/components/AddTeamMemberForm.tsx`
- **Issue:** Form with email input and ContainedButton for "Next"
- **Structure:** Formik > View with button
- **Fix:** Wrap content in SafeBottomPaddingView

### 15. ManageTeamMemberScreen.tsx
- **Path:** `src/screens/ManageTeamMemberScreen.tsx`
- **Issue:** ScreenScaffold with buttons at bottom (line 100+)
- **Structure:** ScreenScaffold > Column > buttons
- **Fix:** Wrap Column content in SafeBottomPaddingView

### 16. SiteSettingsScreen.tsx
- **Path:** `src/screens/SiteSettingsScreen/SiteSettingsScreen.tsx`
- **Issue:** DeleteButton at bottom (line 135-151)
- **Structure:** ScreenScaffold > Column > TextInput > View with buttons
- **Fix:** Wrap content in SafeBottomPaddingView

### 17. DeleteAccountScreen.tsx
- **Path:** `src/screens/DeleteAccountScreen/DeleteAccountScreen.tsx`
- **Issue:** ScrollView with DeleteAccountConfirmForm containing buttons
- **Structure:** ScreenScaffold > ScrollView > Column > form
- **Fix:** Replace ScrollView with SafeScrollView

### 18. DeleteAccountConfirmForm.tsx
- **Path:** `src/screens/DeleteAccountScreen/components/DeleteAccountConfirmForm.tsx`
- **Issue:** Row with two DialogButtons at bottom (line 56-68)
- **Structure:** Column > TextInput > Row with buttons
- **Fix:** Parent component should handle (DeleteAccountScreen)

### 19. AddUserToProjectScreen.tsx
- **Path:** `src/screens/AddUserToProjectScreen/AddUserToProjectScreen.tsx`
- **Issue:** ScreenScaffold > ScreenContentSection > AddTeamMemberForm
- **Structure:** ScreenScaffold > content > form
- **Fix:** AddTeamMemberForm should handle padding

---

## MEDIUM PRIORITY 🟡 - Data Input Screens

### 20. AddDepthOverlaySheet.tsx
- **Path:** `src/screens/SoilScreen/components/AddDepthOverlaySheet.tsx`
- **Issue:** InfoSheet (gorhom bottom sheet) with form controls and buttons
- **Structure:** InfoSheet > Formik > Row with buttons
- **Fix:** Verify bottomInset is set properly (should be via @gorhom/bottom-sheet)

### 21. SoilPitSettings.tsx
- **Path:** `src/screens/ProjectInputScreen/SoilPitSettings.tsx`
- **Issue:** Contains forms with submit buttons
- **Structure:** Nested inside scrollable ProjectInputScreen
- **Fix:** Parent ProjectInputScreen should handle scrolling

---

## LOW PRIORITY ⚪ - Informational/List Screens

### 22. ProjectListScreen.tsx
- **Path:** `src/screens/ProjectListScreen/ProjectListScreen.tsx`
- **Issue:** Column with AddButton
- **Structure:** ScreenScaffold > Column > AddButton
- **Fix:** May not need fix if ScreenScaffold handles it properly

---

## Key Insights

1. **ScreenScaffold does NOT add bottom padding** - Uses `edges={['top', 'left', 'right']}` only
2. **ScreenFormWrapper uses fixed `pb={10}`** - May not be sufficient for all devices
3. **Many forms use KeyboardAvoidingView + ScrollView** without safe area padding
4. **Screens with buttons at bottom are highest priority** for fixes

---

## Recommended Fix Priority

1. **First:** Form screens with submit/action buttons (items 1-5)
2. **Second:** Guide screens with navigation buttons (items 6-8)
3. **Third:** Selection screens (items 9-10)
4. **Fourth:** Note/team management screens (items 11-19)
5. **Fifth:** Informational screens (item 22)

---

Generated: 2025-10-29
