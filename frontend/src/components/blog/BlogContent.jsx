import { Fragment } from 'react'

function safeUrl(value, image = false) {
  if (/^https:\/\//i.test(value)) return value
  if (image && value.startsWith('/api/uploads/blogs/')) return value
  if (!image && value.startsWith('/') && !value.startsWith('//')) return value
  return ''
}

function InlineContent({ text }) {
  const tokens = /(!?\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*\n]+\*|(?<!_)_[^_\n]+_|`[^`]+`)/g
  const parts = text.split(tokens).filter(Boolean)
  return parts.map((part, index) => {
    const imageMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imageMatch) {
      const src = safeUrl(imageMatch[2], true)
      return src ? <img alt={imageMatch[1]} className="blog-content-inline-image" key={index} loading="lazy" src={src} /> : null
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      const href = safeUrl(linkMatch[2])
      return href
        ? <a href={href} key={index} rel="noreferrer" target="_blank">{linkMatch[1]}</a>
        : <Fragment key={index}>{linkMatch[1]}</Fragment>
    }
    if (/^\*\*.+\*\*$|^__.+__$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (/^\*.+\*$|^_.+_$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>
    if (/^`.+`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>
    return <Fragment key={index}>{part}</Fragment>
  })
}

function BlogContent({ content }) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }
    if (/^```/.test(line)) {
      const language = line.slice(3).trim()
      const codeLines = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index])) codeLines.push(lines[index++])
      if (index < lines.length) index += 1
      blocks.push(
        <pre key={`code-${index}`}><code className={language ? `language-${language}` : undefined}>{codeLines.join('\n')}</code></pre>,
      )
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const Tag = `h${heading[1].length + 1}`
      blocks.push(<Tag key={`heading-${index}`}><InlineContent text={heading[2]} /></Tag>)
      index += 1
      continue
    }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items = []
      while (
        index < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*+]\s+/.test(lines[index]))
      ) {
        items.push(lines[index++].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''))
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineContent text={item} /></li>)}</List>)
      continue
    }
    const paragraph = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^\s*[-*+]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index++])
    }
    blocks.push(<p key={`paragraph-${index}`}><InlineContent text={paragraph.join(' ')} /></p>)
  }
  return <div className="blog-content">{blocks}</div>
}

export default BlogContent
