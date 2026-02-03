// lib/notify.js
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';
import { getLatestRelease } from './firebase-release.js';

function parseNotifyArgs() {
  return yargs(hideBin(process.argv))
    .option('project', { type: 'string', demandOption: true })
    .option('android-app-id', { type: 'string' })
    .option('ios-app-id', { type: 'string' })
    .option('credentials', { type: 'string', default: process.env.GOOGLE_APPLICATION_CREDENTIALS })
    .option('branch', { type: 'string', demandOption: true })
    .option('environment', { type: 'string', demandOption: true })
    .option('webhook', { type: 'string', demandOption: true })
    .option('commit', { type: 'string', demandOption: true })
    .option('build_user', { type: 'string', demandOption: true })
    .option('mentions', { type: 'string', description: 'Comma-separated user IDs or emails to @mention (Google Chat); use "all" for everyone' })
    .check((argv) => {
      if (!argv['android-app-id'] && !argv['ios-app-id']) {
        throw new Error('At least one of --android-app-id or --ios-app-id is required');
      }
      return true;
    })
    .help().argv;
}

async function getReleaseData(argv) {
  const [androidRelease, iosRelease] = await Promise.all([
    argv['android-app-id']
      ? getLatestRelease({ project: argv.project, appId: argv['android-app-id'], credentials: argv.credentials })
      : null,
    argv['ios-app-id']
      ? getLatestRelease({ project: argv.project, appId: argv['ios-app-id'], credentials: argv.credentials })
      : null
  ]);

  return {
    androidRelease,
    iosRelease,
    versionName: androidRelease?.displayVersion || iosRelease?.displayVersion || 'N/A',
    versionCode: androidRelease?.buildVersion || iosRelease?.buildVersion || 'N/A',
    releaseNote: androidRelease?.releaseNotes?.text || iosRelease?.releaseNotes?.text || '',
    branch: argv.branch,
    environment: argv.environment,
    commit: argv.commit,
    buildUser: argv.build_user
  };
}

export async function notifySlack() {
  const argv = parseNotifyArgs();

  try {
    const data = await getReleaseData(argv);

    const payload = {
      version_name: data.versionName,
      version_code: data.versionCode,
      branch: data.branch,
      environment: data.environment,
      release_note: data.releaseNote,
      download_android_url: data.androidRelease?.binaryDownloadUri || '',
      download_ios_url: data.iosRelease?.binaryDownloadUri || '',
      install_android_url: data.androidRelease?.testingUri || '',
      install_ios_url: data.iosRelease?.testingUri || '',
      firebase_android_url: data.androidRelease?.firebaseConsoleUri || '',
      firebase_ios_url: data.iosRelease?.firebaseConsoleUri || '',
      commit: data.commit,
      build_user: data.buildUser
    };

    await axios.post(argv.webhook, payload);
    console.log('Slack payload sent successfully');
  } catch (err) {
    console.error('Failed to send Slack payload:', err.message);
    process.exit(1);
  }
}

export async function notifyGoogleChat() {
  const argv = parseNotifyArgs();

  try {
    const data = await getReleaseData(argv);

    const buttons = [];
    if (data.iosRelease) {
      buttons.push(
        { text: "🔗 iOS Release", onClick: { openLink: { url: data.iosRelease.firebaseConsoleUri || '' } } },
        { text: "📲 Install iOS", onClick: { openLink: { url: data.iosRelease.testingUri || '' } } },
        { text: "⬇️ Download iOS", onClick: { openLink: { url: data.iosRelease.binaryDownloadUri || '' } } }
      );
    }
    if (data.androidRelease) {
      buttons.push(
        { text: "🔗 Android Release", onClick: { openLink: { url: data.androidRelease.firebaseConsoleUri || '' } } },
        { text: "📲 Install Android", onClick: { openLink: { url: data.androidRelease.testingUri || '' } } },
        { text: "⬇️ Download Android", onClick: { openLink: { url: data.androidRelease.binaryDownloadUri || '' } } }
      );
    }

    const mentionText = argv.mentions
      ? argv.mentions.split(',').map((m) => (m.trim().toLowerCase() === 'all' ? '<users/all>' : `<users/${m.trim()}>`)).join(' ')
      : undefined;

    const chatPayload = {
      ...(mentionText && { text: mentionText }),
      cardsV2: [
        {
          cardId: "release-card",
          card: {
            header: {
              title: `📦 ${data.versionName} (${data.versionCode})`,
              subtitle: `Branch: ${data.branch} • Environment: ${data.environment}`
            },
            sections: [
              {
                header: "Release",
                widgets: [
                  { decoratedText: { topLabel: "Commit", text: data.commit } },
                  { decoratedText: { topLabel: "Build by", text: data.buildUser } }
                ]
              },
              {
                header: "References",
                widgets: [{ buttonList: { buttons: buttons } }]
              },
              ...(data.releaseNote ? [{ header: "Release note", widgets: [{ textParagraph: { text: data.releaseNote } }] }] : [])
            ]
          }
        }
      ]
    };

    await axios.post(argv.webhook, chatPayload);
    console.log('Google Chat payload sent successfully');
  } catch (err) {
    console.error('Failed to send Google Chat payload:', err.message);
    process.exit(1);
  }
}
