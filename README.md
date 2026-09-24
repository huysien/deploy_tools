# Deploy Tools

CLI toolkit for CI/CD deployment. Currently includes tools for Firebase App Distribution.

## Installation

```bash
npm install
npm link  # to use global commands
```

## Requirements

- Node.js >= 18
- Service Account JSON with Firebase App Distribution permissions

You can set credentials via environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Commands

### next-version-code

Get the next version code (max version code + 1) from Firebase App Distribution. One request for the
newest 100 releases (the API maximum page size): since every build number is "max + 1", the max is always
among the newest releases.

```bash
next-version-code \
  --project <project-number> \
  --app-id <firebase-app-id> \
  [--credentials <path-to-credentials>] \
  [--initial-version <number>]
```

**Options:**
| Option | Required | Description |
|--------|----------|-------------|
| `--project` | Yes | Google Cloud Project Number |
| `--app-id` | Yes | Firebase App ID (e.g. `1:xxx:android:xxx`) |
| `--credentials` | No | Path to service account JSON (defaults to `GOOGLE_APPLICATION_CREDENTIALS`) |
| `--initial-version` | No | Version code when the app has no releases at all (default: `1`) |

**Output:** Prints the next version code to stdout (e.g. `10001`). If releases cannot be read (auth,
permission, network), prints the reason to stderr and exits `1` — it never falls back to
`--initial-version`, which would ship a build numbered below what testers already have.

---

### notify-slack

Send release information to a Slack webhook.

```bash
notify-slack \
  --project <project-number> \
  --branch <branch-name> \
  --environment <env> \
  --webhook <slack-webhook-url> \
  --commit <commit-hash> \
  --build_user <user> \
  [--android-app-id <id>] \
  [--ios-app-id <id>] \
  [--credentials <path>]
```

**Options:**
| Option | Required | Description |
|--------|----------|-------------|
| `--project` | Yes | Google Cloud Project Number |
| `--android-app-id` | No* | Firebase Android App ID |
| `--ios-app-id` | No* | Firebase iOS App ID |
| `--branch` | Yes | Git branch name |
| `--environment` | Yes | Environment (e.g. `staging`, `production`) |
| `--webhook` | Yes | Slack incoming webhook URL |
| `--commit` | Yes | Git commit hash |
| `--build_user` | Yes | User who triggered the build |
| `--credentials` | No | Path to service account JSON |
| `--release-note` | No | Release note to show; defaults to the note stored on the Firebase release |
| `--build-version` | No | Show the release with exactly this build version (versionCode / CFBundleVersion) instead of the newest one; retried briefly, then fails if missing |

*At least one of `--android-app-id` or `--ios-app-id` must be provided.

**Payload sent to webhook:**

```json
{
  "version_name": "1.2.3",
  "version_code": "10001",
  "branch": "main",
  "environment": "production",
  "release_note": "Bug fixes and improvements",
  "download_android_url": "https://...",
  "download_ios_url": "https://...",
  "install_android_url": "https://...",
  "install_ios_url": "https://...",
  "firebase_android_url": "https://console.firebase.google.com/...",
  "firebase_ios_url": "https://console.firebase.google.com/...",
  "commit": "abc1234",
  "build_user": "CI Bot"
}
```

> **Note:** URLs will be empty string `""` if the corresponding platform is not provided.

---

### notify-google-chat

Send release information to a Google Chat webhook with card format.

```bash
notify-google-chat \
  --project <project-number> \
  --branch <branch-name> \
  --environment <env> \
  --webhook <google-chat-webhook-url> \
  --commit <commit-hash> \
  --build_user <user> \
  [--android-app-id <id>] \
  [--ios-app-id <id>] \
  [--credentials <path>]
```

**Options:** Same as `notify-slack`

**Output:** Google Chat card with:
- Header: version name/code, branch, environment. When both platforms are given and their versions differ, each one is named (`Android 1.0.0 (5) · iOS 1.1.0 (5)`)
- Release info: commit, build user
- References: Firebase Console, Install, and Download links per platform (only shows provided platforms)
- Release notes (section omitted when empty)

---

## CI/CD Usage Example

```bash
# Get next version code for Android
VERSION_CODE=$(next-version-code \
  --project 123456789 \
  --app-id 1:123456789:android:abc123)

# Build app with version code...

# Send notification after upload
notify-google-chat \
  --project 123456789 \
  --android-app-id 1:123456789:android:abc123 \
  --ios-app-id 1:123456789:ios:def456 \
  --branch main \
  --environment production \
  --webhook "https://chat.googleapis.com/v1/spaces/xxx/messages?key=xxx" \
  --commit "abc1234" \
  --build_user "CI Bot"
```

## Development

```bash
npm test   # node:test — Google Chat card content per platform combination
```

## License

MIT
