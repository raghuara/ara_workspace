const loaders = []
let started = false

export const registerPage = (loader) => {
  loaders.push(loader)
}

export const preloadPages = () => {
  if (started) return
  started = true
  const queue = [...loaders]
  const next = () => {
    const loader = queue.shift()
    if (!loader) return
    loader()
      .catch(() => {})
      .finally(() => schedule(next))
  }
  const schedule = (job) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(job, { timeout: 2000 }) : setTimeout(job, 60)
  schedule(next)
}
