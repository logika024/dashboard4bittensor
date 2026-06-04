const DEFAULT_WS_URL = "wss://entrypoint-finney.opentensor.ai:443"

export function getSubtensorWsUrl(): string {
  return process.env.SUBTENSOR_WS_URL?.trim() || DEFAULT_WS_URL
}
