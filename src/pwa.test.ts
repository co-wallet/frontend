import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')

function expectPNG(src: string, sizes: string) {
  const data = readFileSync(resolve(root, 'public', src.replace(/^\//, '')))
  expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`).toBe(sizes)
}

describe('app icons', () => {
  it.each(['manifest.webmanifest', 'manifest-dark.webmanifest'])('provides correctly sized PNG assets in %s', (file) => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public', file), 'utf8'))
    expect(manifest.id).toBe('/')
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512'])
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png')
      expect(icon.purpose.split(' ')).toContain('maskable')
      expectPNG(icon.src, icon.sizes)
    }
  })

  it('provides dark favicon and Apple touch assets', () => {
    expectPNG('/icons/wallet-dark-32.png', '32x32')
    expectPNG('/icons/wallet-dark-180.png', '180x180')
  })

  it('connects the manifest, favicon and Apple home screen icon', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    for (const rel of ['icon', 'apple-touch-icon']) {
      const link = html.match(new RegExp(`<link rel="${rel}"[^>]+>`))?.[0] ?? ''
      const src = link.match(/href="([^"]+)"/)?.[1] ?? ''
      const sizes = link.match(/sizes="([^"]+)"/)?.[1] ?? ''
      expect(src).not.toBe('')
      expectPNG(src, sizes)
    }
    expect(html).not.toContain('/vite.svg')
  })
})
