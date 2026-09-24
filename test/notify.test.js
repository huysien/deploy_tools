import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleChatPayload, versionTitle } from '../lib/notify.js';

const release = (platform, displayVersion, buildVersion) => ({
  displayVersion,
  buildVersion,
  firebaseConsoleUri: `https://console/${platform}`,
  testingUri: `https://install/${platform}`,
  binaryDownloadUri: `https://download/${platform}`
});

const baseData = {
  branch: 'feature/x',
  environment: 'dev',
  commit: 'abc123',
  buildUser: 'jenkins',
  releaseNote: ''
};

const card = (payload) => payload.cardsV2[0].card;
const buttonTexts = (payload) =>
  card(payload).sections.find((s) => s.header === 'References').widgets[0].buttonList.buttons.map((b) => b.text);

test('iOS only: header and buttons mention iOS alone', () => {
  const payload = buildGoogleChatPayload({
    ...baseData,
    environment: 'dev · ios=roosterx',
    androidRelease: null,
    iosRelease: release('ios', '1.0.0', '26092501')
  });
  assert.equal(card(payload).header.title, '📦 1.0.0 (26092501)');
  assert.deepEqual(buttonTexts(payload), ['🔗 iOS Release', '📲 Install iOS', '⬇️ Download iOS']);
  assert.ok(!JSON.stringify(payload).includes('Android'));
  assert.ok(!JSON.stringify(payload).includes('https://install/android'));
});

test('Android only: header and buttons mention Android alone', () => {
  const payload = buildGoogleChatPayload({
    ...baseData,
    environment: 'dev · android=office',
    androidRelease: release('android', '1.0.0', '26092501'),
    iosRelease: null
  });
  assert.equal(card(payload).header.title, '📦 1.0.0 (26092501)');
  assert.deepEqual(buttonTexts(payload), ['🔗 Android Release', '📲 Install Android', '⬇️ Download Android']);
  assert.ok(!JSON.stringify(payload).includes('iOS'));
  assert.ok(!JSON.stringify(payload).includes('https://install/ios'));
});

test('both platforms, same version: one version in the header, six buttons', () => {
  const payload = buildGoogleChatPayload({
    ...baseData,
    androidRelease: release('android', '1.0.0', '26092501'),
    iosRelease: release('ios', '1.0.0', '26092501')
  });
  assert.equal(card(payload).header.title, '📦 1.0.0 (26092501)');
  assert.equal(buttonTexts(payload).length, 6);
});

test('both platforms, different versions: header names each platform', () => {
  assert.equal(
    versionTitle(release('android', '1.0.0', '26092501'), release('ios', '1.1.0', '26092501')),
    'Android 1.0.0 (26092501) · iOS 1.1.0 (26092501)'
  );
  assert.equal(
    versionTitle(release('android', '1.0.0', '1'), release('ios', '1.0.0', '26092501')),
    'Android 1.0.0 (1) · iOS 1.0.0 (26092501)'
  );
});

test('no release at all falls back to N/A', () => {
  assert.equal(versionTitle(null, null), 'N/A');
});

test('release note section only when a note is given', () => {
  const withoutNote = buildGoogleChatPayload({ ...baseData, iosRelease: release('ios', '1.0.0', '1') });
  assert.ok(!card(withoutNote).sections.some((s) => s.header === 'Release note'));

  const withNote = buildGoogleChatPayload({
    ...baseData,
    releaseNote: 'test build',
    iosRelease: release('ios', '1.0.0', '1')
  });
  const section = card(withNote).sections.find((s) => s.header === 'Release note');
  assert.equal(section.widgets[0].textParagraph.text, 'test build');
});
