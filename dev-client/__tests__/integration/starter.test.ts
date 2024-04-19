import {device, expect, element} from 'detox';
import {
  request,
  requestGraphQL,
} from 'terraso-client-shared/terrasoApi/api.mock';
import fs from 'fs';

const screenshotsPath = './test-snapshots';

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    request.mockReset();
    requestGraphQL.mockReset();
  });

  it('should launch to login screen', async () => {
    requestGraphQL.mockReturnValue(async (...args) => {
      console.log(...args);
      return {} as any;
    });

    await expect(element(by.id('login-screen'))).toBeVisible();
    await takeSnapshot('login-screen');
  });
});

const takeSnapshot = async (name: string) => {
  const newScreenshot = await element(by.id('app-root')).takeScreenshot(name);
  const newScreenshotBits = fs.readFileSync(newScreenshot);
  const snapshot = `${screenshotsPath}/${name}.png`;
  const snapshotBits = fs.readFileSync(snapshot);
  if (!newScreenshotBits.equals(snapshotBits)) {
    throw new Error(
      `Expected new screenshot at ${newScreenshot} to be equal to snapshot at ${snapshot}, but it was different!`,
    );
  }
};
