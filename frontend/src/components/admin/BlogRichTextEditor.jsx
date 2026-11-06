import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Extension, Mark } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, FontFamily, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const HTML_PATTERN = /<\s*(?:a|blockquote|br|del|div|em|figure|h[1-6]|hr|iframe|img|li|mark|ol|p|pre|s|span|strong|sub|sup|table|u|ul)\b/i
const FONT_FAMILIES = [
  ['Inter', 'Inter'],
  ['Arial', 'Arial'],
  ['Georgia', 'Georgia'],
  ['Noto Sans Bengali', 'Noto Sans Bengali'],
  ['Hind Siliguri', 'Hind Siliguri'],
  ['Nirmala UI', 'Nirmala UI'],
]

const EditorComment = Mark.create({
  name: 'editorComment',
  addAttributes() {
    return {
      comment: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-editor-comment'),
        renderHTML: ({ comment }) => comment ? { 'data-editor-comment': comment } : {},
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-editor-comment]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },
})

const ParagraphStyles = Extension.create({
  name: 'paragraphStyles',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indentLevel: {
          default: 0,
          parseHTML: (element) => Math.max(0, Math.min(4, Number(element.getAttribute('data-indent')) || 0)),
          renderHTML: ({ indentLevel }) => indentLevel
            ? { 'data-indent': indentLevel, style: `margin-left:${indentLevel * 2}em` }
            : {},
        },
        paragraphSpacing: {
          default: null,
          parseHTML: (element) => {
            const spacing = Number(element.getAttribute('data-paragraph-spacing'))
            return [8, 16, 24].includes(spacing) ? spacing : null
          },
          renderHTML: ({ paragraphSpacing }) => paragraphSpacing
            ? { 'data-paragraph-spacing': paragraphSpacing, style: `margin-bottom:${paragraphSpacing}px` }
            : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setIndentLevel: (level) => ({ commands, editor }) => {
        const indentLevel = Math.max(0, Math.min(4, level))
        if (editor.isActive('bulletList')) return indentLevel > 0
          ? commands.sinkListItem('listItem')
          : commands.liftListItem('listItem')
        if (editor.isActive('orderedList')) return indentLevel > 0
          ? commands.sinkListItem('listItem')
          : commands.liftListItem('listItem')
        const type = editor.isActive('heading') ? 'heading' : 'paragraph'
        return commands.updateAttributes(type, { indentLevel })
      },
      setParagraphSpacing: (spacing) => ({ commands, editor }) => {
        const type = editor.isActive('heading') ? 'heading' : 'paragraph'
        return commands.updateAttributes(type, { paragraphSpacing: spacing || null })
      },
    }
  },
})

const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent(),
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
        renderHTML: ({ alignment }) => ({ 'data-alignment': alignment }),
      },
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: ({ caption }) => caption ? { 'data-caption': caption } : {},
      },
    }
  },
}).configure({
  resize: {
    enabled: true,
    directions: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
    minWidth: 80,
    minHeight: 60,
    alwaysPreserveAspectRatio: true,
  },
})

function extensions(language) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    LineHeight.configure({ types: ['paragraph', 'heading'] }),
    Highlight.configure({ multicolor: true }),
    Underline,
    EditorComment,
    Subscript,
    Superscript,
    Link.configure({
      autolink: false,
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      isAllowedUri: (url) => /^(?:https?:|mailto:|tel:)/i.test(url) || (url.startsWith('/') && !url.startsWith('//')),
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    ParagraphStyles,
    BlogImage,
    Table.configure({ resizable: true, HTMLAttributes: { class: 'blog-rich-table' } }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ nocookie: true, controls: true, allowFullscreen: true }),
    Placeholder.configure({
      placeholder: language === 'en' ? 'Write your blog content here…' : 'এখানে ব্লগের লেখা লিখুন…',
    }),
  ]
}

function toEditorHtml(value) {
  const content = String(value || '')
  const html = HTML_PATTERN.test(content)
    ? content
    : marked.parse(content, { breaks: true, gfm: true })
  return DOMPurify.sanitize(html)
}

function normalizeColor(color) {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return color.toLowerCase()
  context.fillStyle = '#000000'
  context.fillStyle = color
  return context.fillStyle.toLowerCase()
}

