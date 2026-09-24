import axios from 'axios';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { GoogleAuth } from 'google-auth-library';

function getCommonArgs() {
  return yargs(hideBin(process.argv))
    .option('project', {
      type: 'string',
      demandOption: true,
      describe: 'Google Cloud Project Number'
    })
    .option('app-id', {
      type: 'string',
      demandOption: true,
      describe: 'Firebase App ID (e.g. 1:xxx:android:xxx or 1:xxx:ios:xxx)'
    })
    .option('credentials', {
      type: 'string',
      describe: 'Path to service account JSON file (optional if GOOGLE_APPLICATION_CREDENTIALS is set)',
      default: process.env.GOOGLE_APPLICATION_CREDENTIALS
    })
    .option('initial-version', {
      type: 'number',
      describe: 'Initial version code when no releases exist',
      default: 1
    })
    .help().argv;
}

// Readable one-line reason for a failed Firebase / auth call.
export function describeError(error) {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error?.message;
  if (status) return `HTTP ${status}${apiMessage ? `: ${apiMessage}` : ''}`;
  return error?.message || String(error);
}

export async function getNextVersionCode() {
  const argv = getCommonArgs();
  const initialVersion = argv['initial-version'];
  try {
    const biggest = await getBiggestRelease({ project: argv.project, appId: argv['app-id'], credentials: argv.credentials });
    const versionCode = biggest ? parseInt(biggest.buildVersion, 10) + 1 : initialVersion;
    console.log(versionCode);
  } catch (error) {
    // Never fall back to --initial-version here: a silent "1" ships a build numbered below what
    // testers already have. Only an app with no releases at all gets the initial version.
    console.error(`next-version-code: cannot read releases of ${argv['app-id']} — ${describeError(error)}`);
    process.exit(1);
  }
}

// Release with the largest numeric buildVersion, or null when none is numeric.
export function pickBiggestRelease(releases) {
  let maxVersionCode = 0;
  let biggestRelease = null;
  for (const release of releases) {
    const versionCode = release.buildVersion ? parseInt(release.buildVersion, 10) : 0;
    if (versionCode > maxVersionCode) {
      maxVersionCode = versionCode;
      biggestRelease = release;
    }
  }
  return biggestRelease;
}

// The newest `pageSize` releases of an app (API default order: createTime desc; one request, the API
// caps pageSize at 100 and returns 25 when it is omitted).
async function listReleases({ project, appId, credentials, filter, pageSize = 100 }) {
  const auth = new GoogleAuth({
    keyFile: credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const accessToken = await auth.getAccessToken();
  const url = `https://firebaseappdistribution.googleapis.com/v1/projects/${project}/apps/${appId}/releases`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { pageSize, filter }
  });
  return response.data.releases || [];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Newest release of an app. With `buildVersion`, the newest release carrying exactly that build
// version — retried briefly because a just-uploaded release can take a moment to become listable.
export async function getLatestRelease({ project, appId, credentials, buildVersion, attempts = 4, delayMs = 5000 }) {
  if (!buildVersion) {
    const [latest] = await listReleases({ project, appId, credentials, pageSize: 1 });
    return latest;
  }
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const [match] = await listReleases({
      project, appId, credentials, pageSize: 1,
      filter: `buildVersion = "${buildVersion}"`
    });
    if (match) return match;
    if (attempt < attempts) await sleep(delayMs);
  }
  throw new Error(`no release with buildVersion ${buildVersion} for ${appId}`);
}

// Largest build version among the newest 100 releases. Every build number is "max + 1", so the max
// is always one of the newest; it could only fall off this page after 100 lower-numbered uploads.
export async function getBiggestRelease({ project, appId, credentials }) {
  return pickBiggestRelease(await listReleases({ project, appId, credentials, pageSize: 100 }));
}
