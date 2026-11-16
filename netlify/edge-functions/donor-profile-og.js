const DEFAULT_API_ORIGIN = 'https://ahoban-blood-donation-organization.onrender.com'
const BOT_USER_AGENT = /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterestbot|googlebot/i

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function replaceMeta(html, attribute, key, content) {
  const escapedContent = escapeHtml(content)
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
  const element = `<meta ${attribute}="${key}" content="${escapedContent}" />`
  return pattern.test(html) ? html.replace(pattern, element) : html.replace('</head>', `  ${element}\n  </head>`)
}

function replaceTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
}

export default async (request, context) => {
  const userAgent = request.headers.get('user-agent') || ''
  if (!BOT_USER_AGENT.test(userAgent)) return context.next()

  const routeMatch = new URL(request.url).pathname.match(/^\/donors\/([^/]+)\/?$/)
  if (!routeMatch) return context.next()

  const pageResponse = await context.next()
  if (!pageResponse.ok) return pageResponse

  let donorResponse
  try {
    const apiOrigin = context.env.get('RENDER_API_URL') || DEFAULT_API_ORIGIN
    const publicId = decodeURIComponent(routeMatch[1])
    donorResponse = await fetch(
      `${apiOrigin}/api/users/${encodeURIComponent(publicId)}/profile`,
      { headers: { Accept: 'application/json' } },
    )
  } catch {
    return pageResponse
  }
  if (!donorResponse.ok) return pageResponse

  let payload
  try {
    payload = await donorResponse.json()
  } catch {
    return pageResponse
  }
  const donor = payload.user
  if (!donor?.fullName) return pageResponse

  const url = new URL(request.url)
  const canonicalUrl = `${url.origin}${url.pathname}`
  const title = `${donor.fullName} | আহ্বান রক্তদান সংস্থা`
  const description = [
    `আহ্বান রক্তদান সংস্থার রক্তদাতা ${donor.fullName}-এর প্রোফাইল দেখুন।`,
    !donor.limitedPublicProfile && donor.bloodGroup ? `রক্তের গ্রুপ: ${donor.bloodGroup}` : '',
    !donor.limitedPublicProfile && donor.location ? donor.location : '',
  ].filter(Boolean).join(' · ')
  const image = donor.profilePhotoUrl || `${url.origin}/images/ahoban-logo.png`
  let html = await pageResponse.text()
  html = replaceTitle(html, title)
  html = replaceMeta(html, 'name', 'description', description)
  html = replaceMeta(html, 'property', 'og:type', 'profile')
  html = replaceMeta(html, 'property', 'og:title', title)
  html = replaceMeta(html, 'property', 'og:description', description)
  html = replaceMeta(html, 'property', 'og:url', canonicalUrl)
  html = replaceMeta(html, 'property', 'og:image', image)
  html = replaceMeta(html, 'name', 'twitter:card', 'summary_large_image')
  html = replaceMeta(html, 'name', 'twitter:title', title)
  html = replaceMeta(html, 'name', 'twitter:description', description)
  html = replaceMeta(html, 'name', 'twitter:image', image)

  const headers = new Headers(pageResponse.headers)
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
  headers.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(html, { status: pageResponse.status, statusText: pageResponse.statusText, headers })
}
