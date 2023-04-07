# Terraso Mobile Client

This repo contains the source code for Terraso’s mobile client modules.

# Installation

## Dependencies

### macOS

Install dependencies:

```sh
$ brew install node watchman rbenv
```

Configure rbenv:

```sh
$ rbenv init
$ echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
$ cd dev-client
$ rbenv install 2.7.6
$ rbenv shell 2.7.6
$ gem install bundler
```

bash users:

```sh
$ echo 'eval "$(rbenv init - bash)"' >> ~/.bashrc
```

Install packages:

```sh
$ npm install
$ bundle install
$ bundle exec pod install
```

### Linux

```sh
$ sudo apt install node watchman
```

## Android

1. In the file $HOME/.gradle/gradle.properties (create it if it doesn't exist) add an entry `MAPBOX_DOWNLOADS_TOKEN=YOUR_SECRET_MAPBOX_ACCESS_TOKEN` as described in the [Mapbox Android SDK install guide](https://docs.mapbox.com/android/maps/guides/install/#configure-credentials)

2. Run `npm run start` to start the dev server.

3. Run `npm run android` to load the app onto an emulator or connnected physical device.

## iOS

Configure your secret credentials using the following steps:

```sh
cat << EOF > $HOME/.netrc
machine api.mapbox.com
login mapbox
password YOUR_SECRET_MAPBOX_ACCESS_TOKEN
```

```sh
chmod 600 $HOME/.netrc
```

as described in the [Mapbox IOS SDK install guide](https://docs.mapbox.com/ios/maps/guides/install/#configure-credentials)
