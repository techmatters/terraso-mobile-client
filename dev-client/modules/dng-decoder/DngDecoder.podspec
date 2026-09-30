require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "DngDecoder"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/techmatters/terraso-mobile-client"
  s.license      = "AGPL-3.0"
  s.authors      = "Technology Matters"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/techmatters/terraso-mobile-client.git", :tag => "#{s.version}" }

  s.source_files = [
    # Swift shim
    "ios/**/*.{swift}",
    # Objective-C++ registration
    "ios/**/*.{m,mm}",
    # Core C++ engine (parser, demosaic, color pipeline)
    "cpp/**/*.{h,hpp,c,cpp}",
  ]

  # DngDecoderC.h is the pure-C interface Swift calls into. Making it a
  # public header exposes it via the pod's clang module so Swift can see
  # the extern "C" function declarations without a manual bridging header.
  s.public_header_files = [
    "cpp/DngDecoderC.h",
  ]

  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/cpp\""
  }

  load 'nitrogen/generated/ios/DngDecoder+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
