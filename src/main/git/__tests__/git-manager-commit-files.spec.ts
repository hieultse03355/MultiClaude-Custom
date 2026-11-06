import { mkdtemp, rm, writeFile, rename } from 'fs/promises'
import { execFileSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GitManager } from '../git-manager'

/** Real-git test: files changed by a single commit, and per-file commit diff */

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf-8' }).trim()
}

describe('GitManager commit files', () => {
  let repo: string
  const manager = new GitManager()

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'mc-commit-files-'))
    git(repo, 'init', '-q', '-b', 'main')
  })

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true })
  })

  it('lists files of the root commit and of a later commit (add/modify/delete/rename)', async () => {
    await writeFile(join(repo, 'a.txt'), 'one\n')
    await writeFile(join(repo, 'b.txt'), 'bee\n')
    await writeFile(join(repo, 'c.txt'), 'some longer content that survives a rename\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-q', '-m', 'root')
    const root = git(repo, 'rev-parse', 'HEAD')

    const rootFiles = await manager.getCommitFiles(repo, root)
    expect(rootFiles.map(f => f.path).sort()).toEqual(['a.txt', 'b.txt', 'c.txt'])
    expect(rootFiles.every(f => f.status === 'added')).toBe(true)

    await writeFile(join(repo, 'a.txt'), 'one\ntwo\n')
    await rm(join(repo, 'b.txt'))
    await rename(join(repo, 'c.txt'), join(repo, 'd.txt'))
    await writeFile(join(repo, 'new.txt'), 'new\n')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', 'second')
    const second = git(repo, 'rev-parse', 'HEAD')

    const files = await manager.getCommitFiles(repo, second)
    const byPath = Object.fromEntries(files.map(f => [f.path, f]))
    expect(byPath['a.txt']).toMatchObject({ status: 'modified', additions: 1, deletions: 0 })
    expect(byPath['b.txt']).toMatchObject({ status: 'deleted' })
    expect(byPath['d.txt']).toMatchObject({ status: 'renamed', oldPath: 'c.txt' })
    expect(byPath['new.txt']).toMatchObject({ status: 'added' })

    const diff = await manager.getCommitFileDiff(repo, second, 'a.txt')
    expect(diff.success).toBe(true)
    expect(diff.diff).toContain('+two')
  })

  it('diffs a merge commit against its first parent', async () => {
    await writeFile(join(repo, 'base.txt'), 'base\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-q', '-m', 'base')
    git(repo, 'checkout', '-q', '-b', 'feature')
    await writeFile(join(repo, 'feature.txt'), 'feature\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-q', '-m', 'feature')
    git(repo, 'checkout', '-q', 'main')
    await writeFile(join(repo, 'main.txt'), 'main\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-q', '-m', 'main work')
    git(repo, 'merge', '-q', '--no-edit', 'feature')
    const merge = git(repo, 'rev-parse', 'HEAD')

    const files = await manager.getCommitFiles(repo, merge)
    expect(files.map(f => f.path)).toEqual(['feature.txt'])
  })

  it('rejects invalid hashes and paths', async () => {
    expect(await manager.getCommitFiles(repo, '--output=/tmp/x')).toEqual([])
    const res = await manager.getCommitFileDiff(repo, 'abcd1234', '../outside.txt')
    expect(res.success).toBe(false)
  })
})
