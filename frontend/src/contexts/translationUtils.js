export function translateErrorMessage(error, t) {
  if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') {
    return t('অনুগ্রহ করে প্রথমে লগ ইন করুন।')
  }
  if (error?.code === 'DATABASE_UNAVAILABLE' || error?.status >= 500) {
    return t('সেবা সাময়িকভাবে পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।')
  }
  if (error?.code === 'EMAIL_ALREADY_REGISTERED') return t('এই ইমেইল দিয়ে ইতোমধ্যে অ্যাকাউন্ট খোলা হয়েছে।')
  if (error?.code === 'INVALID_CREDENTIALS') return t('ইমেইল/User ID অথবা পাসওয়ার্ড সঠিক নয়।')
  if (error?.code === 'VALIDATION_ERROR') return t('তথ্যগুলো যাচাই করে আবার চেষ্টা করুন।')
  const translated = t(error?.message || '')
  return translated === (error?.message || '')
    ? t('অনুরোধটি সম্পন্ন করা যায়নি। তথ্যগুলো যাচাই করে আবার চেষ্টা করুন।')
    : translated
}
