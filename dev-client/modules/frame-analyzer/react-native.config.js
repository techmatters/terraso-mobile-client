module.exports = {
  dependency: {
    platforms: {
      // iOS-only for phase 8.4. Android's real-time analyzer lives inside
      // raw-camera-android because it's driven by CameraX ImageAnalysis
      // (not vision-camera Frames). The shared C++ core is currently
      // duplicated between the two; a follow-up should extract it into a
      // single shared location and have both modules consume from there.
      ios: {},
      android: null,
    },
  },
};
