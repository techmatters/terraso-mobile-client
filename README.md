# Terraso Mobile Client

This repo contains the source code for Terraso’s mobile client modules.

## Contributing

Before contributing to the project, it's recommended that you set up
your local git running the following command:

```sh
$ make setup-git-hooks
```

This will activate two git hooks to automatically check JavaScript code
style and commit message structure before each commit.

# Installation

## Dependencies

### macOS

```sh
$ brew install node watchman rbenv openjdk@17
$ sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

Configure rbenv:

zsh users:

```sh
$ echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
```

bash users:

```sh
$ echo 'eval "$(rbenv init - bash)"' >> ~/.bashrc
```

All users:

```sh
$ cd dev-client
$ rbenv init
$ rbenv install 3.2.2
$ rbenv shell 3.2.2
$ gem install bundler
```

Install NPM and Ruby packages:

```sh
$ npm install
$ bundle install
$ cd ios
$ bundle exec pod install
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
EOF
```

### Linux

```sh
$ sudo apt install node watchman openjdk-17-jdk
```

## Android

1. Configure your Mapbox credentials:

```sh
$ mkdir -p ~/.gradle
$ touch ~/.gradle/gradle.properties
$ echo "MAPBOX_DOWNLOADS_TOKEN=YOUR_SECRET_MAPBOX_ACCESS_TOKEN" >> ~/.gradle/gradle.properties
$ chmod 600  ~/.gradle/gradle.properties
```

See also the [Mapbox Android SDK install guide](https://docs.mapbox.com/android/maps/guides/install/#configure-credentials).

2. Run `npm run start` to start the dev server.

3. Run `npm run android` to load the app on an emulator or connnected physical device.

## iOS

1. Configure your Mapbox credentials:

```sh
cat << EOF > ~/.netrc
machine api.mapbox.com
login mapbox
password YOUR_SECRET_MAPBOX_ACCESS_TOKEN
EOF
```

```sh
chmod 600 $HOME/.netrc
```

See also the [Mapbox IOS SDK install guide](https://docs.mapbox.com/ios/maps/guides/install/#configure-credentials).

2. Run `npm run start` to start the dev server.

3. Run `npm run ios` to load the app in the simulator.

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
