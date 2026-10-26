require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "FrameAnalyzer"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/techmatters/terraso-mobile-client"
  s.license      = "AGPL-3.0"
  s.authors      = "Technology Matters"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/techmatters/terraso-mobile-client.git", :tag => "#{s.version}" }

  s.source_files = [
    # Swift Nitro shim
    "ios/**/*.{swift}",
    # Shared C++ analyzer + pure-C bridge
    "cpp/**/*.{h,hpp,c,cpp}",
  ]

  # frame_analyzer_c.h is the pure-C interface Swift calls into. Exposing
  # it via the pod's clang module lets Swift see the extern "C" declaration
  # without a manual bridging header. Same trick DngDecoder uses for
  # DngDecoderC.h.
  s.public_header_files = [
    "cpp/frame_analyzer_c.h",
  ]

  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/cpp\""
  }

  load 'nitrogen/generated/ios/FrameAnalyzer+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
