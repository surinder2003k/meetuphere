'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface MediaState {
  stream: MediaStream | null
  error: string | null
  loading: boolean
}

export function useMediaPermissions() {
  const [state, setState] = useState<MediaState>({ stream: null, error: null, loading: false })
  const streamRef = useRef<MediaStream | null>(null)

  const requestMedia = useCallback(async () => {
    if (state.loading) return streamRef.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      })
      streamRef.current = stream
      setState({ stream, error: null, loading: false })
      return stream
    } catch (err: any) {
      let errorMsg = 'Failed to access camera and microphone.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera and microphone access denied. Please allow permissions in your browser settings.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera or microphone found.'
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Your camera or microphone is being used by another app.'
      }
      setState({ stream: null, error: errorMsg, loading: false })
      return null
    }
  }, [state.loading])

  const toggleMic = useCallback((on: boolean) => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = on))
    }
  }, [])

  const toggleVideo = useCallback((on: boolean) => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = on))
    }
  }, [])

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setState({ stream: null, error: null, loading: false })
  }, [])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return { ...state, requestMedia, toggleMic, toggleVideo, cleanup }
}