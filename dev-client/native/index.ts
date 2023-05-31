import {Permission, PermissionsAndroid, Platform} from 'react-native';

// Android requires user to approve certain key permissions manually
// see documentation: https://reactnative.dev/docs/permissionsandroid
export function checkAndroidPermissions(permission: Permission) {
  if (Platform.OS !== 'android') {
    return;
  }

  PermissionsAndroid.request(permission)
    .then(granted => {
      if (granted) {
        console.log(permission, 'granted');
      } else {
        // TODO: What to do on rejection
        console.log(permission, 'rejected');
      }
    })
    .catch(err => {
      // TODO: What to do on error?
      console.error(err);
    });
}
