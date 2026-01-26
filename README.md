# Firebase Release Tool

CLI tool để làm việc với Firebase App Distribution - lấy thông tin release, tính version code và gửi notification.

## Cài đặt

```bash
npm install
npm link  # để sử dụng global commands
```

## Yêu cầu

- Node.js >= 18
- Service Account JSON với quyền Firebase App Distribution

Có thể set credentials qua biến môi trường:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Commands

### next-version-code

Lấy version code tiếp theo (max version code + 1) từ Firebase App Distribution.

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
| `--initial-version` | No | Version code khi chưa có release nào (default: `1`) |

**Output:** In ra stdout version code tiếp theo (e.g. `10001`)

---

### notify-slack

Gửi thông tin release đến Slack webhook.

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

*Ít nhất một trong `--android-app-id` hoặc `--ios-app-id` phải được cung cấp.

**Payload gửi đến webhook:**

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

> **Note:** Các URL sẽ là empty string `""` nếu platform tương ứng không được cung cấp.

---

### notify-google-chat

Gửi thông tin release đến Google Chat webhook với card format.

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

**Options:** Tương tự `notify-slack`

**Output:** Google Chat card với:
- Header: version name/code, branch, environment
- Release info: commit, build user
- Download buttons: Install/Download links cho iOS/Android (chỉ hiển thị platform được cung cấp)
- Firebase Console links
- Release notes

---

## Ví dụ sử dụng trong CI/CD

```bash
# Lấy next version code cho Android
VERSION_CODE=$(next-version-code \
  --project 123456789 \
  --app-id 1:123456789:android:abc123)

# Build app với version code...

# Gửi notification sau khi upload
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

## License

MIT
