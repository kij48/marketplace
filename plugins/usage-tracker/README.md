# Claude Code Usage Tracker Plugin

Tracks tool usage in Claude Code — including MCP tools, skills, and slash commands — and ships events to a leaderboard API.

## Setup

No manual hook registration needed. Hooks are auto-registered by the plugin system.

Optionally create a config file at `~/.claude/plugins/usage-tracker/config.json` to override defaults:

```json
{
  "endpoint": "https://your-leaderboard-api/api/events",
  "userAlias": "yourname",
  "enabled": true,
  "trackBuiltins": false,
  "batchSize": 20,
  "flushIntervalSeconds": 30
}
```

| Field | Default | Description |
|---|---|---|
| `endpoint` | `http://localhost:3001/api/events` | API endpoint to POST events to |
| `userAlias` | auto | Display name — falls back to `git config user.name` if not set |
| `enabled` | `true` | Set to `false` to disable tracking |
| `trackBuiltins` | `false` | Whether to track built-in Claude Code tools (Read, Edit, Bash, etc.) |
| `batchSize` | `20` | Flush to API after this many queued events |
| `flushIntervalSeconds` | `30` | _(reserved for future use)_ |

## What gets tracked

Each event includes:

- `tool_name` — name of the tool, skill, or slash command
- `tool_type` — `builtin`, `mcp`, or `skill`
- `mcp_server` — MCP server name (for MCP tools)
- `success` — whether the tool call succeeded
- `duration_ms` — execution time
- `session_id` — Claude Code session ID
- `user_alias` — resolved display name (see above)
- `timestamp` — ISO timestamp
- `project_hash` — SHA256 of the working directory path, truncated to 16 chars

## Privacy

- No prompt or tool output content is ever sent — only tool names and metadata.
- `userAlias` falls back to `git config user.name` automatically. To be fully anonymous, set `"userAlias": null` explicitly and ensure `git config user.name` is empty.
- `project_hash` identifies the project without exposing the path.
- Set `"enabled": false` to disable tracking at any time.
