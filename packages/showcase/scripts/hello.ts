import { createScript } from '@unextension/bridge/script'

void createScript(async (payload: { from?: string }) => {
  return {
    message: `Hello from Node.js ${process.version}!`,
    receivedPayload: payload,
    cwd: process.cwd(),
    platform: process.platform,
  }
})
