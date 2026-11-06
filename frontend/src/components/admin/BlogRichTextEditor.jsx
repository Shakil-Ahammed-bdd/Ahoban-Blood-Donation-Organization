import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
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
const SPECIAL_CHARACTERS = ['—', '–', '•', '…', '©', '®', '™', '৳', 'ঁ', 'ৎ']
const FONT_FAMILIES = [
  ['Inter', 'Inter'],
  ['Arial', 'Arial'],
  ['Georgia', 'Georgia'],
  ['Noto Sans Bengali', 'Noto Sans Bengali'],
  ['Hind Siliguri', 'Hind Siliguri'],
  ['Nirmala UI', 'Nirmala UI'],
]

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

function BlogRichTextEditor({ value, onChange, t, language }) {
  const [message, setMessage] = useState('')
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [, setSelectionVersion] = useState(0)
  const onChangeRef = useRef(onChange)
  const editorExtensions = useMemo(() => extensions(language), [language])
  const editor = useEditor({
    extensions: editorExtensions,
    content: toEditorHtml(value),
    editorProps: { attributes: { class: 'blog-rich-writing-area', spellcheck: 'true' } },
    onUpdate: ({ editor: currentEditor }) => onChangeRef.current(currentEditor.getHTML()),
    onSelectionUpdate: () => setSelectionVersion((version) => version + 1),
  }, [language])

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => {
    if (!editor) return
    const incoming = toEditorHtml(value)
    if (editor.getHTML() !== incoming) editor.commands.setContent(incoming, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (!fullscreen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  const run = useCallback((action) => {
    if (!editor) return
    action()
    editor.commands.focus()
    setMessage('')
  }, [editor])

  function setTextAttribute(command, valueToSet) {
    run(() => editor.chain().focus()[command](valueToSet).run())
  }

  function changeFontSize(amount) {
    const currentSize = Number.parseInt(editor.getAttributes('textStyle').fontSize, 10) || 16
    setTextAttribute('setFontSize', `${Math.min(64, Math.max(8, currentSize + amount))}px`)
  }

  function setLink() {
    const href = window.prompt(t('লিংকের URL লিখুন'), 'https://')
    if (!href) return
    if (!/^(?:https?:|mailto:|tel:)/i.test(href) && !(href.startsWith('/') && !href.startsWith('//'))) {
      setMessage(t('নিরাপদ লিংক ব্যবহার করুন।'))
      return
    }
    const { from, to } = editor.state.selection
    if (from !== to) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
      return
    }
    const text = window.prompt(t('লিংকের লেখা লিখুন'), href)
    if (text) editor.chain().focus().insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }).run()
  }

  function insertImage() {
    const src = window.prompt(t('ছবির URL লিখুন'), 'https://')
    if (!src) return
    if (!/^https:\/\//i.test(src) && !src.startsWith('/api/uploads/blogs/')) {
      setMessage(t('ছবির জন্য নিরাপদ HTTPS URL ব্যবহার করুন।'))
      return
    }
    const alt = window.prompt(t('ছবির বর্ণনা লিখুন'), '') || ''
    editor.chain().focus().setImage({ src, alt }).run()
  }

  function insertTable() {
    const rows = Number(window.prompt(t('সারির সংখ্যা লিখুন (১–১০)'), '3'))
    const cols = Number(window.prompt(t('কলামের সংখ্যা লিখুন (১–১০)'), '3'))
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || rows > 10 || cols < 1 || cols > 10) {
      setMessage(t('সারি ও কলামের সংখ্যা ১ থেকে ১০-এর মধ্যে দিন।'))
      return
    }
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  }

  function insertYoutube() {
    const src = window.prompt(t('YouTube ভিডিওর URL লিখুন'))
    if (!src) return
    let url
    try {
      url = new URL(src)
    } catch {
      setMessage(t('বৈধ YouTube ভিডিওর URL দিন।'))
      return
    }
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) {
      setMessage(t('বৈধ YouTube ভিডিওর URL দিন।'))
      return
    }
    if (!editor.chain().focus().setYoutubeVideo({ src, width: 640, height: 360 }).run()) {
      setMessage(t('YouTube ভিডিওটি যোগ করা যায়নি।'))
    }
  }

  function updateImageAttributes(attributes) {
    if (editor.isActive('image')) editor.chain().focus().updateAttributes('image', attributes).run()
  }

  function editImageWidth() {
    const width = Number(window.prompt(t('ছবির প্রস্থ পিক্সেলে লিখুন'), String(editor.getAttributes('image').width || 640)))
    if (Number.isInteger(width) && width >= 80 && width <= 1600) updateImageAttributes({ width })
    else setMessage(t('ছবির প্রস্থ ৮০ থেকে ১৬০০ পিক্সেলের মধ্যে দিন।'))
  }

  function editImageCaption() {
    const caption = window.prompt(t('ছবির ক্যাপশন লিখুন'), editor.getAttributes('image').caption || '')
    if (caption !== null) updateImageAttributes({ caption: caption.trim() || null })
  }

  function replaceMatches() {
    if (!findText) return
    const matches = []
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return
      let offset = 0
      while (true) {
        const index = node.text.indexOf(findText, offset)
        if (index < 0) break
        matches.push({ from: pos + index, to: pos + index + findText.length })
        offset = index + findText.length
      }
    })
    if (matches.length) {
      const chain = editor.chain()
      for (const match of matches.reverse()) {
        chain.setTextSelection(match).insertContent(replaceText)
      }
      chain.run()
      setMessage(t('{count}টি জায়গায় পরিবর্তন হয়েছে।', { count: matches.length }))
    } else {
      setMessage(t('ম্যাচ পাওয়া যায়নি।'))
    }
  }

  async function copySelection() {
    try {
      await navigator.clipboard.writeText(editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        '\n',
      ))
      setMessage(t('নির্বাচিত লেখা কপি হয়েছে।'))
    } catch {
      setMessage(t('কপি করা যায়নি। ব্রাউজারের Clipboard অনুমতি পরীক্ষা করুন।'))
    }
  }

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText()
      editor.chain().focus().insertContent(text).run()
      setMessage('')
    } catch {
      setMessage(t('পেস্ট করা যায়নি। ব্রাউজারের Clipboard অনুমতি পরীক্ষা করুন।'))
    }
  }

  if (!editor) return null

  return (
    <div className={`blog-rich-editor${fullscreen ? ' is-fullscreen' : ''}`}>
      <div aria-label={t('লেখার ফরম্যাটিং')} className="blog-rich-toolbar">
        <div className="blog-rich-toolbar-group">
          <ToolButton label={t('আনডু')} onClick={() => run(() => editor.chain().focus().undo().run())}>↶</ToolButton>
          <ToolButton label={t('রিডু')} onClick={() => run(() => editor.chain().focus().redo().run())}>↷</ToolButton>
          <ToolButton active={editor.isActive('bold')} label={t('বোল্ড')} onClick={() => run(() => editor.chain().focus().toggleBold().run())}><strong>B</strong></ToolButton>
          <ToolButton active={editor.isActive('italic')} label={t('ইটালিক')} onClick={() => run(() => editor.chain().focus().toggleItalic().run())}><em>I</em></ToolButton>
          <ToolButton active={editor.isActive('underline')} label={t('আন্ডারলাইন')} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}><u>U</u></ToolButton>
          <ToolButton active={editor.isActive('strike')} label={t('স্ট্রাইকথ্রু')} onClick={() => run(() => editor.chain().focus().toggleStrike().run())}><s>S</s></ToolButton>
          <ToolButton active={editor.isActive('subscript')} label={t('সাবস্ক্রিপ্ট')} onClick={() => run(() => editor.chain().focus().toggleSubscript().run())}>x₂</ToolButton>
          <ToolButton active={editor.isActive('superscript')} label={t('সুপারস্ক্রিপ্ট')} onClick={() => run(() => editor.chain().focus().toggleSuperscript().run())}>x²</ToolButton>
          <ToolButton label={t('ফরম্যাট মুছুন')} onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>Tx</ToolButton>
        </div>
        <div className="blog-rich-toolbar-group">
          <select aria-label={t('ফন্ট পরিবার')} onChange={(event) => setTextAttribute('setFontFamily', event.target.value)} defaultValue="">
            <option disabled value="">{t('ফন্ট')}</option>
            {FONT_FAMILIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select aria-label={t('ফন্ট সাইজ')} onChange={(event) => setTextAttribute('setFontSize', `${event.target.value}px`)} defaultValue="16">
            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map((size) => <option key={size} value={size}>{size}px</option>)}
          </select>
          <ToolButton label={t('ফন্ট ছোট করুন')} onClick={() => changeFontSize(-1)}>A−</ToolButton>
          <ToolButton label={t('ফন্ট বড় করুন')} onClick={() => changeFontSize(1)}>A+</ToolButton>
          <label className="blog-rich-color" title={t('ফন্টের রং')}>
            <span>A</span><input aria-label={t('ফন্টের রং')} onChange={(event) => setTextAttribute('setColor', event.target.value)} type="color" defaultValue="#242a33" />
          </label>
          <label className="blog-rich-color" title={t('হাইলাইটের রং')}>
            <span>▰</span><input aria-label={t('হাইলাইটের রং')} onChange={(event) => run(() => editor.chain().focus().setHighlight({ color: event.target.value }).run())} type="color" defaultValue="#fff29a" />
          </label>
          <label className="blog-rich-color" title={t('ব্যাকগ্রাউন্ডের রং')}>
            <span>▱</span><input aria-label={t('ব্যাকগ্রাউন্ডের রং')} onChange={(event) => setTextAttribute('setBackgroundColor', event.target.value)} type="color" defaultValue="#ffffff" />
          </label>
        </div>
        <div className="blog-rich-toolbar-group">
          <select aria-label={t('অনুচ্ছেদের ধরন')} onChange={(event) => run(() => {
            if (event.target.value === 'paragraph') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: Number(event.target.value) }).run()
          })} defaultValue="paragraph">
            <option value="paragraph">{t('সাধারণ অনুচ্ছেদ')}</option>
            <option value="1">{t('শিরোনাম ১')}</option>
            <option value="2">{t('শিরোনাম ২')}</option>
            <option value="3">{t('শিরোনাম ৩')}</option>
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
          <ToolButton active={editor.isActive('bulletList')} label={t('বুলেট তালিকা')} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>•</ToolButton>
          <ToolButton active={editor.isActive('orderedList')} label={t('ক্রমিক তালিকা')} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>1.</ToolButton>
          <ToolButton label={t('ইনডেন্ট কমান')} onClick={() => run(() => editor.commands.setIndentLevel(Math.max(0, (editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').indentLevel || 0) - 1)))}>⇤</ToolButton>
          <ToolButton label={t('ইনডেন্ট বাড়ান')} onClick={() => run(() => editor.commands.setIndentLevel((editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').indentLevel || 0) + 1))}>⇥</ToolButton>
          <select aria-label={t('লাইন স্পেসিং')} defaultValue="" onChange={(event) => event.target.value && run(() => editor.chain().focus().setLineHeight(event.target.value).run())}>
            <option disabled value="">{t('লাইন স্পেসিং')}</option>
            {['1', '1.15', '1.5', '2'].map((space) => <option key={space} value={space}>{space}</option>)}
          </select>
          <select aria-label={t('অনুচ্ছেদ স্পেসিং')} defaultValue="default" onChange={(event) => run(() => editor.commands.setParagraphSpacing(event.target.value === 'default' ? '' : event.target.value))}>
            <option disabled value="">{t('অনুচ্ছেদ স্পেসিং')}</option>
            <option value="8">{t('সংকীর্ণ')}</option><option value="16">{t('মাঝারি')}</option><option value="24">{t('প্রশস্ত')}</option><option value="default">{t('ডিফল্ট')}</option>
          </select>
          <ToolButton active={editor.isActive('blockquote')} label={t('উদ্ধৃতি')} onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}>❝</ToolButton>
        </div>
        <div className="blog-rich-toolbar-group">
          <ToolButton label={t('ছবি যোগ করুন')} onClick={insertImage}>▧</ToolButton>
          <ToolButton disabled={!editor.isActive('image')} label={t('ছবির আকার পরিবর্তন')} onClick={editImageWidth}>↗</ToolButton>
          <select aria-label={t('ছবির অবস্থান')} disabled={!editor.isActive('image')} onChange={(event) => updateImageAttributes({ alignment: event.target.value })} value={editor.getAttributes('image').alignment || 'center'}>
            <option value="left">{t('ছবি বামে')}</option><option value="center">{t('ছবি মাঝখানে')}</option><option value="right">{t('ছবি ডানে')}</option>
          </select>
          <ToolButton disabled={!editor.isActive('image')} label={t('ছবির ক্যাপশন')} onClick={editImageCaption}>▤</ToolButton>
          <ToolButton active={editor.isActive('link')} label={t('লিংক যোগ করুন')} onClick={setLink}>↗</ToolButton>
          <ToolButton label={t('টেবিল যোগ করুন')} onClick={insertTable}>▦</ToolButton>
          <ToolButton disabled={!editor.isActive('table')} label={t('সারি যোগ করুন')} onClick={() => run(() => editor.chain().focus().addRowAfter().run())}>+↕</ToolButton>
          <ToolButton disabled={!editor.isActive('table')} label={t('কলাম যোগ করুন')} onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}>+↔</ToolButton>
          <ToolButton disabled={!editor.isActive('table')} label={t('সারি মুছুন')} onClick={() => run(() => editor.chain().focus().deleteRow().run())}>−↕</ToolButton>
          <ToolButton disabled={!editor.isActive('table')} label={t('কলাম মুছুন')} onClick={() => run(() => editor.chain().focus().deleteColumn().run())}>−↔</ToolButton>
          <ToolButton disabled={!editor.isActive('table')} label={t('টেবিল মুছুন')} onClick={() => run(() => editor.chain().focus().deleteTable().run())}>⌫▦</ToolButton>
          <ToolButton label={t('অনুভূমিক রেখা যোগ করুন')} onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())}>―</ToolButton>
          <ToolButton label={t('YouTube ভিডিও যোগ করুন')} onClick={insertYoutube}>▶</ToolButton>
          <select aria-label={t('বিশেষ অক্ষর')} defaultValue="" onChange={(event) => {
            if (event.target.value) editor.chain().focus().insertContent(event.target.value).run()
            event.target.value = ''
          }}>
            <option disabled value="">{t('বিশেষ অক্ষর')}</option>
            {SPECIAL_CHARACTERS.map((character) => <option key={character} value={character}>{character}</option>)}
          </select>
        </div>
        <div className="blog-rich-toolbar-group">
          <ToolButton label={t('কপি')} onClick={copySelection}>⧉</ToolButton>
          <ToolButton label={t('পেস্ট')} onClick={pasteText}>▣</ToolButton>
          <ToolButton label={t('সব নির্বাচন করুন')} onClick={() => run(() => editor.chain().focus().selectAll().run())}>▤</ToolButton>
          <ToolButton active={findReplaceOpen} label={t('খুঁজুন ও প্রতিস্থাপন')} onClick={() => setFindReplaceOpen((open) => !open)}>⌕</ToolButton>
          <ToolButton active={fullscreen} label={t(fullscreen ? 'পূর্ণপর্দা বন্ধ করুন' : 'পূর্ণপর্দা')} onClick={() => setFullscreen((valueToSet) => !valueToSet)}>⛶</ToolButton>
        </div>
      </div>
      {findReplaceOpen && (
        <div className="blog-rich-find">
          <input aria-label={t('যা খুঁজবেন')} onChange={(event) => setFindText(event.target.value)} placeholder={t('যা খুঁজবেন')} value={findText} />
          <input aria-label={t('যা দিয়ে বদলাবেন')} onChange={(event) => setReplaceText(event.target.value)} placeholder={t('যা দিয়ে বদলাবেন')} value={replaceText} />
          <button className="admin-secondary-button" onClick={replaceMatches} type="button">{t('সব প্রতিস্থাপন')}</button>
          {message && <small role="status">{message}</small>}
        </div>
      )}
      <EditorContent editor={editor} />
      <div className="blog-rich-editor-footer">
        {message && !findReplaceOpen && <small role="status">{message}</small>}
        <small>{editor.getHTML().length.toLocaleString()} / 100,000</small>
      </div>
    </div>
  )
}

export default BlogRichTextEditor
