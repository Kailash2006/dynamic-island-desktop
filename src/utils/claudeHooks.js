// Settings snippet for ~/.claude/settings.json that forwards Claude Code
// hook events to the island. curl ships with Windows 10+ and Git Bash.
export function claudeHookSettings(port = 47821) {
  const command = `curl -s -m 1 -X POST http://127.0.0.1:${port}/claude -H "Content-Type: application/json" --data-binary @- || true`;
  const hook = [{ type: 'command', command }];
  return {
    hooks: {
      UserPromptSubmit: [{ hooks: hook }],
      PreToolUse: [{ matcher: '*', hooks: hook }],
      PostToolUse: [{ matcher: '*', hooks: hook }],
      Notification: [{ hooks: hook }],
      Stop: [{ hooks: hook }],
    },
  };
}
