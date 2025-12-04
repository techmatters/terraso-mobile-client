Keyboard Avoiding - What I learned 11/3/2025

The basic problem is pretty simple -- when the keyboard comes up from the bottom, it can cover part of the screen, including parts where you might be entering text. Below is a very simple case:

```none
+----------------------------------+  ← y = 0
| View (800 px total height)       |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                       |----------|  ← y = 500 (top of keyboard)
|                       | Keyboard |
|<covered by keyboard!> | (300 px) |
|                       | covers   |
|                       | 300 px   |
+----------------------------------+  ← y = 800 (bottom)
             ↑
  Bottom 300 px of view
  fully hidden by keyboard

```

In order to avoid it, we must move the content below the keyboard up and likely shrink it. This is handled differently in Android and iOS.

**Android**

This is handled mostly automatically, without KeyboardAvoidingView. KeyboardAvoidingView may be included, but should then set enabled=false so it doesn't actually do anything.

AndroidManifest.xml has android:windowSoftInputMode="adjustResize" which makes android adjust activity window size when keyboard appears. But it still needs some manual work; for our case the following was needed:

    ScreenFormWrapper gets style={transform: [{translateY: -keyboardHeight}]}
    ScrollView adds bottom padding equal to keyboard height

I didn't spend too much time exactly why this was needed, but it appears to work fine.

**iOS**

Here we use KeyboardAvoidingView, with behavior='padding' (there are other behaviors, but most of the documentation suggests using 'padding' with iOS, so that's what I did).

This adds padding at the bottom of the view, which pushes the children of the view up, so it won't be covered by the keyboard.

But how much does it move up? The documentation says little and articles and AI say all sorts of things, so ultimately I looked at the source (which was kind of confusing for a while). See here: [KeyboardAvoidingView.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js)

Padding = keyboard.screenY - keyboardVerticalOffset

```javascript
// top_of_keyboard (sort of)
keyboardY = keyboard.screenY - keyboardVerticalOffset; // 500-0 == 500

// bottom_of_frame - top_of_keyboard
padding = frame.y + frame.height - keyboardY; // 0+800-500 == 300
```

```none
+----------------------------------+  ← y = 0
| View (800 px total height)       |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|----------------------------------|  ← y = 500 (keyboardY, top of keyboard)
| Padding (300 px)      | Keyboard |
|  ← extra bottom pad   | (300 px) |
|  added by KAV         | covers   |
|                       | screen   |
+----------------------------------+  ← y = 800 (bottom)
```

Great, but now let's say you have a header as shown below.
Unfortunately, frame.y is relative to its parent, so it is 0,
but frame.height is now 700,
which means we only get padding = 200, which means part of the content is covered by the keyboard as shown below:

```none
+----------------------------------+
| Header (100 px)                  |  ← y = 0
|----------------------------------|
| View (700 px total height)       |
|   (content area + 200 px pad)    |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                       |----------|  ← y = 500 (keyboard top)
| <covered by keyboard!>| Keyboard |
|-----------------------| (300 px) |
|                       | covers   |
|                       | extra    |  ← padding starts too low
| Padding (200 px)      | 100 px   |
|  (too short)          | region   |
+----------------------------------+  ← y = 800 (bottom)
             ↑
     100 px of view still
     hidden behind keyboard
```

Fortunately, there is a solution: pass in keyboardVerticalOffset equal to the size of the header, i.e. the screen coordinates of the base of the view. This was very confusing and the documentation really didn't help.

Initially I concluded keyboardVerticalOffset was the size of buttons or other area at the bottom of the view, which was supported by the KeyboardAvoidingView source which computes:

```javascript
keyboardY = keyboard.screenY - keyboardVerticalOffset;
```

Plus, in our example, using the size of the buttons looked good because the Delete and Done buttons were close to the size of the fixed content at the top. It was only after being unhappy with inconsistencies and adding debug preview stuff that I finally figured it out.

The tricky thing then was to figure out how to compute the keyboardVerticalOffset or size of all the fixed header stuff above the view. It might be possible to just get the sizes of everything above, but that seems harder to maintain.

The code that computes the View's y-position is in ScreenFormWrapper.tsx near line 270 (look for containerRef.current.measure). Getting this to work correctly was a bit of a struggle, but ultimately not too complicated.

I believe KeyboardAvoidingView should do this itself, but maybe early versions of react-native didn't provide a reasonable mechanism for doing so.

```javascript
// top_of_keyboard (sort of; not really)
keyboardY = keyboard.screenY - keyboardVerticalOffset; // 500-100 == 400

// bottom_of_frame - top_of_keyboard
padding = frame.y + frame.height - keyboardY; // 0+700-400 == 300
```

I would have preferred something like this:

```javascript
padding = keyboardVerticalOffset + frame.y + frame.height - keyboardY;
```

```none
+----------------------------------+  ← y = 0
| Header (100 px)                  |
|----------------------------------|
| View (700 px total height)       |
|   (content area + 300 px pad)    |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|----------------------------------|  ← y = 500
| Padding (300 px)      | Keyboard |
|  ← extra bottom pad   | (300 px) |
|  added by KAV         | covers   |
|                       | screen   |
+----------------------------------+  ← y = 800 (bottom)
```

**Debug Tools**

I added some stuff here to make diagnosing and testing easier. I prefer leaving this stuff as part of the project, but we should discuss.

(1) If you add

    DEBUG_ENABLED="true"

to your .env file, then you will get extra debug on-screen and in the console.log. If you don't want to rebuild, simply edit src/config/index.ts and change the last false to true in the debugEnabled expression near the bottom.

Visually, here are the highlights (blue) for the part of KeyboardAvoidingView above the padding, red/yellow for the button box near the bottom, and green for the iOS bottom safe area.

<img src="iPhone%20No%20Keyboard.png"
     alt="image"
     style="width: 40%; max-width: 300px; border: 1px solid #ccc;">

<img src="iPhone%20Keyboard.png"
     alt="image"
     style="width: 40%; max-width: 300px; border: 1px solid #ccc;">

**Hierarchy Tools**

There is some HTML to visualize the component hierarchy for the note editing screens. CAUTION: these screens are a combination of AI generation and hand-editing and are not guaranteed to be correct.

- [AddSiteNoteScreen](https://htmlpreview.github.io/?https://github.com/techmatters/terraso-mobile-client/blob/main/docs/AddSiteNoteScreen.html)
- [EditSiteNoteScreen](https://htmlpreview.github.io/?https://github.com/techmatters/terraso-mobile-client/blob/main/docs/EditSiteNoteScreen.html)
- [EditPinnedNoteScreen](https://htmlpreview.github.io/?https://github.com/techmatters/terraso-mobile-client/blob/main/docs/EditPinnedNoteScreen.html)

Note: the above links point to github, if you want to see preview locally please just open the files directly using browser.

**Things to look at moving forward**

The iOS implementation uses padding (the green area) for the iOS safe area, but for Android, still just adds padding into the button bar because I didn't want to change it right now. Longer-term it may be possible to have Android use the same padding area instead of extending the size of the button bar.

Also note that the size of this bar is subtracted from keyboardVerticalOffset because we do want the keyboard to overlap this region.
