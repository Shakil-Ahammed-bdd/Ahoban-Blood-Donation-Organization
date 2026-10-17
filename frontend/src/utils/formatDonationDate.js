export function formatDonationDate(value, language = 'bn') {
  if (!value) return language === 'bn' ? 'কোনো পূর্ববর্তী রক্তদানের তারিখ দেওয়া হয়নি' : 'No previous donation date provided'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return language === 'bn' ? 'তারিখ উপলভ্য নয়' : 'Date unavailable'
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

export function dateInputValue(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}
