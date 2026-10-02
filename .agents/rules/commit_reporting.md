---
name: Commit Reporting Rule
description: Ensure the AI always outputs the commit hash and git show details when committing code.
---

# Commit Reporting Rule

Whenever you (the AI) make a git commit on behalf of the user, you MUST proactively output the commit details in your very next response to the user.

You must follow these strict requirements:
1. State the short commit hash (e.g., `c88644d`).
2. Provide the commit message.
3. Show the output of `git show <commit-hash>` so the user can verify the exact code diff that was committed.
4. Do this automatically, immediately, and as part of your summary. The user should NEVER have to ask you for the commit details or diffs.
