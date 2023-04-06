# Terraso Mobile Client

This repo contains the source code for Terraso's mobile client modules.

# Installation

1. Follow [React Native environment setup guide](https://reactnative.dev/docs/environment-setup) under "React Native CLI Quickstart" to set up your development environment for the desired platforms.

## Android

1. In the file $HOME/.gradle/gradle.properties (create it if it doesn't exist) add an entry `MAPBOX_DOWNLOADS_TOKEN=YOUR_SECRET_MAPBOX_ACCESS_TOKEN` as described in the [Mapbox Android SDK install guide](https://docs.mapbox.com/android/maps/guides/install/#configure-credentials)

## iOS

1. In the file $HOME/.netrc, add an entry
   ```
   machine api.mapbox.com
   login mapbox
   password YOUR_SECRET_MAPBOX_ACCESS_TOKEN
   ```
   as described in the [Mapbox IOS SDK install guide](https://docs.mapbox.com/ios/maps/guides/install/#configure-credentials)