function ToolButton({ active = false, children, disabled = false, label, onClick }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`blog-rich-tool${active ? ' is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

function BlogRichTextEditor({ value, onChange, t, language, coverImage, blogs }) {
  const [message, setMessage] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [aiToolsOpen, setAiToolsOpen] = useState(false)
  const [paragraphMarks, setParagraphMarks] = useState(false)
  const onChangeRef = useRef(onChange)
  const lastEditorContentRef = useRef(toEditorHtml(value))
  const editorExtensions = useMemo(() => extensions(language), [language])
  const editor = useEditor({
    extensions: editorExtensions,
    content: toEditorHtml(value),
    editorProps: { attributes: { class: 'blog-rich-writing-area', spellcheck: 'true' } },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      lastEditorContentRef.current = html
      onChangeRef.current(html)
    },
  }, [language])
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  })

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => {
    if (!editor) return
    if (value === lastEditorContentRef.current) return
    const incoming = toEditorHtml(value)
    editor.commands.setContent(incoming, { emitUpdate: false })
    lastEditorContentRef.current = value
  }, [editor, value])

  const run = useCallback((action) => {
    if (!editor) return
    action()
    editor.commands.focus()
    setMessage('')
  }, [editor])

  function setHighlightColor(color) {
    run(() => {
      const current = editor.getAttributes('highlight').color
      if (
        normalizeColor(color) === '#fff29a' ||
        (editor.isActive('highlight') && current && normalizeColor(current) === normalizeColor(color))
      ) {
        editor.chain().focus().unsetHighlight().run()
      } else {
        editor.chain().focus().setHighlight({ color }).run()
      }
    })
  }

  function setFontColor(color) {
    run(() => {
      const current = editor.getAttributes('textStyle').color
      if (
        normalizeColor(color) === '#242a33' ||
        (current && normalizeColor(current) === normalizeColor(color))
      ) {
        editor.chain().focus().unsetColor().run()
      } else {
        editor.chain().focus().setColor(color).run()
      }
    })
  }

  function setFontFamily(value) {
    run(() => editor.chain().focus().setFontFamily(value).run())
  }

  function setFontSize(value) {
    run(() => editor.chain().focus().setFontSize(value).run())
  }

  function changeFontSize(amount) {
    const currentSize = Number.parseInt(editor.getAttributes('textStyle').fontSize, 10) || 16
    setTextSize(`${Math.min(64, Math.max(8, currentSize + amount))}px`)
  }

  function setTextSize(size) {
    run(() => editor.chain().focus().setFontSize(size).run())
  }

  function clearFormatting() {
    editor.chain().focus()
      .unsetMark('bold')
      .unsetMark('italic')
      .unsetMark('underline')
      .unsetMark('strike')
      .unsetMark('code')
      .unsetMark('link')
      .unsetMark('subscript')
      .unsetMark('superscript')
      .unsetMark('highlight')
      .unsetMark('textStyle')
      .clearNodes()
      .unsetTextAlign()
      .unsetLineHeight()
      .updateAttributes('paragraph', { indentLevel: 0, paragraphSpacing: null })
      .run()
  }

  function addComment() {
    const { from, to } = editor.state.selection
    if (from === to || !editor.state.doc.textBetween(from, to).trim()) {
      setMessage(t('মন্তব্য যোগ করতে আগে লেখা নির্বাচন করুন।'))
      return
    }
    const comment = window.prompt(t('নির্বাচিত লেখার জন্য মন্তব্য লিখুন'), '')
    if (comment === null) return
    if (!comment.trim()) {
      setMessage(t('মন্তব্য খালি রাখা যাবে না।'))
      return
    }
    editor.chain().focus().setMark('editorComment', { comment: comment.trim().slice(0, 500) }).run()
    setMessage('')
  }

  const libraryImages = useMemo(() => {
    const assets = new Map()
    const addImage = (src, alt, title) => {
      if (!src || (!/^https:\/\//i.test(src) && !src.startsWith('/api/uploads/blogs/'))) return
      if (!assets.has(src)) assets.set(src, { src, alt: alt || title || t('ব্লগের ছবি'), title })
    }
    addImage(coverImage, '', t('বর্তমান কভার ছবি'))
    for (const blog of blogs || []) {
      addImage(blog.coverImage, '', blog.title)
      const template = document.createElement('template')
      template.innerHTML = DOMPurify.sanitize(blog.content || '', {
        ALLOWED_TAGS: ['img'],
        ALLOWED_ATTR: ['src', 'alt'],
      })
      for (const image of template.content.querySelectorAll('img')) {
        addImage(image.getAttribute('src'), image.getAttribute('alt'), blog.title)
      }
    }
    return [...assets.values()]
  }, [blogs, coverImage, t])

  function insertLibraryImage(image) {
    editor.chain().focus().setImage({ src: image.src, alt: image.alt }).run()
    setLibraryOpen(false)
  }

  if (!editor) return null

  const activeStyle = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : editor.isActive('blockquote')
          ? 'quote'
          : 'normal'
  const selectedFontFamily = editor.getAttributes('textStyle').fontFamily || ''
  const selectedFontSize = Number.parseInt(editor.getAttributes('textStyle').fontSize, 10)
  const selectedHighlightColor = editor.isActive('highlight')
    ? editor.getAttributes('highlight').color || '#fff29a'
    : '#fff29a'
  const selectedFontColor = editor.getAttributes('textStyle').color || '#242a33'

  return (
    <div className={`blog-rich-editor${paragraphMarks ? ' show-paragraph-marks' : ''}`}>
      <div aria-label={t('লেখার ফরম্যাটিং')} className="blog-rich-toolbar">
        <div className="blog-rich-toolbar-group">
          <select aria-label={t('ফন্ট পরিবার')} onChange={(event) => setFontFamily(event.target.value)} value={selectedFontFamily}>
            <option disabled value="">{t('ফন্ট নাম')}</option>
            {FONT_FAMILIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select aria-label={t('ফন্ট সাইজ')} onChange={(event) => setFontSize(`${event.target.value}px`)} value={selectedFontSize || 16}>
            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <ToolButton label={t('ফন্ট ছোট করুন')} onClick={() => changeFontSize(-1)}>A−</ToolButton>
          <ToolButton label={t('ফন্ট বড় করুন')} onClick={() => changeFontSize(1)}>A+</ToolButton>
          <ToolButton label={t('ফরম্যাট মুছুন')} onClick={clearFormatting}>Tx</ToolButton>
          <ToolButton active={editor.isActive('bold')} label={t('বোল্ড')} onClick={() => run(() => editor.chain().focus().toggleBold().run())}><strong>B</strong></ToolButton>
          <ToolButton active={editor.isActive('italic')} label={t('ইটালিক')} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}><em>I</em></ToolButton>
          <ToolButton active={editor.isActive('underline')} label={t('আন্ডারলাইন')} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}><u>U</u></ToolButton>
          <label className={`blog-rich-color${editor.isActive('highlight') ? ' is-active' : ''}`} title={t('হাইলাইটের রং')}>
            <span>▰</span><input aria-label={t('হাইলাইটের রং')} onChange={(event) => setHighlightColor(event.target.value)} type="color" value={selectedHighlightColor} />
          </label>
          <ToolButton
            active={false}
            label={t('হাইলাইট রিসেট')}
            onClick={() => run(() => editor.chain().focus().unsetHighlight().run())}
          >×</ToolButton>
          <label className={`blog-rich-color${editor.getAttributes('textStyle').color ? ' is-active' : ''}`} title={t('ফন্টের রং')}>
            <span>A</span><input aria-label={t('ফন্টের রং')} onChange={(event) => setFontColor(event.target.value)} type="color" value={selectedFontColor} />
          </label>
          <ToolButton
            active={false}
            label={t('ফন্টের রং রিসেট')}
            onClick={() => run(() => editor.chain().focus().unsetColor().run())}
          >×</ToolButton>
        </div>
        <div className="blog-rich-toolbar-group">
          <ToolButton active={editor.isActive('bulletList')} label={t('বুলেট')} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>•</ToolButton>
          <ToolButton active={editor.isActive('orderedList')} label={t('নাম্বারিং')} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>1.</ToolButton>
          <select aria-label={t('স্টাইল')} onChange={(event) => run(() => {
            if (event.target.value === 'normal') editor.chain().focus().setParagraph().run()
            else if (event.target.value === 'quote') editor.chain().focus().toggleBlockquote().run()
            else editor.chain().focus().toggleHeading({ level: Number(event.target.value.slice(1)) }).run()
          })} value={activeStyle}>
            <option value="normal">{t('সাধারণ')}</option>
            <option value="h1">{t('শিরোনাম ১')}</option>
            <option value="h2">{t('শিরোনাম ২')}</option>
            <option value="h3">{t('শিরোনাম ৩')}</option>
            <option value="quote">{t('উদ্ধৃতি')}</option>
          </select>
          {[
            ['left', '⇤'], ['center', '↔'], ['right', '⇥'], ['justify', '☰'],
          ].map(([alignment, icon]) => (
            <ToolButton
              active={editor.isActive({ textAlign: alignment })}
              key={alignment}
              label={t(`অ্যালাইন ${alignment}`)}
              onClick={() => run(() => editor.chain().focus().setTextAlign(alignment).run())}
            >{icon}</ToolButton>
          ))}
          <select aria-label={t('লাইন স্পেসিং')} defaultValue="" onChange={(event) => event.target.value && run(() => editor.chain().focus().setLineHeight(event.target.value).run())}>
            <option disabled value="">{t('লাইন স্পেসিং')}</option>
            {['1', '1.15', '1.5', '2'].map((space) => <option key={space} value={space}>{space}</option>)}
          </select>
          <select aria-label={t('অনুচ্ছেদ স্পেসিং')} defaultValue="default" onChange={(event) => run(() => editor.commands.setParagraphSpacing(event.target.value === 'default' ? '' : event.target.value))}>
            <option disabled value="">{t('অনুচ্ছেদ স্পেসিং')}</option>
            <option value="8">{t('সংকীর্ণ')}</option><option value="16">{t('মাঝারি')}</option><option value="24">{t('প্রশস্ত')}</option><option value="default">{t('ডিফল্ট')}</option>
          </select>
          <ToolButton active={paragraphMarks} label={t('অনুচ্ছেদ চিহ্ন দেখান বা লুকান')} onClick={() => setParagraphMarks((visible) => !visible)}>¶</ToolButton>
          <ToolButton active={editor.isActive('editorComment')} label={t('নতুন মন্তব্য')} onClick={addComment}>▢+</ToolButton>
          <ToolButton active={libraryOpen} label={t('লাইব্রেরি')} onClick={() => setLibraryOpen((open) => !open)}>▧</ToolButton>
          <ToolButton active={aiToolsOpen} label={t('AI টুলস')} onClick={() => setAiToolsOpen((open) => !open)}>AI</ToolButton>
        </div>
      </div>
      {libraryOpen && (
        <section aria-label={t('মিডিয়া লাইব্রেরি')} className="blog-rich-panel">
          <div className="blog-rich-panel-heading">
            <strong>{t('মিডিয়া লাইব্রেরি')}</strong>
            <button aria-label={t('বন্ধ করুন')} className="blog-rich-tool" onClick={() => setLibraryOpen(false)} type="button">×</button>
          </div>
          {libraryImages.length ? (
            <div className="blog-rich-library-grid">
              {libraryImages.map((image) => (
                <button className="blog-rich-library-item" key={image.src} onClick={() => insertLibraryImage(image)} type="button">
                  <img alt={image.alt} loading="lazy" src={image.src} />
                  <span>{image.title}</span>
                </button>
              ))}
            </div>
          ) : <p>{t('লাইব্রেরিতে কোনো ব্লগ ছবি নেই।')}</p>}
        </section>
      )}
      {aiToolsOpen && (
        <section aria-label={t('AI টুলস')} className="blog-rich-panel" role="status">
          <div className="blog-rich-panel-heading">
            <strong>{t('AI টুলস')}</strong>
            <button aria-label={t('বন্ধ করুন')} className="blog-rich-tool" onClick={() => setAiToolsOpen(false)} type="button">×</button>
          </div>
          <p>{t('AI লেখার টুল ব্যবহার করতে এই প্রজেক্টে AI provider সংযুক্ত করতে হবে।')}</p>
        </section>
      )}
      <EditorContent editor={editor} />
      <div className="blog-rich-editor-footer">
        {message && <small role="status">{message}</small>}
        <small>{editor.getHTML().length.toLocaleString()} / 100,000</small>
      </div>
    </div>
  )
}

export default BlogRichTextEditor
