const CLOUDINARY_HOST = 'res.cloudinary.com'

export function responsiveImageProps(source, widths, sizes) {
  if (typeof source !== 'string' || !source.startsWith('https://')) return { src: source }

  let url
  try {
    url = new URL(source)
  } catch {
    return { src: source }
  }
  if (url.hostname !== CLOUDINARY_HOST || !url.pathname.includes('/image/upload/')) {
    return { src: source }
  }

  const transform = (width) => source.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
  )
  return {
    src: transform(widths.at(-1)),
    srcSet: widths.map((width) => `${transform(width)} ${width}w`).join(', '),
    sizes,
  }
}
