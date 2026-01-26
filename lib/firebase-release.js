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


export async function getNextVersionCode() {
  const argv = getCommonArgs();
  const initialVersion = argv['initial-version'];
  try {
    const biggest = await getBiggestRelease({ project: argv.project, appId: argv['app-id'], credentials: argv.credentials });
    const versionCode = biggest?.buildVersion ? parseInt(biggest.buildVersion, 10) + 1 : initialVersion;
    console.log(versionCode);
  } catch (error) {
    console.log(initialVersion);
  }
}

export async function getLatestRelease({ project, appId, credentials }) {
  const auth = new GoogleAuth({
    keyFile: credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const accessToken = await auth.getAccessToken();
  const url = `https://firebaseappdistribution.googleapis.com/v1/projects/${project}/apps/${appId}/releases`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.releases?.[0];
}

export async function getBiggestRelease({ project, appId, credentials }) {
  const auth = new GoogleAuth({
    keyFile: credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const accessToken = await auth.getAccessToken();
  const url = `https://firebaseappdistribution.googleapis.com/v1/projects/${project}/apps/${appId}/releases`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  const releases = response.data.releases || [];
  if (releases.length === 0) return null;
  
  // Tìm release có buildVersion lớn nhất
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
