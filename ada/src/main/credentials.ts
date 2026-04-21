import keytar from 'keytar'

/**
 * Credential storage backed by the OS keychain:
 *   - Windows: Windows Credential Vault
 *   - Linux:   libsecret / gnome-keyring
 *
 * On Linux servers without a keyring daemon, keytar will throw; callers must
 * be prepared to fall back to an encrypted file (not yet implemented).
 */
export async function saveCredential(
  service: string,
  account: string,
  password: string
): Promise<void> {
  await keytar.setPassword(service, account, password)
}

export async function loadCredential(
  service: string,
  account: string
): Promise<string | null> {
  return keytar.getPassword(service, account)
}

export async function removeCredential(
  service: string,
  account: string
): Promise<boolean> {
  return keytar.deletePassword(service, account)
}
