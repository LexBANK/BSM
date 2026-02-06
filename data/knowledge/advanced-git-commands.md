# Advanced Git Commands

This guide explains four advanced Git commands and when to use each one.

## 1. `git stash`

`git stash` temporarily saves uncommitted changes so you can work on something else without creating a partial commit.

### Common usage

```bash
git stash
git stash list
git stash apply
git stash pop
```

### Typical scenario

You are in the middle of a feature branch and need to quickly switch to another branch to fix a production bug.

---

## 2. `git cherry-pick`

`git cherry-pick` applies one or more specific commits from another branch onto your current branch.

### Common usage

```bash
git log
git cherry-pick <commit-hash>
git cherry-pick <commit1-hash> <commit2-hash>
```

### Typical scenario

You need a bug fix from one branch but do not want to merge the full branch history.

---

## 3. `git revert`

`git revert` safely undoes an existing commit by creating a new commit that reverses it.

### Common usage

```bash
git revert <commit-hash>
git revert <commit1-hash> <commit2-hash>
```

### Typical scenario

A merged commit introduced a regression and you need to undo it in a shared repository while preserving history.

---

## 4. `git reset`

`git reset` moves branch history and optionally updates the index and working tree.

- `--soft`: keep all changes staged.
- `--mixed`: unstage changes but keep them in the working directory.
- `--hard`: discard staged and working-directory changes.

### Common usage

```bash
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD~1
```

### Typical scenario

You just made a bad commit and want to rework it before committing again.

---

## Quick reference

| Command | Purpose | Example |
|---|---|---|
| `git stash` | Save work-in-progress temporarily | `git stash` then `git stash pop` |
| `git cherry-pick` | Apply selected commit(s) from another branch | `git cherry-pick <hash>` |
| `git revert` | Reverse commit(s) with a new commit | `git revert <hash>` |
| `git reset` | Move HEAD and adjust staged/working changes | `git reset --hard HEAD~1` |
