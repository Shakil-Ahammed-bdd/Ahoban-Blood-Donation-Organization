import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { experienceApi } from '../../services/api/experienceApi'
import { useLanguage } from '../../contexts/useLanguage'
import { translateErrorMessage } from '../../contexts/translationUtils'

function formatDate(value, options = { dateStyle: 'medium' }, language = 'bn') {
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', options).format(new Date(value))
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('')
}

function Avatar({ name, url, className = '' }) {
  return (
    <span aria-hidden="true" className={`experience-avatar ${className}`}>
      {url ? <img alt="" loading="lazy" src={url} /> : initials(name)}
    </span>
  )
}

function DonorExperienceCard({ experience, owner = false, onEdit, onDelete }) {
  const { status: authStatus, user } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [activeImage, setActiveImage] = useState(null)
  const [showFullMessage, setShowFullMessage] = useState(false)
  const [reactionCount, setReactionCount] = useState(experience.reactionCount || 0)
  const [currentReaction, setCurrentReaction] = useState(experience.currentReaction || null)
  const [commentCount, setCommentCount] = useState(experience.commentCount || 0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [commentPages, setCommentPages] = useState(0)
  const [commentPage, setCommentPage] = useState(0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const [reactionSaving, setReactionSaving] = useState(false)
  const [socialActionError, setSocialActionError] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [commentActionError, setCommentActionError] = useState('')
  const images = experience.images?.length ? experience.images : [experience.photoUrl].filter(Boolean)
  const longMessage = experience.message.length > 260
  const visibleMessage = longMessage && !showFullMessage
    ? `${experience.message.slice(0, 260).trimEnd()}…`
    : experience.message

  useEffect(() => {
    if (activeImage === null) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') setActiveImage(null)
      if (event.key === 'ArrowLeft') {
        setActiveImage((index) => (index - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight') {
        setActiveImage((index) => (index + 1) % images.length)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeImage, images.length])

  async function loadComments(page = 1) {
    setCommentsLoading(true)
    setCommentsError('')
    try {
      const result = await experienceApi.comments(experience.id, { page, limit: 5 })
      setComments((current) => page === 1 ? result.comments : [...current, ...result.comments])
      setCommentPages(result.pagination.pages)
      setCommentPage(page)
    } catch (error) {
      setCommentsError(translateErrorMessage(error, t))
    } finally {
      setCommentsLoading(false)
    }
  }

  async function toggleComments() {
    const nextOpen = !commentsOpen
    setCommentsOpen(nextOpen)
    if (nextOpen && commentPage === 0) await loadComments()
  }

  async function toggleReaction() {
    if (authStatus !== 'authenticated') {
      navigate('/login', { state: { message: t('প্রতিক্রিয়া জানাতে আগে লগ ইন করুন।') } })
      return
    }
    if (reactionSaving) return
    setReactionSaving(true)
    setSocialActionError('')
    try {
      const result = currentReaction === 'love'
        ? await experienceApi.unreact(experience.id)
        : await experienceApi.react(experience.id, 'love')
      setReactionCount(result.count)
      setCurrentReaction(result.currentReaction)
    } catch (error) {
      setSocialActionError(translateErrorMessage(error, t))
    } finally {
      setReactionSaving(false)
    }
  }

  async function submitComment(event) {
    event.preventDefault()
    if (authStatus !== 'authenticated') {
      navigate('/login', { state: { message: t('মন্তব্য করতে আগে লগ ইন করুন।') } })
      return
    }
    const content = commentText.trim()
    if (!content || commentSaving) return
    setCommentSaving(true)
    setCommentActionError('')
    try {
      const result = await experienceApi.createComment(experience.id, content)
      setComments((current) => [...current, result.comment])
      setCommentCount((count) => count + 1)
      setCommentText('')
      setCommentPage(1)
      setCommentPages(Math.max(1, commentPages))
    } catch (error) {
      setCommentActionError(translateErrorMessage(error, t))
    } finally {
      setCommentSaving(false)
    }
  }

  async function saveComment(comment) {
    const content = editingCommentText.trim()
    if (!content) return
    setCommentActionError('')
    try {
      const { comment: result } = await experienceApi.updateComment(comment.id, content)
      setComments((current) => current.map((item) => item.id === comment.id ? result : item))
      setEditingCommentId(null)
    } catch (error) {
      setCommentActionError(translateErrorMessage(error, t))
    }
  }

  async function deleteComment(comment) {
    if (!window.confirm(t('এই মন্তব্যটি মুছে ফেলবেন?'))) return
    setCommentActionError('')
    try {
      await experienceApi.deleteComment(comment.id)
      setComments((current) => current.filter((item) => item.id !== comment.id))
      setCommentCount((count) => Math.max(0, count - 1))
    } catch (error) {
      setCommentActionError(translateErrorMessage(error, t))
    }
  }

  return (
    <>
      <article className={`experience-card${owner ? ' experience-card-owner' : ''}`}>
        <header className="experience-post-header">
          <Link
            aria-label={t('পাবলিক প্রোফাইল: {name}', { name: experience.donorName })}
            className="experience-author-link"
            to={`/donors/${encodeURIComponent(experience.donorId || experience.publicUserId)}`}
          >
            <Avatar className="experience-post-avatar" name={experience.donorName} url={experience.profilePhotoUrl} />
            <span className="experience-author-copy">
              <strong>{experience.donorName}</strong>
              <span>{experience.bloodGroup} <span aria-hidden="true">•</span> {experience.division}, {experience.district}{experience.location ? ` · ${experience.location}` : ''}</span>
              <time dateTime={experience.createdAt}>{formatDate(experience.createdAt)}</time>
            </span>
          </Link>
          {owner && <span className={`experience-status is-${experience.status}`}>{t(experience.status === 'pending' ? 'অনুমোদনের অপেক্ষায়' : experience.status === 'approved' ? 'প্রকাশিত' : 'অনুমোদিত হয়নি')}</span>}
        </header>
        <div className={`experience-gallery experience-gallery-count-${Math.min(images.length, 5)}`}>
          {images.slice(0, 4).map((image, index) => (
            <button
              aria-label={t('ছবি {number} / {total} দেখুন', { number: index + 1, total: images.length })}
              className={`experience-gallery-image${index === 0 ? ' is-cover' : ''}${index === 3 && images.length > 4 ? ' has-more' : ''}`}
              key={`${image}-${index}`}
              onClick={() => setActiveImage(index)}
              type="button"
            >
              <img alt={t('দাতার রক্তদানের ছবি {number}', { number: index + 1 })} loading={index > 0 ? 'lazy' : 'eager'} src={image} />
              {index === 3 && images.length > 4 && <span>+{images.length - 4}</span>}
            </button>
          ))}
        </div>
        <div className="experience-card-content">
          <blockquote>{visibleMessage}</blockquote>
          {longMessage && (
            <button className="experience-read-more" onClick={() => setShowFullMessage(true)} type="button">
              {t('আরও পড়ুন')}
            </button>
          )}
          <div className="experience-card-meta">
            <span>🗓 {t('রক্তদানের তারিখ:')} {formatDate(experience.donationDate, { dateStyle: 'medium' }, language)}</span>
            {experience.donationCount && <span>🩸 {experience.donationCount} {t('বার')}</span>}
          </div>
          {experience.status === 'approved' && (
            <div className="experience-social-summary">
              <span aria-label={`${reactionCount} ${t('প্রতিক্রিয়া')}`}>❤️ {reactionCount} {t('প্রতিক্রিয়া')}</span>
              <button aria-label={t('{count}টি মন্তব্য দেখুন', { count: commentCount })} onClick={toggleComments} type="button">
                💬 {commentCount} {t('মন্তব্য')}
              </button>
            </div>
          )}
          {experience.status === 'approved' && (
            <div className="experience-social-actions">
              <button
                aria-pressed={currentReaction === 'love'}
                className={currentReaction === 'love' ? 'is-reacted' : ''}
                disabled={reactionSaving}
                onClick={toggleReaction}
                type="button"
              >
                ❤️ {currentReaction === 'love' ? t('ভালোবাসা জানিয়েছেন') : t('প্রতিক্রিয়া জানান')}
              </button>
              <button aria-expanded={commentsOpen} onClick={toggleComments} type="button">💬 {t('মন্তব্য করুন')}</button>
            </div>
          )}
          {socialActionError &&           <p className="experience-comment-error" role="alert">{t(socialActionError)}</p>}
          {commentsOpen && experience.status === 'approved' && (
            <section aria-label={t('{name} এর পোস্টের মন্তব্য', { name: experience.donorName })} className="experience-comments">
              {commentsLoading && <p className="experience-comment-state" role="status">{t('মন্তব্য লোড হচ্ছে…')}</p>}
              {commentsError && <p className="experience-comment-error" role="alert">{t(commentsError)}</p>}
              {!commentsLoading && !commentsError && comments.length === 0 && (
                <p className="experience-comment-state">{t('এখনও কোনো মন্তব্য নেই।')}</p>
              )}
              <div className="experience-comment-list">
                {comments.map((comment) => (
                  <article className="experience-comment" key={comment.id}>
                    <Link
                      aria-label={t('পাবলিক প্রোফাইল: {name}', { name: comment.author.fullName })}
                      className="experience-comment-author"
                      to={`/donors/${encodeURIComponent(comment.author.id || comment.author.userId)}`}
                    >
                      <Avatar className="experience-comment-avatar" name={comment.author.fullName} url={comment.author.profilePhotoUrl} />
                    </Link>
                    <div className="experience-comment-body">
                      <Link className="experience-comment-name" to={`/donors/${encodeURIComponent(comment.author.id || comment.author.userId)}`}>
                        {comment.author.fullName}
                      </Link>
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt, { dateStyle: 'medium', timeStyle: 'short' }, language)}</time>
                      {editingCommentId === comment.id ? (
                        <div className="experience-comment-edit">
                          <textarea aria-label={t('মন্তব্য সম্পাদনা')} maxLength={1000} onChange={(event) => setEditingCommentText(event.target.value)} value={editingCommentText} />
                          <button onClick={() => saveComment(comment)} type="button">{t('সংরক্ষণ')}</button>
                          <button onClick={() => setEditingCommentId(null)} type="button">{t('বাতিল')}</button>
                        </div>
                      ) : <p>{comment.content}</p>}
                    </div>
                    {user?.id === comment.author.id && editingCommentId !== comment.id && (
                      <div className="experience-comment-actions">
                        <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content) }} type="button">{t('সম্পাদনা')}</button>
                        <button onClick={() => deleteComment(comment)} type="button">{t('মুছুন')}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {commentPage < commentPages && (
                <button className="experience-comments-more" disabled={commentsLoading} onClick={() => loadComments(commentPage + 1)} type="button">
                  {t('আরও কমেন্ট দেখুন')}
                </button>
              )}
              {commentActionError && <p className="experience-comment-error" role="alert">{t(commentActionError)}</p>}
              {authStatus === 'authenticated' ? (
                <form className="experience-comment-form" onSubmit={submitComment}>
                  <Avatar className="experience-comment-avatar" name={user.fullName} url={user.profilePhotoUrl} />
                  <label className="visually-hidden" htmlFor={`experience-comment-${experience.id}`}>{t('আপনার মন্তব্য')}</label>
                  <textarea
                    id={`experience-comment-${experience.id}`}
                    maxLength={1000}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder={t('একটি মন্তব্য লিখুন…')}
                    required
                    rows={2}
                    value={commentText}
                  />
                  <button disabled={commentSaving || !commentText.trim()} type="submit">{commentSaving ? t('পাঠানো হচ্ছে…') : t('পাঠান')}</button>
                </form>
              ) : (
                <p className="experience-comment-login">
                  {t('মন্তব্য করতে')} <Link to="/login">{t('লগ ইন করুন')}</Link>
                </p>
              )}
            </section>
          )}
          {owner && (
            <div className="experience-owner-actions">
              <button onClick={() => onEdit(experience)} type="button">{t('সম্পাদনা')}</button>
              <button onClick={() => onDelete(experience)} type="button">{t('মুছে ফেলুন')}</button>
            </div>
          )}
        </div>
      </article>
      {activeImage !== null && (
        <div className="experience-lightbox" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveImage(null)
        }}>
          <section aria-label={t('দাতার ছবির গ্যালারি')} aria-modal="true" className="experience-lightbox-content" role="dialog">
            <button aria-label={t('বন্ধ করুন')} className="experience-lightbox-close" onClick={() => setActiveImage(null)} type="button">×</button>
            <button aria-label={t('আগের ছবি')} className="experience-lightbox-previous" disabled={images.length < 2} onClick={() => setActiveImage((index) => (index - 1 + images.length) % images.length)} type="button">‹</button>
            <img alt={t('দাতার ছবি {number}', { number: activeImage + 1 })} src={images[activeImage]} />
            <button aria-label={t('পরের ছবি')} className="experience-lightbox-next" disabled={images.length < 2} onClick={() => setActiveImage((index) => (index + 1) % images.length)} type="button">›</button>
            <p>{activeImage + 1} / {images.length}</p>
          </section>
        </div>
      )}
      {showFullMessage && (
        <div className="experience-lightbox" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowFullMessage(false)
        }}>
          <section aria-labelledby={`experience-message-${experience.id}`} aria-modal="true" className="experience-message-modal" role="dialog">
            <button aria-label={t('বন্ধ করুন')} className="experience-lightbox-close" onClick={() => setShowFullMessage(false)} type="button">×</button>
            <h2 id={`experience-message-${experience.id}`}>{experience.donorName} - {t('রক্তদানের অনুভূতি')}</h2>
            <p>{experience.message}</p>
          </section>
        </div>
      )}
    </>
  )
}

export default DonorExperienceCard
