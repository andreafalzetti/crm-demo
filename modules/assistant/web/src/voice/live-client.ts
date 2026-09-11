import { createVoiceSession, runVoiceTool } from "../api"
import type { Confirmation, VoiceStatus, VoiceToolRun } from "../types"
import {
  confirmationFromToolResult,
  parseFunctionCallArguments,
} from "./live-protocol"

// Minimal GPT-Live WebRTC client. The browser owns the media and executes the
// function calls the hosted backend hands back, but every call is authorized
// and validated by PocketBase with the user's own session.

type FunctionCallItem = {
  type?: string
  call_id?: string
  name?: string
  arguments?: string
}

type NestedResponseEvent = {
  type?: string
  item?: FunctionCallItem
}

type LiveEvent = {
  type?: string
  session?: { id?: string }
  delta?: string
  usage?: unknown
  error?: { message?: string }
  event?: NestedResponseEvent
}

export type VoiceHandlers = {
  onStatus: (status: VoiceStatus, detail?: string) => void
  onTranscript: (role: "user" | "assistant", delta: string) => void
  onTool: (run: VoiceToolRun) => void
  onConfirmation: (confirmation: Confirmation) => void
}

export class VoiceSession {
  private peer?: RTCPeerConnection
  private channel?: RTCDataChannel
  private microphone?: MediaStream
  private closeTimeout?: number
  private sessionId = ""
  private finalized = false

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly handlers: VoiceHandlers
  ) {}

  get id() {
    return this.sessionId
  }

  async start() {
    this.finalized = false
    this.handlers.onStatus("connecting")
    const connection = new RTCPeerConnection()
    this.peer = connection
    connection.addEventListener("track", (event) => {
      this.audio.srcObject = new MediaStream([event.track])
      void this.audio.play().catch(() => undefined)
    })

    this.microphone = await navigator.mediaDevices.getUserMedia({
      audio: true,
    })
    for (const track of this.microphone.getAudioTracks()) {
      connection.addTrack(track, this.microphone)
    }

    // The event channel must exist before the SDP offer is created.
    const channel = connection.createDataChannel("oai-events")
    this.channel = channel
    channel.addEventListener("message", (event) => {
      this.handleMessage(event)
    })
    channel.addEventListener("close", () => {
      if (this.finalized) return
      this.cleanup()
      this.handlers.onStatus("closed", "Connessione chiusa.")
    })

    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    await waitForIceGathering(connection)
    const sdp = connection.localDescription?.sdp
    if (!sdp) throw new Error("Impossibile creare l'offerta WebRTC.")

    const credentials = await createVoiceSession(sdp)
    this.sessionId = credentials.sessionId
    await connection.setRemoteDescription({
      type: "answer",
      sdp: credentials.sdp,
    })
  }

  async close() {
    if (this.channel?.readyState === "open") {
      this.send({ type: "session.close" })
      this.closeTimeout = window.setTimeout(() => {
        this.finalized = true
        this.cleanup()
        this.handlers.onStatus(
          "closed",
          "Chiusura incompleta: nessun evento finale."
        )
      }, 15_000)
      return
    }
    this.finalized = true
    this.cleanup()
    this.handlers.onStatus("closed", "Chiamata conclusa.")
  }

  sendThinking(content: string) {
    this.send({
      type: "session.thinking.append",
      delegation_id: null,
      content,
    })
  }

  private handleMessage(message: MessageEvent<string>) {
    let payload: LiveEvent
    try {
      payload = JSON.parse(message.data) as LiveEvent
    } catch {
      return
    }
    this.handleLiveEvent(payload)
  }

  private handleLiveEvent(payload: LiveEvent) {
    switch (payload.type) {
      case "session.started":
        if (payload.session?.id) this.sessionId = payload.session.id
        this.handlers.onStatus("active")
        return
      case "session.closed":
        this.finalized = true
        this.cleanup()
        this.handlers.onStatus("closed", "Chiamata conclusa.")
        return
      case "session.input_transcript.delta":
        if (payload.delta) this.handlers.onTranscript("user", payload.delta)
        return
      case "session.output_transcript.delta":
        if (payload.delta)
          this.handlers.onTranscript("assistant", payload.delta)
        return
      case "response.event":
        this.handleNestedEvent(payload.event)
        return
      case "error":
        this.handlers.onStatus("error", payload.error?.message)
        return
      default:
        return
    }
  }

  private handleNestedEvent(event?: NestedResponseEvent) {
    if (event?.type !== "response.output_item.done") return
    const item = event.item
    if (item?.type !== "function_call") return
    void this.runFunction(item)
  }

  private async runFunction(item: FunctionCallItem) {
    const callId = item.call_id
    const name = item.name
    if (!callId || !name) return
    const runId = crypto.randomUUID()
    this.handlers.onTool({ id: runId, name, phase: "start" })

    let output: unknown
    try {
      const args = parseFunctionCallArguments(item.arguments)
      const response = await runVoiceTool(this.sessionId, name, args)
      output = response.result
      const confirmation = confirmationFromToolResult(output)
      if (confirmation) this.handlers.onConfirmation(confirmation)
      this.handlers.onTool({ id: runId, name, phase: "done", result: output })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Strumento non riuscito."
      output = { error: message }
      this.handlers.onTool({ id: runId, name, phase: "done", error: message })
    }

    this.send({
      type: "response.item.create",
      event_id: crypto.randomUUID(),
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    })
    this.send({ type: "response.create", event_id: crypto.randomUUID() })
  }

  private send(payload: Record<string, unknown>) {
    if (this.channel?.readyState !== "open") return
    const event = { event_id: crypto.randomUUID(), ...payload }
    this.channel.send(JSON.stringify(event))
  }

  private cleanup() {
    window.clearTimeout(this.closeTimeout)
    this.closeTimeout = undefined
    this.microphone?.getTracks().forEach((track) => track.stop())
    this.microphone = undefined
    if (this.channel) {
      this.channel.close()
      this.channel = undefined
    }
    if (this.peer) {
      this.peer.close()
      this.peer = undefined
    }
    this.audio.srcObject = null
  }
}

function waitForIceGathering(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", onState)
      reject(new Error("Timeout durante la raccolta dei candidati ICE."))
    }, 10_000)
    function onState() {
      if (connection.iceGatheringState !== "complete") return
      window.clearTimeout(timeout)
      connection.removeEventListener("icegatheringstatechange", onState)
      resolve()
    }
    connection.addEventListener("icegatheringstatechange", onState)
    onState()
  })
}
