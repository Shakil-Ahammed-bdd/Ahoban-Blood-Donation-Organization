export function requestCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('এই ব্রাউজারে অবস্থান সেবা সমর্থিত নয়।'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => {
        const messages = {
          1: 'অবস্থানের অনুমতি দেওয়া হয়নি। চাইলে সেটিংস থেকে অনুমতি দিয়ে আবার চেষ্টা করুন।',
          2: 'বর্তমান অবস্থান পাওয়া যায়নি। আবার চেষ্টা করুন বা ঠিকানাটি লিখুন।',
          3: 'অবস্থান পেতে সময় শেষ হয়েছে। আবার চেষ্টা করুন।',
        }
        reject(new Error(messages[error.code] || 'বর্তমান অবস্থান পাওয়া যায়নি।'))
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    )
  })
}
