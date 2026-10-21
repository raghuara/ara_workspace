let paused = false
const queued = new Map()

export const pauseRealtime = () => {
  paused = true
}

export const resumeRealtime = () => {
  paused = false
  const jobs = [...queued.values()]
  queued.clear()
  jobs.forEach((job) => job())
}

export const runWhenIdle = (key, job) => {
  if (paused) {
    queued.set(key, job)
    return
  }
  job()
}
