// SHA-256 of the file as the user picked it: the same photo gives the same hash on every machine, unlike the canvas output.
export const sha256Hex = async (blob: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
