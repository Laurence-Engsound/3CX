import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
// Minimal RFC 6455 WebSocket server inline (avoids `ws` dep for sandbox portability).
// In production, swap to `ws` package or `@fastify/websocket` for richer features.
import { randomUUID, createHash } from 'node:crypto'
import type { ThreeCXCall, ThreeCXEventEnvelope, ThreeCXUser } from '../src/vendor/types.js'

export interface MockServerState {
  calls: Map<string, ThreeCXCall>
  users: Map<string, ThreeCXUser>
}

export class Mock3CXServer {
  private server: Server | undefined
  private port = 0
  private clients = new Set<{ socket: any; send: (data: string) => void }>()
  private seq = 0
  public state: MockServerState = {
    calls: new Map(),
    users: new Map(),
  }

  async start(port = 0): Promise<{ baseUrl: string; wsUrl: string }> {
    this.server = createServer((req, res) => this.handleHttp(req, res))
    this.server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head))

    return new Promise((resolve) => {
      this.server!.listen(port, '127.0.0.1', () => {
        const addr = this.server!.address()
        if (addr && typeof addr === 'object') {
          this.port = addr.port
        }
        resolve({
          baseUrl: `http://127.0.0.1:${this.port}`,
          wsUrl: `ws://127.0.0.1:${this.port}/events`,
        })
      })
    })
  }

  async stop(): Promise<void> {
    for (const c of this.clients) {
      try { c.socket.destroy() } catch {}
    }
    this.clients.clear()
    return new Promise((resolve, reject) => {
      this.server!.close((err) => err ? reject(err) : resolve())
    })
  }

  /** Inject a call into mock state. */
  seedCall(call: Partial<ThreeCXCall>): ThreeCXCall {
    const full: ThreeCXCall = {
      callId: call.callId ?? randomUUID(),
      type: call.type ?? 'Inbound',
      callerNumber: call.callerNumber ?? '0912345678',
      dialedNumber: call.dialedNumber ?? '5000',
      state: call.state ?? 'Ringing',
      startTime: call.startTime ?? new Date().toISOString(),
      ...call,
    }
    this.state.calls.set(full.callId, full)
    return full
  }

  /** Inject a user. */
  seedUser(user: Partial<ThreeCXUser>): ThreeCXUser {
    const full: ThreeCXUser = {
      extension: user.extension ?? '101',
      firstName: user.firstName ?? 'Test',
      lastName: user.lastName ?? 'Agent',
      groupIds: user.groupIds ?? [],
      presence: user.presence ?? 'Available',
      loggedIn: user.loggedIn ?? true,
      ...user,
    }
    this.state.users.set(full.extension, full)
    return full
  }

  /** Push an event to all connected WS clients. */
  pushEvent(event: string, data: Record<string, unknown>, timestamp?: string): void {
    this.seq++
    const envelope: ThreeCXEventEnvelope = {
      event,
      timestamp: timestamp ?? new Date().toISOString(),
      seq: this.seq,
      data,
    }
    const payload = JSON.stringify(envelope)
    for (const c of this.clients) {
      try { c.send(payload) } catch {}
    }
  }

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    const auth = req.headers['authorization']
    if (!auth || !auth.startsWith('Bearer ')) {
      this.json(res, 401, { error: 'unauthorized' })
      return
    }

    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname
    const method = req.method ?? 'GET'

    // Routing
    if (method === 'GET' && path === '/api/v1/ping') {
      return this.json(res, 200, { ok: true })
    }
    if (method === 'GET' && path === '/api/v1/calls') {
      return this.json(res, 200, [...this.state.calls.values()])
    }
    if (method === 'GET' && path === '/api/v1/users') {
      return this.json(res, 200, [...this.state.users.values()])
    }
    const callMatch = path.match(/^\/api\/v1\/calls\/([^/]+)$/)
    if (method === 'GET' && callMatch) {
      const id = decodeURIComponent(callMatch[1]!)
      const call = this.state.calls.get(id)
      return call ? this.json(res, 200, call) : this.json(res, 404, { error: 'not_found' })
    }
    if (method === 'POST' && path === '/api/v1/calls') {
      return this.readBody(req, (body) => {
        const params = JSON.parse(body) as { from: string; to: string }
        const callId = randomUUID()
        const newCall = this.seedCall({
          callId, type: 'Outbound',
          callerNumber: params.from, dialedNumber: params.to,
          state: 'Routing',
        })
        this.pushEvent('call.started', { callId: newCall.callId })
        this.json(res, 201, { callId })
      })
    }
    const transferMatch = path.match(/^\/api\/v1\/calls\/([^/]+)\/transfer$/)
    if (method === 'POST' && transferMatch) {
      return this.readBody(req, (body) => {
        const id = decodeURIComponent(transferMatch[1]!)
        const target = (JSON.parse(body) as { target: string }).target
        const call = this.state.calls.get(id)
        if (!call) return this.json(res, 404, { error: 'not_found' })
        call.assignedExtension = target
        call.state = 'Transferring'
        this.pushEvent('call.transferred', { callId: id, target })
        this.json(res, 204, {})
      })
    }
    const hangupMatch = path.match(/^\/api\/v1\/calls\/([^/]+)\/hangup$/)
    if (method === 'POST' && hangupMatch) {
      const id = decodeURIComponent(hangupMatch[1]!)
      const call = this.state.calls.get(id)
      if (!call) return this.json(res, 404, { error: 'not_found' })
      call.state = 'Disconnected'
      call.endTime = new Date().toISOString()
      this.pushEvent('call.ended', { callId: id })
      return this.json(res, 204, {})
    }

    this.json(res, 404, { error: 'not_found', path })
  }

  /** Minimal RFC 6455 WebSocket server upgrade handler — sandbox-portable. */
  private handleUpgrade(req: IncomingMessage, socket: any, _head: Buffer): void {
    const key = req.headers['sec-websocket-key']
    if (!key) { socket.destroy(); return }
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n')
    socket.write(headers)

    const send = (data: string): void => {
      const payload = Buffer.from(data, 'utf8')
      const len = payload.length
      let frame: Buffer
      if (len < 126) {
        frame = Buffer.alloc(2 + len)
        frame[0] = 0x81  // FIN + text frame
        frame[1] = len
        payload.copy(frame, 2)
      } else if (len < 65536) {
        frame = Buffer.alloc(4 + len)
        frame[0] = 0x81
        frame[1] = 126
        frame.writeUInt16BE(len, 2)
        payload.copy(frame, 4)
      } else {
        frame = Buffer.alloc(10 + len)
        frame[0] = 0x81
        frame[1] = 127
        frame.writeBigUInt64BE(BigInt(len), 2)
        payload.copy(frame, 10)
      }
      socket.write(frame)
    }

    const client = { socket, send }
    this.clients.add(client)
    socket.on('close', () => { this.clients.delete(client) })
    socket.on('error', () => { this.clients.delete(client) })

    // Handle inbound frames — minimal: just look for close opcode (0x8) and echo back
    socket.on('data', (chunk: Buffer) => {
      // First byte: FIN + opcode. Opcode 0x8 = close
      if (chunk.length >= 2 && (chunk[0] & 0x0f) === 0x8) {
        // Echo close frame back
        try {
          socket.write(Buffer.from([0x88, 0x00]))
          socket.end()
        } catch {}
        this.clients.delete(client)
      }
    })
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(status === 204 ? '' : JSON.stringify(body))
  }

  private readBody(req: IncomingMessage, cb: (body: string) => void): void {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => cb(Buffer.concat(chunks).toString('utf8')))
  }
}
