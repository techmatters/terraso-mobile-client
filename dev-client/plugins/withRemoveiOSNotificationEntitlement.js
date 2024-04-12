const {withEntitlementsPlist} = require('expo/config-plugins');

// This disables push notifications. Expo enables them by default.
// More here: https://github.com/expo/eas-cli/issues/987
// https://github.com/expo/expo/pull/25808
const withRemoveiOSNotificationEntitlement = config => {
  return withEntitlementsPlist(config, mod => {
    delete mod.modResults['aps-environment'];

    return mod;
  });
};

module.exports = withRemoveiOSNotificationEntitlement;
