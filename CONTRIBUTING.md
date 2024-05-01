# Contributing guide

## Writing tests

Right now, all of our tests are integration tests using [Jest's snapshot testing feature](https://jestjs.io/docs/snapshot-testing).
They must pass in order to merge a PR.

To run the tests locally, run `npm test`.

If the snapshot tests fail, but the diff looks like what you wanted, run `npm test -- -u` to update them.
