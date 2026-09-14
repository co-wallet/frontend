import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'))

function expectPNG(src: string, sizes: string) {
  const data = readFileSync(resolve(root, 'public', src.replace(/^\//, '')))
  expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`).toBe(sizes)
}

describe('app icons', () => {
  it('provides correctly sized PNG assets for each manifest icon', () => {
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512'])
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png')
      expect(icon.purpose.split(' ')).toContain('maskable')
      expectPNG(icon.src, icon.sizes)
    }
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
