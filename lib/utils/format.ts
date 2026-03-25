export function formatStudentName(name: string): string {
  // Title-case each word so stored names like "cuttingvictor L." display as "Cuttingvictor L."
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatFileCount(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

export function slugifySpeakerName(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
}
