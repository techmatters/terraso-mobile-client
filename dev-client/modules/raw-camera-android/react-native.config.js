// Android-only module. iOS is deliberately excluded so autolinking
// doesn't try to create a pod / native module for a platform this
// module doesn't target. See ../../docs/raw-camera-plan.md phase 7 —
// iOS RAW works via vision-camera + our small ProRAW patch, so we
// only need a bypass on Android.
module.exports = {
  dependency: {
    platforms: {
      ios: null,
      android: {},
    },
  },
};
