const BUILTINS = new Set([
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'LS', 'Task', 'Agent', 'Skill',
  'TodoRead', 'TodoWrite', 'WebFetch', 'WebSearch', 'NotebookEdit',
  'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode',
  'TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList', 'TaskStop', 'TaskOutput',
  'CronCreate', 'CronDelete', 'CronList', 'RemoteTrigger',
  'EnterWorktree', 'ExitWorktree',
]);

export function classifyTool(name) {
  if (!name) return 'plugin';
  if (name.startsWith('mcp__')) return 'mcp';
  if (name.startsWith('skill__')) return 'skill';
  if (BUILTINS.has(name)) return 'builtin';
  return 'plugin';
}

export function extractMcpServer(name) {
  if (!name) return null;
  const m = name.match(/^mcp__([^_]+)__/);
  return m ? m[1] : null;
}
