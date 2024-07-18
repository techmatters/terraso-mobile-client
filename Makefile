lint:
	cd dev-client && npm run lint-js && npm run check-ts && npm run check-modules

setup-git-hooks:
	@cp scripts/pre-commit.sample .git/hooks/pre-commit
	@cp scripts/commit-msg.sample .git/hooks/commit-msg
	@echo "git hooks installed"

pre-commit: lint

clean-watchman:
	watchman watch-del-all

clean-simulators:
	{ type -p xcrun && xcrun simctl shutdown all && xcrun simctl erase all; }

clean: clean-watchman clean-simulators
	rm -rf dev-client/node_modules dev-client/ios dev-client/android
	cd dev-client && npm ci && npm run prebuild --clean && npm run start -- --reset-cache
