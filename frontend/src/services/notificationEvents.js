function messageForMutation(path, method) {
  if (path === '/auth/login') return 'লগ ইন সফল হয়েছে। স্বাগতম!'
  if (path === '/auth/register') return 'নিবন্ধন সফল হয়েছে।'
  if (path === '/auth/logout') return 'লগ আউট সফল হয়েছে।'
  if (path === '/users/profile' && method === 'DELETE') return 'অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।'
  if (path === '/users/profile') return 'প্রোফাইল সফলভাবে হালনাগাদ হয়েছে।'
  if (path === '/users/profile/photo') return 'প্রোফাইল ছবি সফলভাবে হালনাগাদ হয়েছে।'
  if (path === '/users/profile/donation-history') return 'রক্তদানের তথ্য সফলভাবে যোগ হয়েছে।'
  if (/^\/users\/profile\/donation-history\/[^/]+$/.test(path)) return 'রক্তদানের তথ্য সফলভাবে মুছে ফেলা হয়েছে।'
  if (path === '/blood-requests') return 'রক্তের আবেদন সফলভাবে জমা হয়েছে।'
  if (/^\/blood-requests\/[^/]+\/status$/.test(path)) return 'আবেদনের অবস্থা সফলভাবে হালনাগাদ হয়েছে।'
  if (/^\/admins\/blood-requests\/[^/]+\/(?:moderate|status|fulfill)$/.test(path)) {
    return 'আবেদনের অবস্থা সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (/^\/admins\/experiences\/[^/]+\/approve$/.test(path)) return 'অনুভূতিটি অনুমোদন করা হয়েছে।'
  if (/^\/admins\/experiences\/[^/]+\/reject$/.test(path)) return 'অনুভূতিটি প্রত্যাখ্যান করা হয়েছে।'
  if (path === '/admins/blogs/categories') {
    return method === 'POST' ? 'বিভাগ সফলভাবে তৈরি হয়েছে।' : 'বিভাগ সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (/^\/admins\/blogs\/categories\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'বিভাগ সফলভাবে মুছে ফেলা হয়েছে।' : 'বিভাগ সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (path === '/admins/blogs') return 'ব্লগ সফলভাবে তৈরি হয়েছে।'
  if (/^\/admins\/blogs\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'ব্লগ সফলভাবে মুছে ফেলা হয়েছে।' : 'ব্লগ সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (path === '/admins') return 'প্রশাসক অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।'
  if (/^\/admins\/[^/]+$/.test(path)) {
    return method === 'DELETE'
      ? 'প্রশাসক অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।'
      : 'প্রশাসক অ্যাকাউন্ট সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (/^\/experiences\/[^/]+\/reactions$/.test(path)) return 'প্রতিক্রিয়া সফলভাবে সংরক্ষিত হয়েছে।'
  if (/^\/experiences\/[^/]+\/comments$/.test(path)) return 'মন্তব্য সফলভাবে পাঠানো হয়েছে।'
  if (/^\/comments\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'মন্তব্য সফলভাবে মুছে ফেলা হয়েছে।' : 'মন্তব্য সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (path === '/experiences') return 'অনুভূতি সফলভাবে জমা হয়েছে।'
  if (/^\/experiences\/[^/]+$/.test(path)) {
    return method === 'DELETE' ? 'অনুভূতি সফলভাবে মুছে ফেলা হয়েছে।' : 'অনুভূতি সফলভাবে হালনাগাদ হয়েছে।'
  }
  if (/^\/notifications\/(?:read-all|[^/]+\/read)$/.test(path)) return 'নোটিফিকেশন সফলভাবে হালনাগাদ হয়েছে।'
  return 'পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে।'
}

function emit(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:notification', { detail }))
  }
}

export function notifyMutationSuccess(path, method) {
  const cleanPath = path.split('?')[0]
  emit({ type: 'success', title: 'সফল', message: messageForMutation(cleanPath, method) })
}

export function notifyMutationFailure(message, type = 'error') {
  emit({
    type,
    title: type === 'warning' ? 'সতর্কতা' : 'ত্রুটি',
    message: message || 'দুঃখিত, কাজটি সম্পন্ন করা যায়নি।',
  })
}

export function notifyUserNotification(notification) {
  emit(notification)
}
