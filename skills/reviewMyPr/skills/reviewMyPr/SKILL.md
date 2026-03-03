---
name: Code Review
description: Focused, no-nonsense code reviews that catch real problems without nitpicking
---

Write all review comments in Danish.

When I ask for a code review:

## Fetching PR information from Azure DevOps

1. Use `mcp__azure-devops__get_pull_request` to get PR metadata (description, repository GUID)
2. Fetch PR comments/threads using NTLM authentication:
   ```bash
   curl -s --ntlm -u : "https://tfs.schultz.dk/tfs/SchultzCollection/_apis/git/repositories/<REPO_GUID>/pullRequests/<PR_ID>/threads?api-version=7.0"
   ```
   Replace `<REPO_GUID>` with the repositoryId from step 1 (e.g., `84ac3fbd-fb7b-4599-b000-704673654131`).
3. Get the diff using git:
   ```bash
   git fetch origin <source_branch>
   git diff origin/master...origin/<source_branch>
   ```

Parse the threads JSON to find comments where `commentType` is `"text"` (not `"system"`). Note the `filePath`, `line`, and `content` fields.

## Workflow: præsentér review og vent på godkendelse

Når reviewet er færdigt, præsentér alle fundne problemer i chatten og **vent på at brugeren siger 'go'** inden kommentarerne postes til PR'en. Post aldrig kommentarer uden eksplicit godkendelse.

## Posting comments to Azure DevOps PRs

Use PowerShell with UTF-8 encoding to post comments with Danish characters (æ, ø, å).

**Vigtigt**: `ConvertTo-Json` håndterer ikke dansk encoding korrekt på Windows. Skriv i stedet JSON-body'en direkte som en raw string med `\uXXXX` Unicode escapes for danske tegn (ø=`\u00f8`, æ=`\u00e6`, å=`\u00e5`, é=`\u00e9`), gem den til en fil, og send filen som bytes:

```powershell
$json = @'
{
  "comments": [{"parentCommentId": 0, "commentType": 1, "content": "Kommentar med danske tegn: \u00e6\u00f8\u00e5"}],
  "threadContext": {"filePath": "/path/to/file.cs", "rightFileStart": {"line": 42, "offset": 1}, "rightFileEnd": {"line": 42, "offset": 1}},
  "status": 1
}
'@
[System.IO.File]::WriteAllText("C:/temp/comment.json", $json, [System.Text.Encoding]::UTF8)
$bytes = [System.IO.File]::ReadAllBytes("C:/temp/comment.json")
Invoke-RestMethod -Uri "https://tfs.schultz.dk/tfs/SchultzCollection/_apis/git/repositories/<REPO_GUID>/pullRequests/<PR_ID>/threads?api-version=7.0" `
    -Method Post -ContentType "application/json; charset=utf-8" `
    -Body $bytes -UseDefaultCredentials
```

## Reading PR description and comments

First, read the PR description and any existing comments on the PR. The author may have:
- Documented known limitations or scope decisions (e.g. "X is not implemented yet")
- Acknowledged issues they plan to address later
- Explained trade-offs or context for their choices

Don't flag issues that are already acknowledged in the description or comments - the author knows about them.

If another reviewer has already commented on an issue, don't duplicate the comment unless you disagree or their comment doesn't fully cover the problem.

Focus on what actually matters:

- Bugs and errors, including edge cases I may have missed
- Security issues
- Logic errors or flawed assumptions
- Performance problems that will have real impact

Don't comment on:

- Stylistic preferences unless they significantly hurt readability
- Theoretical "what if" scenarios that aren't relevant in context
- Refactorings that don't solve a concrete problem
- Naming unless it's actively misleading

Be direct. If the code is fine, say so briefly. No padding with praise or nitpicks to fill out a review.

When reviewing a PR or diff: only comment on changed lines. Don't flag issues in unchanged code - the developer shouldn't have to fix things they didn't touch. When reviewing a file without a diff context, review the entire file.

If you spot something I didn't ask about but it's a real problem, mention it - but explain why it's actually a problem, not just that it deviates from some best practice.

Before flagging potential issues:

- Trace the actual flow: if a value is guaranteed by the code path (e.g. validated earlier, set by a required step, or the method is only called in a specific context), don't flag it as unsafe. For nullable return values, follow the value through to where it's consumed (mappers, adapters, downstream methods) and verify that null isn't handled before reporting.
- Assume the developer had a reason for their choices - if you see a null-forgiving operator, cast, or suppression, consider whether the surrounding code justifies it before suggesting changes
- Only flag null/safety issues if you can identify a realistic scenario where it would actually fail
- **Verify against actual source files, not auto-generated files**: If you suspect a column, property, or method is missing, always check the actual source file (e.g. the domain entity `Course.cs`) rather than relying on auto-generated files like EF Core `*.Designer.cs` migration snapshots. These snapshots may be outdated or incomplete.

Project-specific conventions:

- We use strongly-typed ID value types (e.g. `CitizenId`, `CourseId`, `CompanyId`) instead of raw `Guid` parameters. If you see a method accepting `Guid` for an entity ID, suggest wrapping it in the appropriate value type to prevent mixing up different ID types.
- Don't use `Async` suffix on method names. We prefer `GetCourse()` over `GetCourseAsync()` even for async methods.
- Prefer primary constructors over traditional constructors.
- For EF Core repositories: check if `Include()` statements match actual usage. Flag unnecessary includes that load data never accessed by callers, and flag missing includes that would cause lazy loading or null reference issues based on how the returned entity is used.
- For EF Core migrations: when a PR includes a new `*.Designer.cs` migration snapshot, verify that the entity definitions are consistent with the actual domain entities. Compare the properties in the Designer.cs with the corresponding entity class (e.g. `Course.cs`) - if the entity has properties that the Designer.cs is missing, the snapshot is stale and should be regenerated.
- `[AllowAnonymous]` er tilladt og forventet på service commands og queries (Communication Framework-endpoints). Flag det ikke som et sikkerhedsproblem.

If you need more context to properly evaluate something (e.g. calling code, related classes, or the broader flow), ask for it rather than guessing or making assumptions.
