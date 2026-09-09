import { beforeEach, describe, expect, it, vi } from 'vitest'
import { monefyApi } from './monefy'
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('./client', () => ({ apiClient: client }))
describe('Monefy API contract', () => {
  beforeEach(() => { vi.clearAllMocks(); client.get.mockResolvedValue({ data: { available: true } }); client.post.mockResolvedValue({ data: { preview_id: 'p' } }) })
  it('gets availability from the server and sends the file as raw binary', async () => {
    expect(await monefyApi.availability()).toEqual({ available: true })
    expect(client.get).toHaveBeenCalledWith('/imports/monefy/availability')
    const file = { name: 'backup.db' } as File
    await monefyApi.preview(file)
    expect(client.post).toHaveBeenCalledWith('/imports/monefy/preview', file, { headers: { 'Content-Type': 'application/octet-stream' }, timeout: 30000 })
  })
  it('uses immutable preview IDs for options and confirmation', async () => {
    await monefyApi.configure('old', { a: 'deposit' })
    expect(client.post).toHaveBeenCalledWith('/imports/monefy/old/options', { account_kinds: { a: 'deposit' }, category_icons: {}, account_icons: {} })
    await monefyApi.confirm('new', true)
    expect(client.post).toHaveBeenCalledWith('/imports/monefy/new/confirm', { acknowledge_exclusions: true, acknowledge_deletion: false }, { timeout: 30000 })
  })
  it('sends account and category appearance in the same options snapshot', async () => {
    await monefyApi.configure('p', { a: 'spending' }, { c: 'preset:cafe|red|none' }, { a: 'preset:cash|green|green' })
    expect(client.post).toHaveBeenCalledWith('/imports/monefy/p/options', { account_kinds: { a: 'spending' }, category_icons: { c: 'preset:cafe|red|none' }, account_icons: { a: 'preset:cash|green|green' } })
  })
  it('propagates API failures without retrying confirmation', async () => {
    client.post.mockRejectedValue(new Error('offline'))
    await expect(monefyApi.confirm('p', true)).rejects.toThrow('offline')
    expect(client.post).toHaveBeenCalledOnce()
  })
})

it('binds replace mode to the preview and sends a separate deletion acknowledgement', async () => {
  client.post.mockResolvedValue({ data: {} })
  const file = { name: 'history.db' } as File
  await monefyApi.preview(file, 'replace')
  expect(client.post).toHaveBeenCalledWith('/imports/monefy/preview?mode=replace', file, { headers: { 'Content-Type': 'application/octet-stream' }, timeout: 30000 })
  await monefyApi.confirm('replacement', false, true)
  expect(client.post).toHaveBeenCalledWith('/imports/monefy/replacement/confirm', { acknowledge_exclusions: false, acknowledge_deletion: true }, { timeout: 30000 })
})
