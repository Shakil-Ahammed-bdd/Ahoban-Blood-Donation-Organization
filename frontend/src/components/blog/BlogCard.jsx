import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/useLanguage'
import { responsiveImageProps } from '../../utils/responsiveImage'

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function BlogCard({ blog, featured = false }) {
  const { t, language } = useLanguage()
  return (
    <article className={`blog-card${featured ? ' blog-card-featured' : ''}`}>
      <Link aria-label={blog.title} className="blog-card-cover" to={`/blog/${encodeURIComponent(blog.slug)}`}>
        <img alt={blog.title} decoding="async" loading="lazy" {...responsiveImageProps(blog.coverImage, [480, 800, 1200], '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw')} />
        <span className="blog-category-badge">{t(blog.category)}</span>
      </Link>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span>{blog.author}</span>
          <time dateTime={blog.publishAt}>{formatDate(blog.publishAt, language)}</time>
        </div>
        <h3><Link to={`/blog/${encodeURIComponent(blog.slug)}`}>{blog.title}</Link></h3>
        <p>{blog.shortDescription}</p>
        <Link className="blog-read-more" to={`/blog/${encodeURIComponent(blog.slug)}`}>
          {t('বিস্তারিত পড়ুন')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

export default BlogCard
