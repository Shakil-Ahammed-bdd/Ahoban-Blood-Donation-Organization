import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BlogCard from '../components/blog/BlogCard'
import BlogContent from '../components/blog/BlogContent'
import { blogApi } from '../services/api/blogApi'
import { useLanguage } from '../contexts/useLanguage'

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'long',
  }).format(new Date(value))
}

async function findAdjacentBlogs(slug) {
  const limit = 50
  let page = 1
  let previousPageLast = null

  while (true) {
    const result = await blogApi.list({ page, limit })
    const currentIndex = result.blogs.findIndex((item) => item.slug === slug)
    if (currentIndex >= 0) {
      let previous = result.blogs[currentIndex + 1] || null
      let next = result.blogs[currentIndex - 1] || previousPageLast

      if (!previous && page < result.pagination.pages) {
        const nextPage = await blogApi.list({ page: page + 1, limit })
        previous = nextPage.blogs[0] || null
      }

      return { previous, next }
    }

    if (page >= result.pagination.pages) return { previous: null, next: null }
    previousPageLast = result.blogs[result.blogs.length - 1] || previousPageLast
    page += 1
  }
}

function BlogDetailsPage() {
  const { slug } = useParams()
  const { t, language } = useLanguage()
  const [blog, setBlog] = useState(null)
  const [related, setRelated] = useState([])
  const [adjacentBlogs, setAdjacentBlogs] = useState({ slug: '', previous: null, next: null })
  const [loadedSlug, setLoadedSlug] = useState('')
  const [error, setError] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const loading = loadedSlug !== slug

  useEffect(() => {
    let active = true
    blogApi.read(slug).then(
      async ({ blog: article }) => {
        if (!active) return
        setBlog(article)
        setError('')
        const [recommendations, adjacent] = await Promise.allSettled([
          blogApi.list({ category: article.category, limit: 4 }),
          findAdjacentBlogs(slug),
        ])
        if (!active) return
        setRelated(recommendations.status === 'fulfilled'
          ? recommendations.value.blogs.filter(({ id }) => id !== article.id).slice(0, 3)
          : [])
        if (adjacent.status === 'fulfilled') setAdjacentBlogs({ slug, ...adjacent.value })
      },
      (requestError) => {
        if (active) setError(requestError.message || t('ব্লগটি পাওয়া যায়নি।'))
      },
    ).catch((requestError) => {
      if (active) setError(requestError.message || t('ব্লগটি পাওয়া যায়নি।'))
    }).finally(() => {
      if (active) setLoadedSlug(slug)
    })
    return () => { active = false }
  }, [slug, t])

  useEffect(() => {
    if (!blog) return
    document.title = `${blog.metaTitle || blog.title} | ${t('আহ্বান রক্তদান সংস্থা')}`
    let description = document.querySelector('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = blog.metaDescription || blog.shortDescription
    return () => { document.title = 'আহ্বান রক্তদান সংস্থা' }
  }, [blog, t])

  async function shareBlog(platform) {
    const url = window.location.href
    const title = blog.title
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    }
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(url)
        setShareNotice(t('লিংক কপি হয়েছে।'))
      } catch {
        setShareNotice(t('লিংক কপি করা যায়নি।'))
      }
      return
    }
    window.open(links[platform], '_blank', 'noopener,noreferrer')
  }

  if (loading) return <main className="blog-state blog-detail-state" role="status">{t('ব্লগ লোড হচ্ছে…')}</main>
  if (error || !blog) {
    return (
      <main className="blog-state blog-detail-state is-error" role="alert">
        <p>{t(error || 'ব্লগটি পাওয়া যায়নি।')}</p>
        <Link className="button button-secondary" to="/blog">{t('সব ব্লগ দেখুন')}</Link>
      </main>
    )
  }

  const currentAdjacentBlogs = adjacentBlogs.slug === slug ? adjacentBlogs : null

  return (
    <main className="blog-detail-page">
      <nav aria-label={t('ব্রেডক্রাম্ব')} className="blog-breadcrumb">
        <Link to="/">{t('হোম')}</Link><span aria-hidden="true">/</span><Link to="/blog">{t('ব্লগ')}</Link><span aria-hidden="true">/</span><span>{t(blog.category)}</span>
      </nav>
      <article className="blog-article">
        <header className="blog-article-header">
          <span className="blog-category-badge">{t(blog.category)}</span>
          <h1>{blog.title}</h1>
          <p className="blog-article-description">{blog.shortDescription}</p>
          <div className="blog-article-byline">
            <span className="blog-author-avatar" aria-hidden="true">{Array.from(blog.author.trim())[0]}</span>
            <span><strong>{blog.author}</strong><time dateTime={blog.publishAt}>{formatDate(blog.publishAt, language)}</time></span>
          </div>
        </header>
        <img alt={blog.title} className="blog-article-cover" src={blog.coverImage} />
        <div className="blog-article-layout">
          <BlogContent content={blog.content} />
          <aside aria-label={t('ব্লগ শেয়ার করুন')} className="blog-share">
            <span>{t('শেয়ার করুন')}</span>
            <button aria-label="Share on Facebook" onClick={() => shareBlog('facebook')} type="button">f</button>
            <button aria-label="Share on LinkedIn" onClick={() => shareBlog('linkedin')} type="button">in</button>
            <button aria-label="Share on WhatsApp" onClick={() => shareBlog('whatsapp')} type="button">↗</button>
            <button aria-label={t('লিংক কপি করুন')} onClick={() => shareBlog('copy')} type="button">⧉</button>
            {shareNotice && <small aria-live="polite">{shareNotice}</small>}
          </aside>
        </div>
      </article>
      {related.length > 0 && (
        <section aria-labelledby="related-blog-title" className="blog-related">
          <div className="blog-section-heading"><div><span className="blog-eyebrow">{t('আরও পড়ুন')}</span><h2 id="related-blog-title">{t('সম্পর্কিত ব্লগ')}</h2></div><Link to="/blog">{t('সব ব্লগ দেখুন')} →</Link></div>
          <div className="blog-grid">{related.map((item) => <BlogCard blog={item} key={item.id} />)}</div>
        </section>
      )}
      {(currentAdjacentBlogs?.previous || currentAdjacentBlogs?.next) && (
        <nav aria-label={t('ব্লগ নিবন্ধ নেভিগেশন')} className="blog-article-navigation">
          {currentAdjacentBlogs.previous ? (
            <Link className="blog-article-nav-card is-previous" to={`/blog/${encodeURIComponent(currentAdjacentBlogs.previous.slug)}`}>
              <span>{t('← পূর্ববর্তী')}</span>
              <strong>{currentAdjacentBlogs.previous.title}</strong>
            </Link>
          ) : <span aria-hidden="true" className="blog-article-nav-spacer" />}
          {currentAdjacentBlogs.next ? (
            <Link className="blog-article-nav-card is-next" to={`/blog/${encodeURIComponent(currentAdjacentBlogs.next.slug)}`}>
              <span>{t('পরবর্তী →')}</span>
              <strong>{currentAdjacentBlogs.next.title}</strong>
            </Link>
          ) : <span aria-hidden="true" className="blog-article-nav-spacer" />}
        </nav>
      )}
    </main>
  )
}

export default BlogDetailsPage
