import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BlogCard from '../components/blog/BlogCard'
import { blogApi } from '../services/api/blogApi'
import { useLanguage } from '../contexts/useLanguage'

const EMPTY_RESULT = { blogs: [], featuredBlog: null, categories: [], pagination: null }

function BlogPage() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [result, setResult] = useState(EMPTY_RESULT)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')
  const requestKey = `${page}:${category}:${debouncedSearch}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    blogApi.list({ page, limit: 9, category, search: debouncedSearch }).then(
      (response) => {
        if (active) {
          setResult(response)
          setError('')
        }
      },
      (requestError) => {
        if (active) setError(requestError.message || t('ব্লগ এখন লোড করা যাচ্ছে না।'))
      },
    ).finally(() => {
      if (active) setLoadedKey(requestKey)
    })
    return () => { active = false }
  }, [category, debouncedSearch, page, requestKey, t])

  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function updateSearch(value) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set('search', value)
    else params.delete('search')
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  function updatePage(nextPage) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(nextPage))
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="blog-page">
      <header className="blog-hero">
        <div className="blog-hero-orb blog-hero-orb-one" />
        <div className="blog-hero-orb blog-hero-orb-two" />
        <div className="blog-hero-content">
          <span className="blog-eyebrow">{t('আহ্বান থেকে জ্ঞান')}</span>
          <h1>{t('আহ্বান')} <span>{t('ব্লগ')}</span></h1>
          <p>{t('রক্তদান, সুস্থতা এবং মানবিক উদ্যোগ নিয়ে নির্ভরযোগ্য তথ্য ও অনুপ্রেরণামূলক গল্প পড়ুন।')}</p>
          <a className="blog-hero-scroll" href="#latest-blogs">{t('সর্বশেষ লেখা দেখুন')} <span aria-hidden="true">↓</span></a>
        </div>
      </header>

      <div className="blog-page-container">
        {result.featuredBlog && (
          <section aria-labelledby="featured-blog-title" className="blog-featured-section">
            <div className="blog-section-heading">
              <div><span className="blog-eyebrow">{t('সম্পাদকের পছন্দ')}</span><h2 id="featured-blog-title">{t('বিশেষ লেখা')}</h2></div>
            </div>
            <BlogCard blog={result.featuredBlog} featured />
          </section>
        )}

        <section aria-labelledby="latest-blogs-title" className="blog-latest-section" id="latest-blogs">
          <div className="blog-section-heading">
            <div><span className="blog-eyebrow">{t('নতুন প্রকাশনা')}</span><h2 id="latest-blogs-title">{t('সর্বশেষ ব্লগ')}</h2></div>
            <label className="blog-search">
              <span className="sr-only">{t('ব্লগ খুঁজুন')}</span>
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>
              <input onChange={(event) => updateSearch(event.target.value)} placeholder={t('ব্লগ খুঁজুন')} type="search" value={search} />
            </label>
          </div>

          <div aria-label={t('ব্লগের বিভাগ')} className="blog-filter-list">
            <button aria-pressed={!category} className={!category ? 'is-active' : ''} onClick={() => updateFilter('category', '')} type="button">{t('সব')}</button>
            {result.categories.map((item) => (
              <button aria-pressed={category === item} className={category === item ? 'is-active' : ''} key={item} onClick={() => updateFilter('category', item)} type="button">{t(item)}</button>
            ))}
          </div>

          {loading && <p className="blog-state" role="status">{t('ব্লগ লোড হচ্ছে…')}</p>}
          {!loading && error && (
            <div className="blog-state is-error" role="alert">
              <p>{t(error)}</p>
              <button className="button button-secondary" onClick={() => updatePage(page)} type="button">{t('আবার চেষ্টা করুন')}</button>
            </div>
          )}
          {!loading && !error && result.blogs.length > 0 && (
            <div aria-live="polite" className="blog-grid">
              {result.blogs.map((blog) => <BlogCard blog={blog} key={blog.id} />)}
            </div>
          )}
          {!loading && !error && result.blogs.length === 0 && (
            <div className="blog-empty-state">
              <span aria-hidden="true">✦</span>
              <h3>{t('কোনো ব্লগ পাওয়া যায়নি')}</h3>
              <p>{t('অন্য শব্দ দিয়ে খুঁজুন অথবা সব বিভাগ নির্বাচন করুন।')}</p>
              <button className="button button-secondary" onClick={clearFilters} type="button">{t('ফিল্টার মুছুন')}</button>
            </div>
          )}
          {!loading && !error && result.pagination?.pages > 1 && (
            <nav aria-label={t('ব্লগ পৃষ্ঠা')} className="blog-pagination">
              <button disabled={page <= 1} onClick={() => updatePage(page - 1)} type="button">{t('আগের পৃষ্ঠা')}</button>
              <span>{t('পৃষ্ঠা')} {page} / {result.pagination.pages}</span>
              <button disabled={page >= result.pagination.pages} onClick={() => updatePage(page + 1)} type="button">{t('পরের পৃষ্ঠা')}</button>
            </nav>
          )}
        </section>
      </div>
      <Link className="blog-back-home" to="/">{t('মূল পাতায় ফিরুন')}</Link>
    </main>
  )
}

export default BlogPage
