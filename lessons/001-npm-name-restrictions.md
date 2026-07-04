# create-next-app refuses capitalized directories; scaffold lowercase elsewhere and move in.

`npx create-next-app@latest .` inside `/Users/yotamlevit/Code/Eqty` fails with
"npm naming restrictions: name can no longer contain capital letters" because
the package name is derived from the directory. It also rejects directories
containing a `README.md` (not on its allowlist), while `.git`/`.gitignore` are
tolerated.

**Fix that worked:** scaffold into a lowercase temp directory
(`create-next-app eqty` in the session scratchpad), delete its `.git` and
generated `README.md`, `rsync -a` the tree into the real repo, restore the
original README. The `package.json` name comes out as `eqty` and nothing else
cares about the directory casing.
