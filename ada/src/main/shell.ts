import { shell } from 'electron'

/**
 * Open a URL in the OS default browser.
 *
 * Used for Screen Pop. We validate the scheme is http/https so the template
 * engine can't be abused into launching arbitrary protocols.
 */
export async function openExternalUrl(url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Refused to open non-http(s) URL: ${parsed.protocol}`)
  }

  await shell.openExternal(parsed.toString())
}
