const sanitizeHtml = require('sanitize-html')

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'caption', 'code', 'del', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'iframe', 'img', 'li', 'mark', 'ol', 'p',
  'pre', 's', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul',
]

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'name', 'rel', 'target'],
  figure: ['data-type', 'data-alignment'],
  iframe: ['allow', 'allowfullscreen', 'frameborder', 'height', 'src', 'title', 'width'],
  img: ['alt', 'data-alignment', 'data-caption', 'height', 'src', 'title', 'width'],
  td: ['colspan', 'rowspan', 'style'],
  th: ['colspan', 'rowspan', 'style'],
  '*': ['data-color', 'data-indent', 'data-paragraph-spacing', 'style'],
}

const ALLOWED_STYLES = {
  '*': {
    'background-color': [/^#[\da-f]{3}(?:[\da-f]{3})?$/i],
    color: [/^#[\da-f]{3}(?:[\da-f]{3})?$/i],
    'font-family': [/^(?:Arial|Georgia|Inter|Noto Sans Bengali|Hind Siliguri|Nirmala UI|Times New Roman|Verdana)(?:,\s*(?:Arial|Georgia|Inter|Noto Sans Bengali|Hind Siliguri|Nirmala UI|Times New Roman|Verdana))*$/i],
    'font-size': [/^(?:[8-9]|[1-6]\d)(?:px|pt)$/i],
    'line-height': [/^(?:1|1\.15|1\.[1-9]|2)$/],
    'margin-bottom': [/^(?:0|[0-9]{1,3}px)$/],
    'margin-left': [/^(?:0|[0-8](?:px|em|rem))$/],
    'margin-right': [/^(?:0|[0-8](?:px|em|rem))$/],
    'text-align': [/^(?:left|center|right|justify)$/],
    width: [/^(?:[1-9]\d?|100)%$/, /^(?:[1-9]\d{1,3})px$/],
  },
}

function isRichHtml(content) {
  return /<\s*(?:a|blockquote|br|del|div|em|figure|h[1-6]|hr|iframe|img|li|mark|ol|p|pre|s|span|strong|sub|sup|table|u|ul)\b/i.test(content)
}

function sanitizeBlogContent(content) {
  if (typeof content !== 'string' || !isRichHtml(content)) return content
  return sanitizeHtml(content, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['https', 'http'],
      iframe: ['https'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...attributes,
          ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
    },
  })
}

module.exports = { sanitizeBlogContent }
