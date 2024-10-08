# Terraso Mobile Client

This repo contains the source code for Terraso’s mobile client modules.

## Contributing

Before contributing to the project, it's recommended that you set up
your local git running the following command:

```sh
$ make setup-git-hooks
```

This will activate two git hooks to check JavaScript code
style and commit message structure before each commit.

# Installation

## Dependencies

### Mapbox token

Set `MAPBOX_DOWNLOADS_TOKEN` in your `.env` to a valid Mapbox secret key.

### macOS

```sh
$ brew install node watchman ruby openjdk@17
$ sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
$ echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
$ source ~/.zshrc
$ gem install bundler
```

All users:

```sh
$ cd dev-client
```

Install NPM and Ruby packages:

```sh
$ npm install
$ bundle install
$ cd ios
$ bundle exec pod install
```

If you get this error:

```
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```

Then run this:

```sh
$ sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## Development Tools

Install [Xcode](https://apps.apple.com/us/app/xcode/id497799835?mt=12) from the App Store. Install the iOS SDK and Simulator.

Install [Android Studio](https://developer.android.com/studio). Use the setup wizard to install the standard configuration, which will install the SDK.

Configure Android SDK environment variables:

```sh
cat << EOF > $HOME/.zprofile
export JAVA_HOME=`/usr/libexec/java_home`
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools/
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator/
EOF
```

### Linux

```sh
$ sudo apt install node watchman openjdk-17-jdk
```

# Running the app locally

Do **not** use the `a` or `i` subcommands in `npm run start`, they don't work with our workflow.
The below commands implicitly call `npm run start` when they are finished, so you shouldn't ordinarily need to call it manually.

## Android

1. Run `npm run android` to load the app on an emulator or connnected physical device.
2. Run `npm run android -- --variant release` to load a release build of the app onto an emulator or connected physical device.
3. Run `npm run android -- --device "Pixel_6a_API_35"` to load the app on a specific emulator or device. (Use `emulator -list-avds` to get the names of available emulators and devices.)

## iOS

1. Run `npm run ios` to load the app in the simulator.
2. Run `npm run ios -- --configuration release` to load a release build of the app in the simulator.
3. Run `npm run ios -- --device "Jane iPhone"` to load the app on a specific device. (Use `xcrun simctl list devices available` to get a list of available simulators.)

# Releases

## Android

### Initial setup

#### Generate a keystore:

```
keytool -genkey -v -keystore terraso-lpks-key.keystore -alias terraso-lpks -keyalg RSA -keysize 2048 -validity 10000
```

#### Define confguration variables

Add this to `~/.gradle/gradle.properties`. Use the password you created in “generate a keystore.”

```
cat << EOF >> ~/.gradle/gradle.properties
LPKS_UPLOAD_STORE_FILE=terraso-lpks-key.keystore
LPKS_UPLOAD_KEY_ALIAS=terraso-lpks
LPKS_UPLOAD_STORE_PASSWORD=XXXXX
LPKS_UPLOAD_KEY_PASSWORD=XXXXXX
EOF
```

#### Move the keystore in to your development folder

```
mv terraso-lpks-key.keystore mobile-client/dev-client/android/app
```

### Releasing a build

From `mobile-client/dev-client/android`:

Build the app bundle:

```
./gradlew bundleRelease
```

Sign the app bundle:

```
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256  -keystore ~/terraso-lpks-key.keystore -signedjar app/build/outputs/bundle/release/terraso-landpks.aab  app/build/outputs/bundle/release/app-release.aab terraso-lpks
```

# Environment Setup

## Java

Ensure you are using a verison of Java [compatible with gradle](https://docs.gradle.org/current/userguide/compatibility.html). JDK 17 works with Gradle 8.3.

## Logging In

Once all of the dependencies are installed, you'll need to do the following to enable logins:

1. Set up a Google OAuth project for Android or iOS if it doesn't already exist

- See [Google Cloud Console](https://console.cloud.google.com/)

2. Copy `.env.sample` to `.env`. Change `GOOGLE_OAUTH_APP_CLIENT_ID` variable to match the value of your OAuth App client ID in Google Cloud Console.
3. Get an instance of the Terraso backend running locally
4. Set up the instance config to use the OAuth client

- See the `settings.py` value `JWT_EXCHANGE_PROVIDERS`. You will need to set the environment variable `GOOGLE_MOBILE_CLIENT_ID`

5. Set up mobile config to connect to backend

- See [Android emulator networking](https://developer.android.com/studio/run/emulator-networking.html) for details on how to connect to your backend instance

# Testing

We use Jest for testing. Project tests are partitioned into **unit** (fast, no external dependencies), and **integration** (slow, may rely on disk access or network calls etc). You can run unit tests with `npm run test:unit` and integration tests with `npm run test:integration`; run all tests with `npm run test`. Tests are run automatically on GitHub and must pass for a PR to be eligible for merging.

### Configuration

Unit and integration tests have their own Jest configuration files to reflect their needs. Unit tests are covered by the `jest.unit.config.js`, while integration tests are covered by `jest.integration.config.js`. The `jest` section of `package.json` lists these both as projects for Jest to run, which is how `npm run test` runs them all.

Unit tests are written inline in `src` and should live parallel to the source files they cover. Unit tests must be suffixed with `.test.ts/tsx/js/jsx` for the test runner to recognize them.

Integration tests exist separately in `__tests__`. Any file containing test definitions in this directory will be picked up by the integration test runner.

Additionally, both suites of tests have access to the `jest` directory, which contains utility and common setup code. This directory is mapped to the `@testing` import path via `jest` configuration.

### Snapshot tests

A subset of our integration tests are **snapshot tests**, which are organized under `__tests/snapshot`. These run application screens in a stubbed-out test harness and compare the resulting React Native DOM tree against one stored in a corresponding snapshot file, highlighting any differences. If a snapshot needs to be updated as a result of a change, you can run `npm run test -- -u` to automatically update them from the results of a test run.
