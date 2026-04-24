import { useEffect, useState } from 'react'
import { socket } from '../socket'

/**
 * Subscribes to a Socket.io event and returns the latest payload + connection status.
 *
 * @param {string} event - Event name to listen for (e.g. 'ranking:update')
 * @param {*} initialData - Value to return before the first event arrives
 * @returns {{ data: *, connected: boolean }}
 */
export function useSocket(event, initialData = null) {
  const [data, setData] = useState(initialData)
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }
    function onEvent(payload) { setData(payload) }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on(event, onEvent)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(event, onEvent)
    }
  }, [event])

  return { data, connected }
}
