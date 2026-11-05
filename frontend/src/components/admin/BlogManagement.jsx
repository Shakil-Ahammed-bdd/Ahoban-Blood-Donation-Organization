import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BlogContent from '../blog/BlogContent'
import { useAuth } from '../../contexts/useAuth'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'
import { adminBlogApi } from '../../services/api/adminBlogApi'

function toLocalDateTime(value) {
  const date = value ? new Date(value) : new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function createFallbackSlug() {
  return `blog-${crypto.randomUUID().slice(0, 8)}`
}

function slugify(value, fallback) {
  const slug = value.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || (value.trim() ? fallback : '')
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  shortDescription: '',
  coverImage: '',
  category: '',
  content: '',
  author: '',
  status: 'draft',
  publishAt: toLocalDateTime(),
  featured: false,
  metaTitle: '',
  metaDescription: '',
}

function BlogManagement() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [blogs, setBlogs] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryRows, setCategoryRows] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryActive, setCategoryActive] = useState(true)
  const [deletingCategoryId, setDeletingCategoryId] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingCategoryDescription, setEditingCategoryDescription] = useState('')
  const [editingCategoryActive, setEditingCategoryActive] = useState(true)
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState({ search: '', category: '', status: '' })
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState('')
  const [fallbackSlug, setFallbackSlug] = useState(createFallbackSlug)
  const [slugTouched, setSlugTouched] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(false)
  const [blogToolsExpanded, setBlogToolsExpanded] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const editorRef = useRef(null)
  const requestKey = `${page}:${query.search}:${query.category}:${query.status}:${refreshVersion}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setQuery({ search: search.trim(), category: categoryFilter, status: statusFilter })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [categoryFilter, search, statusFilter])

  useEffect(() => {
    let active = true
    Promise.all([
      adminBlogApi.list({ page, limit: 20, ...query }),
      adminBlogApi.listCategories(),
    ]).then(
      ([result, categoryResult]) => {
        if (!active) return
        if (page > Math.max(1, result.pagination.pages)) {
          setPage(Math.max(1, result.pagination.pages))
          return
        }
        setBlogs(result.blogs)
        setCategoryRows(categoryResult.categories)
        setCategories(categoryResult.categories.filter(({ active }) => active).map(({ name }) => name))
        setPagination(result.pagination)
        setError('')
      },
      (requestError) => {
        if (active) setError(requestError.message || t('ব্লগ তালিকা লোড করা যায়নি।'))
      },
    ).finally(() => {
      if (active) setLoadedKey(requestKey)
    })
    return () => { active = false }
  }, [page, query, refreshVersion, requestKey, t])

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  function resetForm() {
    setEditingId('')
    setForm({ ...EMPTY_FORM, author: user?.fullName || '' })
    setFallbackSlug(createFallbackSlug())
    setCoverFile(null)
    setCoverPreview('')
    setSlugTouched(false)
    setPreview(false)
  }

  function editBlog(blog) {
    setEditingId(blog.id)
    setForm({
      title: blog.title,
      slug: blog.slug,
      shortDescription: blog.shortDescription,
      coverImage: blog.coverImage,
      category: blog.category,
      content: blog.content,
      author: blog.author,
      status: blog.status,
      publishAt: toLocalDateTime(blog.publishAt),
      featured: blog.featured,
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
    })
    setCoverFile(null)
    setCoverPreview(blog.coverImage)
    setSlugTouched(true)
    setPreview(false)
    setError('')
    setNotice('')
    document.getElementById('blog-management-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function updateForm(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value }
      if (name === 'title' && !slugTouched) next.slug = slugify(value, fallbackSlug)
      return next
    })
    if (name === 'slug') setSlugTouched(true)
  }

  function insertMarkdown(prefix, suffix = prefix, placeholder = t('লেখা')) {
    const textarea = editorRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = form.content.slice(start, end) || placeholder
    const replacement = `${prefix}${selected}${suffix}`
    const content = `${form.content.slice(0, start)}${replacement}${form.content.slice(end)}`
    setForm((current) => ({ ...current, content }))
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  function insertLink() {
    const url = window.prompt(t('লিংকের URL লিখুন'), 'https://')
    if (url) insertMarkdown('[', `](${url})`)
  }

  function insertImage() {
    const url = window.prompt(t('ছবির URL লিখুন'), 'https://')
    if (url) insertMarkdown('![ছবির বর্ণনা](', `)`, url)
  }

  async function saveBlog(event) {
    event.preventDefault()
    const selectedStatus = event.nativeEvent.submitter?.value || form.status
    setSaving(true)
    setError('')
    setNotice('')
    const data = new FormData()
    for (const [key, value] of Object.entries({ ...form, status: selectedStatus })) {
      if (key === 'coverImage' && !value) continue
      data.set(key, typeof value === 'boolean' ? String(value) : value)
    }
    if (coverFile) data.set('coverImage', coverFile)
    try {
      if (editingId) {
        await adminBlogApi.update(editingId, data)
        setNotice(t('ব্লগ হালনাগাদ হয়েছে।'))
      } else {
        await adminBlogApi.create(data)
        setNotice(t('ব্লগ তৈরি হয়েছে।'))
      }
      resetForm()
      setRefreshVersion((version) => version + 1)
    } catch (requestError) {
      setError(requestError.message || t('ব্লগ সংরক্ষণ করা যায়নি।'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteBlog(blog) {
    if (!window.confirm(t('আপনি কি এই ব্লগটি মুছে ফেলতে নিশ্চিত?'))) return
    setError('')
    setNotice('')
    try {
      await adminBlogApi.delete(blog.id)
      setNotice(t('ব্লগ মুছে ফেলা হয়েছে।'))
      setRefreshVersion((version) => version + 1)
    } catch (requestError) {
      setError(requestError.message || t('ব্লগ মুছে ফেলা যায়নি।'))
    }
  }

  async function saveCategory(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      if (editingCategoryId) {
        await adminBlogApi.updateCategory(editingCategoryId, {
          name: editingCategoryName,
          description: editingCategoryDescription,
          active: editingCategoryActive,
        })
        setNotice(t('ব্লগ বিভাগ হালনাগাদ হয়েছে।'))
      } else {
        await adminBlogApi.createCategory({
          name: categoryName,
          description: categoryDescription,
          active: categoryActive,
        })
        setNotice(t('ব্লগ বিভাগ যোগ হয়েছে।'))
      }
      setCategoryName('')
      setCategoryDescription('')
      setCategoryActive(true)
      setEditingCategoryId('')
      setEditingCategoryName('')
      setEditingCategoryDescription('')
      setEditingCategoryActive(true)
      setRefreshVersion((version) => version + 1)
    } catch (requestError) {
      setError(requestError.message || t('ব্লগ বিভাগ সংরক্ষণ করা যায়নি।'))
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(t('আপনি কি এই ব্লগ বিভাগটি মুছে ফেলতে নিশ্চিত?'))) return
    setError('')
    setNotice('')
    setDeletingCategoryId(category.id)
    try {
      await adminBlogApi.deleteCategory(category.id)
      setCategoryRows((current) => current.filter(({ id }) => id !== category.id))
      setCategories((current) => current.filter((name) => name !== category.name))
      if (editingCategoryId === category.id) {
        setEditingCategoryId('')
        setEditingCategoryName('')
        setEditingCategoryDescription('')
        setEditingCategoryActive(true)
      }
      setNotice(t('ব্লগ বিভাগ মুছে ফেলা হয়েছে।'))
    } catch (requestError) {
      if (requestError.code === 'BLOG_CATEGORY_IN_USE') {
        setError(t('এই বিভাগটি বিদ্যমান ব্লগ পোস্টে ব্যবহৃত হচ্ছে, তাই মুছে ফেলা যাবে না।'))
      } else if (requestError.code === 'BLOG_CATEGORY_NOT_FOUND') {
        setError(t('বিভাগটি পাওয়া যায়নি। তালিকা হালনাগাদ করে আবার চেষ্টা করুন।'))
        setRefreshVersion((version) => version + 1)
      } else {
        setError(translateErrorMessage(requestError, t) || t('ব্লগ বিভাগ মুছে ফেলা যায়নি।'))
      }
    } finally {
      setDeletingCategoryId('')
    }
  }

  async function toggleCategoryStatus(category) {
    setError('')
    setNotice('')
    try {
      await adminBlogApi.updateCategory(category.id, { active: !category.active })
      setNotice(t(category.active ? 'ব্লগ বিভাগ নিষ্ক্রিয় করা হয়েছে।' : 'ব্লগ বিভাগ সক্রিয় করা হয়েছে।'))
      setRefreshVersion((version) => version + 1)
    } catch (requestError) {
      setError(requestError.message || t('ব্লগ বিভাগের অবস্থা হালনাগাদ করা যায়নি।'))
    }
  }

  return (
    <section aria-labelledby="admin-blog-management-title" className="admin-panel admin-blog-management">
      <div className="admin-panel-heading">
        <div><span className="admin-eyebrow">{t('প্রবন্ধ ও অনুপ্রেরণা')}</span><h2 id="admin-blog-management-title">{t('ব্লগ ব্যবস্থাপনা')}</h2></div>
        <span>{pagination?.total ?? blogs.length} {t('টি ব্লগ')}</span>
      </div>
      {error && <p className="admin-feedback is-error" role="alert">{t(error)}</p>}
      {notice && <p className="admin-feedback is-success" role="status">{t(notice)}</p>}

      <section aria-labelledby="admin-blog-categories-title" className="admin-blog-categories">
        <h3 id="admin-blog-categories-title">{t('ব্লগ বিভাগ পরিচালনা')}</h3>
        <form className="admin-blog-category-form" onSubmit={saveCategory}>
          <label>
            {t(editingCategoryId ? 'বিভাগের নাম' : 'নতুন বিভাগের নাম')}
            <input
              maxLength="60"
              minLength="2"
              onChange={(event) => editingCategoryId
                ? setEditingCategoryName(event.target.value)
                : setCategoryName(event.target.value)}
              required
              value={editingCategoryId ? editingCategoryName : categoryName}
            />
          </label>
          <label>
            {t('বিভাগের বিবরণ')} <span>{t('ঐচ্ছিক')}</span>
            <input
              maxLength="300"
              onChange={(event) => editingCategoryId
                ? setEditingCategoryDescription(event.target.value)
                : setCategoryDescription(event.target.value)}
              value={editingCategoryId ? editingCategoryDescription : categoryDescription}
            />
          </label>
          <label className="admin-blog-category-status">
            {t('বিভাগের অবস্থা')}
            <select
              onChange={(event) => {
                const active = event.target.value === 'active'
                if (editingCategoryId) setEditingCategoryActive(active)
                else setCategoryActive(active)
              }}
              value={(editingCategoryId ? editingCategoryActive : categoryActive) ? 'active' : 'inactive'}
            >
              <option value="active">{t('সক্রিয়')}</option>
              <option value="inactive">{t('নিষ্ক্রিয়')}</option>
            </select>
          </label>
          <button className="admin-primary-button" type="submit">
            {editingCategoryId ? t('বিভাগ হালনাগাদ') : t('বিভাগ যোগ করুন')}
          </button>
          {editingCategoryId && (
            <button
              className="admin-secondary-button"
              onClick={() => {
                setEditingCategoryId('')
                setEditingCategoryName('')
                setEditingCategoryDescription('')
                setEditingCategoryActive(true)
              }}
              type="button"
            >
              {t('বাতিল')}
            </button>
          )}
        </form>
        <div className="admin-blog-category-list">
          {categoryRows.map((category) => (
            <div className="admin-blog-category-row" key={category.id}>
              <div className="admin-blog-category-info">
                <strong>{t(category.name)}</strong>
                <small className="admin-blog-category-description">
                  {category.description || t('কোনো বিবরণ দেওয়া হয়নি।')}
                </small>
              </div>
              <span className={`admin-blog-category-state${category.active ? ' is-active' : ''}`}>
                <span>{t('বিভাগের অবস্থা')}</span>
                <strong>
                  {t(category.active ? 'সক্রিয়' : 'নিষ্ক্রিয়')}
                </strong>
              </span>
              <div className="admin-blog-category-actions">
                <button
                  className="admin-secondary-button"
                  onClick={() => {
                    setEditingCategoryId(category.id)
                    setEditingCategoryName(category.name)
                    setEditingCategoryDescription(category.description || '')
                    setEditingCategoryActive(category.active)
                    setCategoryName('')
                    setCategoryDescription('')
                    setCategoryActive(true)
                  }}
                  type="button"
                >
                  {t('সম্পাদনা')}
                </button>
                <button className="admin-secondary-button" onClick={() => toggleCategoryStatus(category)} type="button">
                  {t(category.active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন')}
                </button>
                <button
                  aria-busy={deletingCategoryId === category.id}
                  className="admin-secondary-button"
                  disabled={Boolean(deletingCategoryId)}
                  onClick={() => deleteCategory(category)}
                  type="button"
                >
                  {deletingCategoryId === category.id ? t('মুছে ফেলা হচ্ছে…') : t('মুছে ফেলুন')}
                </button>
              </div>
            </div>
          ))}
          {!categoryRows.length && <p className="admin-empty">{t('কোনো বিভাগ পাওয়া যায়নি।')}</p>}
        </div>
      </section>

      <form className="admin-blog-form" id="blog-management-form" onSubmit={saveBlog}>
        <h3>{editingId ? t('ব্লগ সম্পাদনা') : t('নতুন ব্লগ তৈরি')}</h3>
        <label>{t('ব্লগের শিরোনাম')}<input maxLength="180" name="title" onChange={updateForm} required value={form.title} /></label>
        <label>{t('URL স্লাগ')}<input maxLength="200" name="slug" onChange={updateForm} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={form.slug} /></label>
        <label className="admin-blog-form-wide">{t('সংক্ষিপ্ত বিবরণ')}<textarea maxLength="320" minLength="10" name="shortDescription" onChange={updateForm} required rows="2" value={form.shortDescription} /></label>
        <label>{t('বিভাগ')}<select name="category" onChange={updateForm} required value={form.category}><option value="">{t('ব্লগ বিভাগ নির্বাচন করুন')}</option>{[...new Set([...categories, ...(editingId && form.category ? [form.category] : [])])].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label>{t('লেখক')}<input maxLength="100" name="author" onChange={updateForm} required value={form.author} /></label>
        <label className="admin-blog-form-wide">{t('কভার ছবি')}<input accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setCoverFile(file); setCoverPreview(file ? URL.createObjectURL(file) : form.coverImage) }} required={!editingId && !form.coverImage} type="file" />{coverPreview && <img alt={t('কভার ছবির প্রিভিউ')} className="admin-blog-cover-preview" src={coverPreview} />}</label>
        <label>{t('প্রকাশের তারিখ')}<input name="publishAt" onChange={updateForm} required type="datetime-local" value={form.publishAt} /></label>
        <label>{t('প্রকাশের অবস্থা')}<select name="status" onChange={updateForm} value={form.status}><option value="draft">{t('খসড়া')}</option><option value="published">{t('প্রকাশিত')}</option></select></label>
        <label className="admin-blog-checkbox"><input checked={form.featured} name="featured" onChange={updateForm} type="checkbox" />{t('বিশেষ লেখা হিসেবে দেখান')}</label>
        <label className="admin-blog-form-wide">{t('SEO শিরোনাম')}<input maxLength="180" name="metaTitle" onChange={updateForm} value={form.metaTitle} /></label>
        <label className="admin-blog-form-wide">{t('SEO বিবরণ')}<textarea maxLength="320" name="metaDescription" onChange={updateForm} rows="2" value={form.metaDescription} /></label>
        <div className="admin-blog-editor admin-blog-form-wide">
          <div className="admin-blog-editor-heading"><strong>{t('ব্লগের লেখা')}</strong><button className="admin-secondary-button" onClick={() => setPreview((value) => !value)} type="button">{preview ? t('সম্পাদনা') : t('প্রিভিউ')}</button></div>
          {!preview ? (
            <>
              <div aria-label={t('লেখার ফরম্যাটিং')} className="admin-blog-toolbar">
                <button onClick={() => insertMarkdown('## ', '', t('শিরোনাম'))} type="button">H2</button>
                <button onClick={() => insertMarkdown('**', '**')} type="button"><strong>B</strong></button>
                <button onClick={() => insertMarkdown('*', '*')} type="button"><em>I</em></button>
                <button onClick={() => insertMarkdown('- ', '', t('তালিকার লেখা'))} type="button">• {t('তালিকা')}</button>
                <button onClick={() => insertMarkdown('1. ', '', t('তালিকার লেখা'))} type="button">1. {t('ক্রমিক তালিকা')}</button>
                <button onClick={insertLink} type="button">{t('লিংক')}</button>
                <button onClick={insertImage} type="button">{t('ছবি')}</button>
                <button onClick={() => insertMarkdown('\n```\n', '\n```\n', 'code')} type="button">{t('কোড')}</button>
              </div>
              <textarea aria-label={t('ব্লগের লেখা')} maxLength="100000" minLength="1" name="content" onChange={updateForm} ref={editorRef} required rows="16" value={form.content} />
              <small>{t('মার্কডাউন সমর্থিত: শিরোনাম, অনুচ্ছেদ, বোল্ড, ইটালিক, তালিকা, লিংক, ছবি ও কোড ব্লক।')}</small>
            </>
          ) : <BlogContent content={form.content} />}
        </div>
        <div className="admin-blog-form-actions admin-blog-form-wide">
          {editingId && <button className="admin-secondary-button" onClick={resetForm} type="button">{t('বাতিল')}</button>}
          <button className="admin-secondary-button" disabled={saving} name="status" type="submit" value="draft">{saving ? t('সংরক্ষণ হচ্ছে…') : t('খসড়া হিসেবে সংরক্ষণ')}</button>
          <button className="admin-primary-button" disabled={saving} name="status" type="submit" value="published">{t('প্রকাশ করুন')}</button>
        </div>
      </form>

      <button
        aria-controls="admin-blog-management-content"
        aria-expanded={blogToolsExpanded}
        className="admin-blog-management-toggle"
        onClick={() => setBlogToolsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span>{t('ব্লগ খুঁজুন')}</span>
        <svg aria-hidden="true" className="admin-blog-management-chevron" fill="none" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      <div
        aria-hidden={!blogToolsExpanded}
        className={`admin-blog-management-content${blogToolsExpanded ? ' is-expanded' : ''}`}
        id="admin-blog-management-content"
        inert={!blogToolsExpanded}
      >
        <div className="admin-blog-management-inner">
      <div className="admin-blog-filters">
        <label>{t('ব্লগ খুঁজুন')}<input onChange={(event) => setSearch(event.target.value)} placeholder={t('শিরোনাম, লেখক বা লেখা')} type="search" value={search} /></label>
        <label>{t('বিভাগ')}<select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="">{t('সব ব্লগ বিভাগ')}</option>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label>{t('প্রকাশের অবস্থা')}<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="">{t('সব অবস্থা')}</option><option value="draft">{t('খসড়া')}</option><option value="published">{t('প্রকাশিত')}</option></select></label>
      </div>
      {loading && <p className="admin-feedback" role="status">{t('ব্লগ লোড হচ্ছে…')}</p>}
      {!loading && error && <button className="admin-secondary-button" onClick={() => setRefreshVersion((version) => version + 1)} type="button">{t('আবার চেষ্টা করুন')}</button>}
      {!loading && blogs.length > 0 && (
        <div className="admin-blog-list">
          {blogs.map((blog) => (
            <article className="admin-blog-row" key={blog.id}>
              <img alt="" src={blog.coverImage} />
              <div className="admin-blog-row-copy">
                <strong>{blog.title}</strong>
                <small>{t(blog.category)} · {blog.author} · {new Date(blog.publishAt).toLocaleDateString()}</small>
                <span className={`admin-blog-status is-${blog.status}`}>{t(blog.status === 'published' ? 'প্রকাশিত' : 'খসড়া')}</span>
              </div>
              <div className="admin-row-actions">
                {blog.status === 'published' && <Link className="admin-secondary-button" to={`/blog/${encodeURIComponent(blog.slug)}`}>{t('দেখুন')}</Link>}
                <button className="admin-secondary-button" disabled={saving} onClick={() => editBlog(blog)} type="button">{t('সম্পাদনা')}</button>
                <button className="admin-danger-button" disabled={saving} onClick={() => deleteBlog(blog)} type="button">{t('মুছুন')}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !blogs.length && <p className="admin-empty">{t('কোনো ব্লগ পাওয়া যায়নি।')}</p>}
      {pagination?.pages > 1 && (
        <div className="admin-pagination">
          <button className="admin-secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button">{t('আগের পৃষ্ঠা')}</button>
          <span>{t('পৃষ্ঠা')} {page} / {pagination.pages}</span>
          <button className="admin-secondary-button" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)} type="button">{t('পরের পৃষ্ঠা')}</button>
        </div>
      )}
        </div>
      </div>
    </section>
  )
}

export default BlogManagement
