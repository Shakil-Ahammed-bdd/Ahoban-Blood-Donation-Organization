import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const renderApiUrl = process.env.RENDER_API_URL?.trim()

if (process.env.CONTEXT && !renderApiUrl) {
  throw new Error('RENDER_API_URL must be set in the Netlify environment.')
}

const redirects = []

if (renderApiUrl) {
  let apiOrigin
  try {
    const url = new URL(renderApiUrl)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error()
    }
    apiOrigin = url.origin
  } catch {
    throw new Error('RENDER_API_URL must be an HTTPS origin without a path or credentials.')
  }
  redirects.push(`/api/* ${apiOrigin}/api/:splat 200!`)
}

redirects.push('/* /index.html 200')
await writeFile(resolve('dist', '_redirects'), `${redirects.join('\n')}\n`)
