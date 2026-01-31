import { createMessageChannelPairTransport } from '@opentiny/next-sdk'

const [serverTransport, clientTransport] = createMessageChannelPairTransport()

export function useTransport() {
  return { serverTransport, clientTransport }
}
