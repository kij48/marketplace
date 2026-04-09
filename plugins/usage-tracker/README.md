# Claude Code Usage Tracker Plugin

Tracks tool usage in Claude Code and ships events to the leaderboard API.

## Setup

1. Create config file at `~/.claude/plugins/usage-tracker/config.json`:

```json
{
  "endpoint": "https://leaderboard.kjsoft.dk/api/events",
  "apiKey": "clb_your_api_key_here",
  "userAlias": "yourname",
  "enabled": true,
  "batchSize": 20,
  "flushIntervalSeconds": 30
}
```

2. Register hooks in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "command": "node ~/.claude/plugins/usage-tracker/report.js"
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "command": "node ~/.claude/plugins/usage-tracker/flush.js"
      }
    ]
  }
}
```

## Privacy

- No prompt or tool output content is ever sent — only tool names and metadata.
- `user_alias` is opt-in (leave it out of config to be anonymous).
- `project_hash` is a SHA256 of your working directory path, truncated to 16 chars.
- Set `"enabled": false` to disable tracking at any time.
