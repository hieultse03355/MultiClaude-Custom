import { mkdtemp, rm, writeFile } from 'fs/promises'
import { execFileSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GitManager } from '../git-manager'

/**
 * Real-git test (no simple-git mock): `behind` after another clone pushes,
 * pull catching up, and resolving repo files for "open file".
 */

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf-8' }).trim()
}

async function commit(cwd: string, name: string): Promise<void> {
  await writeFile(join(cwd, name), name)
  git(cwd, 'add', name)
  git(cwd, 'commit', '-q', '-m', name)
}

describe('GitManager remote behind + open file', () => {
  let root: string
  let repo: string
  const manager = new GitManager()

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mc-behind-'))
    repo = join(root, 'repo')
    git(root, 'init', '-q', '--bare', '-b', 'main', 'remote.git')
    git(root, 'init', '-q', '-b', 'main', 'repo')
    git(repo, 'remote', 'add', 'origin', join(root, 'remote.git'))
    await commit(repo, 'a')
    git(repo, 'push', '-q', '-u', 'origin', 'main')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('reports behind after fetching commits pushed elsewhere, then 0 after pull', async () => {
    git(root, 'clone', '-q', 'remote.git', 'other')
    const other = join(root, 'other')
    await commit(other, 'b')
    await commit(other, 'c')
    git(other, 'push', '-q')

    expect((await manager.getStatus(repo)).behind).toBe(0)
    expect((await manager.fetch(repo)).success).toBe(true)
    expect((await manager.getStatus(repo)).behind).toBe(2)

    expect((await manager.pull(repo)).success).toBe(true)
    expect((await manager.getStatus(repo)).behind).toBe(0)
  })

  it('resolves existing repo files and rejects missing or escaping paths', async () => {
    expect(await manager.resolveWorkingFile(repo, 'a')).toBe(join(repo, 'a'))
    expect(await manager.resolveWorkingFile(repo, 'gone.txt')).toBeNull()
    expect(await manager.resolveWorkingFile(repo, '../remote.git')).toBeNull()
  })
})
