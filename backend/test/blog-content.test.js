const test = require('node:test')
const assert = require('node:assert/strict')
const { sanitizeBlogContent } = require('../src/utils/sanitize-blog-content')

test('sanitizes rich blog HTML while preserving supported formatting', () => {
  const content = sanitizeBlogContent(
    '<h2 style="color:#b93140">স্বাস্থ্য</h2><p style="line-height:1.15;margin-bottom:16px"><strong>Bold</strong> <u>underline</u> <span style="font-size:20px">Large</span></p><table><tbody><tr><td>বাংলা</td></tr></tbody></table>',
  )

  assert.match(content, /<h2 style="color:#b93140">স্বাস্থ্য<\/h2>/)
  assert.match(content, /<strong>Bold<\/strong>/)
  assert.match(content, /<u>underline<\/u>/)
  assert.match(content, /font-size:20px/)
  assert.match(content, /line-height:1\.15/)
  assert.match(content, /margin-bottom:16px/)
  assert.match(content, /<table>/)
  assert.match(content, /<td>বাংলা<\/td>/)
})

test('removes active content, unsafe links, and untrusted embeds', () => {
  const content = sanitizeBlogContent(
    '<p onclick="alert(1)">Safe<script>alert(2)</script></p><a href="javascript:alert(3)">link</a><iframe src="https://evil.example/embed"></iframe><iframe src="https://www.youtube.com/embed/abc"></iframe>',
  )

  assert.doesNotMatch(content, /onclick|<script|javascript:|evil\.example|alert\(/i)
  assert.match(content, /<p>Safe<\/p>/)
  assert.match(content, /youtube\.com\/embed\/abc/)
})

test('keeps legacy markdown content unchanged', () => {
  const markdown = '## Legacy\n\n**Existing** content.'
  assert.equal(sanitizeBlogContent(markdown), markdown)
})

test('preserves editorial comments for admin editing but removes their metadata from public content', () => {
  const markedHtml = '<p><span data-editor-comment="editor note">Selected text</span></p>'
  assert.match(sanitizeBlogContent(markedHtml, { preserveEditorComments: true }), /data-editor-comment="editor note"/)
  assert.doesNotMatch(sanitizeBlogContent(markedHtml), /data-editor-comment/)
  assert.match(sanitizeBlogContent(markedHtml), /Selected text/)
})
