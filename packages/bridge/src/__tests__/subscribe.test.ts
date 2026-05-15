import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property-based tests for the bridge subscription routing mechanism.
 *
 * These tests validate that stream events are routed correctly by processId,
 * delivered in order, and that unsubscribe stops delivery.
 *
 * **Validates: Requirements 2.6, 4.1, 4.2, 4.4**
 */
describe('bridge subscribe — property tests', () => {
  let postMessageMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    postMessageMock = vi.fn()
    ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as any).acquireVsCodeApi
  })

  /**
   * Property 4: Stream_Event Routing by Process_ID
   *
   * For any set of active Process_Handles and any incoming Stream_Event with a given
   * `processId`, the event SHALL be delivered exclusively to the subscription handler
   * registered for that `processId` and to no other handler.
   *
   * **Validates: Requirements 2.6, 4.1, 4.2**
   */
  describe('Property 4: Stream_Event Routing by Process_ID', () => {
    it('delivers events exclusively to the handler registered for that processId', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2-5 unique process IDs
          fc
            .uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), {
              minLength: 2,
              maxLength: 5,
            })
            .filter((arr) => arr.every((s) => s.trim().length > 0)),
          // Pick which processId to send the event to (index into the array)
          fc.nat(),
          // Generate event data
          fc.string({ minLength: 1 }),
          async (processIds, targetIndexRaw, eventData) => {
            const targetIndex = targetIndexRaw % processIds.length

            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { bridge } = await import('../index.js')

            // Register a handler for each processId
            const handlers = processIds.map(() => vi.fn())
            const unsubscribes = processIds.map((pid, i) => bridge.subscribe(pid, handlers[i]))

            // Dispatch a stream event for the target processId
            const targetProcessId = processIds[targetIndex]
            window.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  processId: targetProcessId,
                  payload: { type: 'stdout', data: eventData },
                },
              }),
            )

            // The target handler should have been called
            expect(handlers[targetIndex]).toHaveBeenCalledTimes(1)
            expect(handlers[targetIndex]).toHaveBeenCalledWith({
              type: 'stdout',
              data: eventData,
            })

            // All other handlers should NOT have been called
            for (let i = 0; i < processIds.length; i++) {
              if (i !== targetIndex) {
                expect(handlers[i]).not.toHaveBeenCalled()
              }
            }

            // Cleanup
            unsubscribes.forEach((unsub) => unsub())
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 5: Multiple Events Delivered In Order
   *
   * For any Process_ID subscription and any sequence of N Stream_Events sent by the
   * host for that Process_ID, the subscriber SHALL receive all N events in the same
   * order they were sent.
   *
   * **Validates: Requirements 4.1**
   */
  describe('Property 5: Multiple Events Delivered In Order', () => {
    it('delivers all N events in the same order they were sent', async () => {
      await fc.assert(
        fc.asyncProperty(
          // A processId
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          // A sequence of event data strings (1-20 events)
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          async (processId, eventDataList) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { bridge } = await import('../index.js')

            const receivedEvents: Array<{ type: string; data: string }> = []
            const unsubscribe = bridge.subscribe(processId, (event) => {
              receivedEvents.push(event as { type: string; data: string })
            })

            // Dispatch N events in order
            for (const data of eventDataList) {
              window.dispatchEvent(
                new MessageEvent('message', {
                  data: {
                    processId,
                    payload: { type: 'stdout', data },
                  },
                }),
              )
            }

            // All events should be received
            expect(receivedEvents).toHaveLength(eventDataList.length)

            // Events should be in the same order
            for (let i = 0; i < eventDataList.length; i++) {
              expect(receivedEvents[i]).toEqual({ type: 'stdout', data: eventDataList[i] })
            }

            unsubscribe()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 6: Unsubscribe Stops Event Delivery
   *
   * For any active subscription, after calling unsubscribe for a Process_ID, any
   * subsequent Stream_Events for that Process_ID SHALL NOT be delivered to the
   * previously registered handler.
   *
   * **Validates: Requirements 4.4**
   */
  describe('Property 6: Unsubscribe Stops Event Delivery', () => {
    it('stops delivering events after unsubscribe is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          // A processId
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          // Events to send before unsubscribe (at least 1)
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          // Events to send after unsubscribe (at least 1)
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (processId, eventsBefore, eventsAfter) => {
            vi.resetModules()
            postMessageMock = vi.fn()
            ;(window as any).acquireVsCodeApi = () => ({ postMessage: postMessageMock })

            const { bridge } = await import('../index.js')

            const handler = vi.fn()
            const unsubscribe = bridge.subscribe(processId, handler)

            // Send events before unsubscribe
            for (const data of eventsBefore) {
              window.dispatchEvent(
                new MessageEvent('message', {
                  data: {
                    processId,
                    payload: { type: 'stdout', data },
                  },
                }),
              )
            }

            // Handler should have received all events before unsubscribe
            expect(handler).toHaveBeenCalledTimes(eventsBefore.length)

            // Unsubscribe
            unsubscribe()

            // Send events after unsubscribe
            for (const data of eventsAfter) {
              window.dispatchEvent(
                new MessageEvent('message', {
                  data: {
                    processId,
                    payload: { type: 'stdout', data },
                  },
                }),
              )
            }

            // Handler call count should NOT have increased
            expect(handler).toHaveBeenCalledTimes(eventsBefore.length)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
