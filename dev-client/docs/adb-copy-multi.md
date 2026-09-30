# Copying MULTI captures off Android to your Mac

Self-contained instructions for pulling the DNG + JPEG bundles the MULTI
button creates on Android over to a Mac, and deleting them from the phone
once you've confirmed the copy. First-time setup takes ~5 minutes; every
subsequent transfer is one command.

## What you need

- A Mac (Intel or Apple Silicon, both work)
- An Android phone with the app installed and USB debugging enabled
  (steps below if you haven't turned that on)
- A USB-C cable (or USB-C to whatever port your Mac has)

## One-time setup (Mac side)

### 1. Install Homebrew (if you don't have it)

Homebrew is a package manager for macOS. Skip this step if you already
have `brew` in your terminal. Otherwise install it from https://brew.sh
— the site shows a one-line paste-into-terminal command that walks you
through it.

Quick check whether you have it:

```bash
brew --version
```

If that prints a version, you're done with this step.

### 2. Install `adb` (Android Debug Bridge)

Just one command:

```bash
brew install --cask android-platform-tools
```

That drops `adb` into `/opt/homebrew/bin/` (Apple Silicon) or
`/usr/local/bin/` (Intel), which is already on your PATH — nothing
else needed.

Verify:

```bash
adb --version
```

Expected output looks like `Android Debug Bridge version 1.0.41`.

## One-time setup (phone side)

Turn on USB debugging so `adb` can talk to the phone:

1. **Settings → About phone**
2. Find "Build number" and tap it **7 times** in a row. A message will
   pop up saying "You are now a developer."
3. Back out to the main Settings menu. There's a new **Developer
   options** entry (usually under System).
4. Inside Developer options, toggle **USB debugging** on.

That's it — no reboots, no restarts.

## Every capture session

### 1. Plug the phone into the Mac

Use the USB-C cable. The phone screen will pop up a dialog:
**"Allow USB debugging?"** Check "Always allow from this computer" and
tap Allow. This only appears once per Mac.

### 2. Verify the connection

```bash
adb devices
```

Expected output:

```
List of devices attached
1A28ZY0B32000BQ    device
```

The long alphanumeric is your phone's serial. If instead you see
`unauthorized`, you missed the "Allow USB debugging?" dialog — unplug,
plug back in, watch the phone screen.

If you see nothing under "List of devices attached," the cable might be
charge-only (some cheap USB-C cables don't carry data). Try a different
cable.

### 3. Pull all MULTI sessions to your Mac

The MULTI button writes to `/sdcard/Download/soilcap/session_<ts>/` on
the phone. One command grabs the whole tree:

```bash
adb pull /sdcard/Download/soilcap ~/soilcap-`date +%Y-%m-%d`
```

That creates a dated folder on your Mac (e.g.
`~/soilcap-2026-08-24/`) and copies every session dir into it.

**Speed**: on USB 3 with a decent cable, a 5 GB batch (~25 sessions)
transfers in 1–2 minutes. The `adb` client shows a progress bar as it
goes.

**Cost**: zero cellular data. This is all local over the cable.

### 4. Verify the transfer

Quick sanity check that everything came across:

```bash
ls ~/soilcap-`date +%Y-%m-%d`/soilcap/
```

You should see one `session_<yyyyMMdd>T<HHmmss>-<ms>/` directory per
MULTI press. Peek inside one to confirm it has DNG + JPEG files plus
`session.json`:

```bash
ls ~/soilcap-`date +%Y-%m-%d`/soilcap/session_*/ | head -20
```

Each session directory should contain 18 files (9 shots × 2 formats
DNG + JPEG) plus `session.json` and optionally `note.txt`.

### 5. Delete from the phone

Once you're sure the copy is intact, free up phone storage. Two options:

**Fast (command line):**

```bash
adb shell rm -rf /sdcard/Download/soilcap/session_*
```

That removes every session directory but leaves the `soilcap` parent
folder in place, so the next MULTI capture doesn't need to recreate it.

To remove EVERYTHING under `soilcap` (including the folder itself, if
you want a fresh start):

```bash
adb shell rm -rf /sdcard/Download/soilcap
```

**GUI (on the phone):**

Open the **Files** app on the phone → Downloads → soilcap → long-press
a session folder → trash icon. Repeat, or use "select all" first.

### 6. Unplug

That's it. The phone can be unplugged; `adb` doesn't need to be
"stopped" or ejected first.

## Common issues

**`adb: no permissions` or `unauthorized`**
The phone-side "Allow USB debugging" dialog didn't get confirmed. Unplug
the phone, plug it back in, watch the phone screen for the dialog, tap
Allow.

**`adb: device offline`**
The USB connection dropped. Unplug + replug. If it happens repeatedly,
try a different cable — some cables are charge-only.

**No files under `/sdcard/Download/soilcap`**
Either the MULTI button hasn't been pressed yet, or the app can't write
to the Downloads folder (unlikely — no app-side permissions needed for
MediaStore.Downloads on Android 10+). Check the app's capture screen
logs via `adb logcat -s RawCameraAndroid.Session` to see if the session
completed and where files landed.

**`adb pull` complains about "read-only file system" or similar**
Unlikely for `/sdcard/Download` (that's user-writable), but if it
happens: the phone might be in a state where MediaStore is scanning.
Wait 30 seconds, retry.

**Transfer is very slow (< 20 MB/s)**
Cable is likely USB 2, not USB 3. A ~200 MB session takes ~10 seconds
on USB 3, ~40 seconds on USB 2. Not fatal; just annoying for big batches.

## Bulk workflow

If you're doing many MULTI captures across a day:

1. Capture as many sessions as you want (each button press = one
   session dir).
2. Once the phone starts getting full, or at the end of the day, plug in
   and run steps 3 → 5 above.
3. Unplug, resume capturing.

**Storage planning:**
- Each session: ~200 MB on disk.
- Pixel 4 (64 GB, ~10-25 GB usually free): ~50 sessions between pulls.
- Pixel 7 (128 GB, ~30-60 GB usually free): ~150–300 sessions.

## For adventurous users

**Preserve timestamps** in the pulled files (default: mtimes get
rewritten to now):

```bash
adb pull -a /sdcard/Download/soilcap ~/soilcap-`date +%Y-%m-%d`
```

The `-a` flag is "preserve file times." Rarely needed since the session
dir name already carries a timestamp, but useful if you're organizing
manually by mtime later.

**Pull only one session** (by name):

```bash
adb pull /sdcard/Download/soilcap/session_20260821T144215-317 ~/one-session
```

**Wireless `adb` (advanced, requires one-time USB pairing):**

```bash
adb tcpip 5555             # switch adb to network mode (while cable is plugged in)
adb connect <phone-ip>:5555   # once, per phone-IP pair
# now unplug, and pulls work over wifi
```

Speed on wifi is decent for small batches (JPEG only, or 1-2 sessions)
but much slower than USB for full 5 GB pulls.
