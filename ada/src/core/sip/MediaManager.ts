/**
 * Thin wrapper over `navigator.mediaDevices` to enumerate mics / speakers and
 * build a MediaStream for SIP.js.
 *
 * Must only be used from the Renderer (Node has no navigator.mediaDevices).
 */
export class MediaManager {
  async listInputs(): Promise<MediaDeviceInfo[]> {
    const all = await navigator.mediaDevices.enumerateDevices()
    return all.filter((d) => d.kind === 'audioinput')
  }

  async listOutputs(): Promise<MediaDeviceInfo[]> {
    const all = await navigator.mediaDevices.enumerateDevices()
    return all.filter((d) => d.kind === 'audiooutput')
  }

  async acquireMic(deviceId?: string): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false
    })
  }

  /** Route remote audio to a given output device using setSinkId (if supported). */
  async attachRemote(
    audioEl: HTMLAudioElement,
    stream: MediaStream,
    outputDeviceId?: string
  ): Promise<void> {
    audioEl.srcObject = stream
    if (outputDeviceId && typeof audioEl.setSinkId === 'function') {
      await audioEl.setSinkId(outputDeviceId)
    }
    await audioEl.play().catch(() => {
      // autoplay may be blocked until user gesture; caller should retry on click
    })
  }
}
