import { mkdtemp, rm, writeFile } from 'fs/promises'
import { execFileSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GitManager } from '../git-manager'

/**
 * Real-git test (no simple-git mock): commit log marks which commits are
 * already on a remote ("pushed") and which exist only locally.
 */

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf-8' }).trim()
}

async function commit(cwd: string, name: string): Promise<string> {
  await writeFile(join(cwd, name), name)
  git(cwd, 'add', name)
  git(cwd, 'commit', '-q', '-m', name)
  return git(cwd, 'rev-parse', 'HEAD')
}

describe('GitManager log pushed state', () => {
  let root: string
  let repo: string
  const manager = new GitManager()

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mc-pushed-'))
    repo = join(root, 'repo')
    git(root, 'init', '-q', '--bare', '-b', 'main', 'remote.git')
    git(root, 'init', '-q', '-b', 'main', 'repo')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('leaves pushed undefined when the repo has no remote', async () => {
    await commit(repo, 'a')
    const log = await manager.getLog(repo)
    expect(log).toHaveLength(1)
    expect(log[0].pushed).toBeUndefined()
  })

  it('marks pushed vs local commits and reports ahead count', async () => {
    git(repo, 'remote', 'add', 'origin', join(root, 'remote.git'))
    const first = await commit(repo, 'a')
    git(repo, 'push', '-q', '-u', 'origin', 'main')
    const second = await commit(repo, 'b')

    const log = await manager.getLog(repo)
    const byHash = Object.fromEntries(log.map(e => [e.hash, e.pushed]))
    expect(byHash[first]).toBe(true)
    expect(byHash[second]).toBe(false)

    const status = await manager.getStatus(repo)
    expect(status.tracking).toBe('origin/main')
    expect(status.ahead).toBe(1)

    git(repo, 'push', '-q')
    const after = await manager.getLog(repo)
    expect(after.every(e => e.pushed === true)).toBe(true)
    expect((await manager.getStatus(repo)).ahead).toBe(0)
  })
})
