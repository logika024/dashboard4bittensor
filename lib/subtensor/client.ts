import { ApiPromise, WsProvider } from "@polkadot/api"
import { getSubtensorWsUrl } from "@/lib/subtensor/config"

export class SubtensorError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "SubtensorError"
  }
}

/** Open a Finney websocket, run `fn`, then disconnect. One connection per call. */
export async function withSubtensorApi<T>(
  fn: (api: ApiPromise) => Promise<T>,
): Promise<T> {
  const provider = new WsProvider(getSubtensorWsUrl())
  const api = await ApiPromise.create({ provider })

  try {
    await api.isReady
    return await fn(api)
  } catch (err) {
    throw new SubtensorError("Failed to query subtensor chain", err)
  } finally {
    await api.disconnect()
  }
}
