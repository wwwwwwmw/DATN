import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, medicalRecordAPI } from '../services/api'
import { useRealtimeSync } from '../utils/realtime'
import { useCallRingtone } from '../hooks/useCallRingtone'
import InfoTooltip from '../components/InfoTooltip'
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneCall, PhoneIncoming,
  MessageSquare, Shield, AlertTriangle, FileText,
  CheckCircle, Send, Search, PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen,
  Volume2, UserCheck, Minimize2, Maximize2,
  RefreshCw
} from 'lucide-react'

function extractList(res: any): any[] {
  const payload = res?.data?.data ?? res?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(res?.data?.results)) return res.data.results
  return []
}

export default function Telehealth() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null)
  const [roomState, setRoomState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLeftDrawer, setShowLeftDrawer] = useState(true)
  const [showRightDrawer, setShowRightDrawer] = useState(true)

  // Call & Modal state (Zalo style: Chat is default; Call overlay opens only when calling!)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [callTime, setCallTime] = useState(0)
  const [isInCall, setIsInCall] = useState(false)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [isCallMinimized, setIsCallMinimized] = useState(false)
  const [showInCallChat, setShowInCallChat] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inCallChatBottomRef = useRef<HTMLDivElement>(null)

  // Encounter Note state
  const [savingRecord, setSavingRecord] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [prescription, setPrescription] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')

  // WebRTC & Media refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerConnRef = useRef<RTCPeerConnection | null>(null)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)
  const [localStreamReady, setLocalStreamReady] = useState(false)
  const [iceState, setIceState] = useState<string>('new')
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new')
  const processedOfferRef = useRef<string | null>(null)
  const processedAnswerRef = useRef<string | null>(null)
  const processedIceSetRef = useRef<Set<string>>(new Set())
  const pendingIceCandidatesRef = useRef<any[]>([])
  const iceBatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Camera devices & OBS detection
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')

  const isPatientUser = user?.role === 'PATIENT' || (roomState?.patient_id ? user?.id === roomState.patient_id : false)

  const loadAppointments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await appointmentAPI.list()
      const list = extractList(res)
      setAppointments(list)
      if (list.length > 0 && !selectedApptId) {
        const waitingAppt = list.find(a =>
          isPatientUser ? a.telehealth_status?.doctor_in_room : a.telehealth_status?.patient_in_room
        )
        const preferred = waitingAppt || list.find(a => (a.reason || '').toLowerCase().includes('telehealth')) || list[0]
        selectAppointment(preferred)
      }
    } catch (err) {
      console.error('Failed to load telehealth contacts:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const selectAppointment = (app: any) => {
    setSelectedApptId(app.id)
    setSaveMessage(null)
    if (app.medical_record) {
      setDiagnosis(app.medical_record.diagnosis || '')
      setSymptoms(app.medical_record.symptoms || app.reason || '')
      setPrescription(app.medical_record.prescription || '')
      setClinicalNotes(app.medical_record.notes || app.notes || '')
    } else {
      setDiagnosis('')
      setSymptoms(app.reason || '')
      setPrescription('')
      setClinicalNotes(app.notes || '')
    }
  }

  const fetchRoomState = async (apptId: number) => {
    try {
      const res = await appointmentAPI.getTelehealthRoom(apptId)
      const data = res.data?.data || res.data
      if (data) {
        setRoomState(data)
        const myInRoom = isPatientUser ? data.patient_in_room : data.doctor_in_room
        setIsInCall(Boolean(myInRoom))
        if (myInRoom) {
          await handleWebRTCSync(apptId, data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch room state:', err)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  useEffect(() => {
    if (selectedApptId) {
      fetchRoomState(selectedApptId)
    }
  }, [selectedApptId])

  // Low-latency real-time sync (1.5s) for instant Zalo-like chat & call state
  useRealtimeSync(() => {
    loadAppointments(true)
    if (selectedApptId) {
      fetchRoomState(selectedApptId)
    }
  }, 1500)

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    inCallChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomState?.messages?.length, selectedApptId, isCallModalOpen])

  // Call timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isInCall) {
      interval = setInterval(() => {
        if (roomState?.started_at) {
          const elapsed = Math.max(0, Math.floor((Date.now() - new Date(roomState.started_at).getTime()) / 1000))
          setCallTime(elapsed)
        } else {
          setCallTime(prev => prev + 1)
        }
      }, 1000)
    } else {
      setCallTime(0)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isInCall, roomState?.started_at])

  const loadAvailableDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return []
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter(d => d.kind === 'videoinput')
      setAvailableCameras(videoInputs)
      return videoInputs
    } catch (err) {
      console.warn('Enumerate devices error:', err)
      return []
    }
  }

  // Auto-detect connected cameras (including OBS Virtual Cam)
  useEffect(() => {
    loadAvailableDevices()
    const handleDeviceChange = () => { loadAvailableDevices() }
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  // Keep local video element synced to localStream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStreamReady, isVideoOn, isInCall, isCallModalOpen, isCallMinimized])

  // Keep remote video element synced to remoteStream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current && remoteStreamRef.current.getTracks().length > 0) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }
      remoteVideoRef.current.play().catch(e => console.debug('Remote video play:', e))
    }
  }, [hasRemoteStream, roomState, isCallModalOpen, isCallMinimized])

  const syncLocalTracksToPC = (pc: RTCPeerConnection, stream: MediaStream) => {
    const transceivers = pc.getTransceivers()
    stream.getTracks().forEach(track => {
      const transceiver = transceivers.find(t =>
        (t.sender.track && t.sender.track.kind === track.kind) ||
        (t.receiver.track && t.receiver.track.kind === track.kind)
      )
      if (transceiver && transceiver.sender) {
        if (transceiver.sender.track !== track) {
          transceiver.sender.replaceTrack(track).catch(err => console.warn('replaceTrack error:', err))
        }
        if (transceiver.direction === 'recvonly') {
          transceiver.direction = 'sendrecv'
        }
      } else {
        const senders = pc.getSenders()
        const sender = senders.find(s => s.track && s.track.kind === track.kind)
        if (sender) {
          sender.replaceTrack(track).catch(err => console.warn('replaceTrack error:', err))
        } else {
          try {
            pc.addTrack(track, stream)
          } catch (err) {
            console.warn('addTrack error:', err)
          }
        }
      }
    })
  }

  const startLocalMedia = async (withVideo = true, preferredCameraId?: string) => {
    setCameraError(null)

    // Check currently available cameras
    let currentCams = availableCameras
    if (currentCams.length === 0) {
      currentCams = await loadAvailableDevices()
    }

    // Auto-detect camera: Prioritize physical hardware cameras, fallback to OBS Virtual Camera
    let targetCamId = preferredCameraId || selectedCameraId
    if (!targetCamId && currentCams.length > 0) {
      const physicalCam = currentCams.find(c => {
        const lbl = (c.label || '').toLowerCase()
        return !lbl.includes('obs') && !lbl.includes('virtual')
      })
      if (physicalCam) {
        targetCamId = physicalCam.deviceId
        setSelectedCameraId(physicalCam.deviceId)
      } else {
        // Fallback for machines without physical webcam (e.g. MiniPC using OBS Virtual Camera)
        targetCamId = currentCams[0].deviceId
        setSelectedCameraId(targetCamId)
      }
    }

    let vTrack: MediaStreamTrack | null = null
    let aTrack: MediaStreamTrack | null = null

    // 1. Try to get Video independently (supports OBS Virtual Cam & standard webcams)
    if (withVideo) {
      try {
        const vConstraints: MediaStreamConstraints = {
          video: targetCamId
            ? { deviceId: { exact: targetCamId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }
        const vStream = await navigator.mediaDevices.getUserMedia(vConstraints)
        vTrack = vStream.getVideoTracks()[0] || null
        if (vTrack) {
          loadAvailableDevices()
        }
      } catch (vErr) {
        console.warn('Failed video with ideal constraints, trying basic video: true', vErr)
        try {
          const vStreamBasic = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          vTrack = vStreamBasic.getVideoTracks()[0] || null
          if (vTrack) loadAvailableDevices()
        } catch (vErr2) {
          console.warn('All video acquisition failed:', vErr2)
          setCameraError('Không thể mở Camera / OBS Virtual Camera. Hãy chắc chắn bạn đã nhấn "Start Virtual Camera" trong phần mềm OBS Studio.')
        }
      }
    }

    // 2. Try to get Audio independently (MiniPC may not have a physical microphone)
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      aTrack = aStream.getAudioTracks()[0] || null
      setIsMicOn(true)
    } catch (aErr) {
      console.info('No audio input device detected or microphone permission denied (MiniPC):', aErr)
      setIsMicOn(false)
    }

    // 3. Combine whatever tracks succeeded
    const tracks: MediaStreamTrack[] = []
    if (vTrack) tracks.push(vTrack)
    if (aTrack) tracks.push(aTrack)

    if (tracks.length > 0) {
      const combined = new MediaStream(tracks)
      localStreamRef.current = combined
      setLocalStreamReady(true)

      if (vTrack) {
        setIsVideoOn(true)
        setCameraError(null)
      } else if (withVideo) {
        setIsVideoOn(false)
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = combined
        localVideoRef.current.play().catch(() => {})
      }

      if (peerConnRef.current) {
        syncLocalTracksToPC(peerConnRef.current, combined)
      }
      return combined
    } else {
      localStreamRef.current = null
      setLocalStreamReady(false)
      setIsVideoOn(false)
      setIsMicOn(false)
      setCameraError('Không tìm thấy thiết bị Camera / Mic. Nếu dùng OBS, vui lòng bật "Start Virtual Camera" rồi bấm Thử lại.')
      return null
    }
  }


  const flushIceCandidates = (apptId: number) => {
    if (pendingIceCandidatesRef.current.length === 0) return
    const batch = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []
    appointmentAPI.updateTelehealthRoom(apptId, {
      action: 'webrtc_signal',
      signal_type: 'ice_batch',
      signal_data: batch,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    }).catch(err => console.warn('Flush ICE batch error:', err))
  }

  const stopLocalMedia = () => {
    if (iceBatchTimeoutRef.current) {
      clearTimeout(iceBatchTimeoutRef.current)
      iceBatchTimeoutRef.current = null
    }
    pendingIceCandidatesRef.current = []
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop())
      remoteStreamRef.current = null
    }
    if (peerConnRef.current) {
      peerConnRef.current.close()
      peerConnRef.current = null
    }
    setHasRemoteStream(false)
    setLocalStreamReady(false)
    setIceState('new')
    setPeerConnectionState('new')
    processedOfferRef.current = null
    processedAnswerRef.current = null
    processedIceSetRef.current.clear()
  }

  const ensurePeerConnection = (apptId: number) => {
    if (peerConnRef.current && peerConnRef.current.signalingState !== 'closed') {
      return peerConnRef.current
    }
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'turns:global.relay.metered.ca:443?transport=tcp',
            'turn:global.relay.metered.ca:443?transport=tcp',
            'turn:global.relay.metered.ca:80?transport=tcp',
          ],
          username: '7f27ef410e8ff9439e474323',
          credential: 'MS5zleUbEp9n0qKQ',
        },
        {
          urls: [
            'turn:global.relay.metered.ca:80',
            'turn:global.relay.metered.ca:443',
          ],
          username: '7f27ef410e8ff9439e474323',
          credential: 'MS5zleUbEp9n0qKQ',
        },
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    })

    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        pendingIceCandidatesRef.current.push(event.candidate.toJSON())
        if (iceBatchTimeoutRef.current) clearTimeout(iceBatchTimeoutRef.current)
        iceBatchTimeoutRef.current = setTimeout(() => {
          flushIceCandidates(apptId)
        }, 150)
      } else {
        flushIceCandidates(apptId)
      }
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id)
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
      }
      const existing = remoteStreamRef.current.getTracks().filter(t => t.kind === event.track.kind)
      existing.forEach(t => remoteStreamRef.current?.removeTrack(t))
      remoteStreamRef.current.addTrack(event.track)

      setHasRemoteStream(true)
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
        }
        remoteVideoRef.current.play().catch(e => console.debug('Remote video play err:', e))
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState)
      setIceState(pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setHasRemoteStream(true)
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE Connection Failed, attempting restart...')
        pc.restartIce()
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Peer Connection State:', pc.connectionState)
      setPeerConnectionState(pc.connectionState)
      if (pc.connectionState === 'connected') {
        setHasRemoteStream(true)
      }
    }

    peerConnRef.current = pc
    return pc
  }

  const handleRetryWebRTC = async () => {
    if (!selectedApptId) return
    console.log('[WebRTC] Manual reconnection requested...')
    if (peerConnRef.current) {
      peerConnRef.current.close()
      peerConnRef.current = null
    }
    setHasRemoteStream(false)
    processedOfferRef.current = null
    processedAnswerRef.current = null
    processedIceSetRef.current.clear()

    // Reset signaling room state in backend so both peers start fresh
    await appointmentAPI.updateTelehealthRoom(selectedApptId, {
      action: 'webrtc_signal',
      signal_type: 'offer',
      signal_data: null,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    }).catch(() => {})

    const pc = ensurePeerConnection(selectedApptId)
    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }
    if (roomState) {
      await handleWebRTCSync(selectedApptId, roomState)
    }
  }

  const handleWebRTCSync = async (apptId: number, data: any) => {
    if (!data.doctor_in_room || !data.patient_in_room) return
    const pc = ensurePeerConnection(apptId)

    // Sync any newly added tracks to peer connection
    if (localStreamRef.current) {
      syncLocalTracksToPC(pc, localStreamRef.current)
    }

    try {
      if (!isPatientUser) {
        // DOCTOR: Creates Offer if this local PeerConnection hasn't created one yet
        if (!processedOfferRef.current && pc.signalingState === 'stable') {
          console.log('[WebRTC] Doctor generating fresh offer...')
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await pc.setLocalDescription(offer)
          processedOfferRef.current = JSON.stringify(offer)
          await appointmentAPI.updateTelehealthRoom(apptId, {
            action: 'webrtc_signal',
            signal_type: 'offer',
            signal_data: { type: offer.type, sdp: offer.sdp },
            participant_role: 'DOCTOR',
          })
          setTimeout(() => flushIceCandidates(apptId), 250)
        } else if (data.webrtc_answer) {
          const ansStr = JSON.stringify(data.webrtc_answer)
          if (processedAnswerRef.current !== ansStr && pc.signalingState === 'have-local-offer') {
            processedAnswerRef.current = ansStr
            await pc.setRemoteDescription(new RTCSessionDescription(data.webrtc_answer))
            console.log('[WebRTC] Doctor successfully setRemoteDescription with Answer')
          }
        }
        const remoteCands = data.patient_ice_candidates || []
        if (pc.remoteDescription && Array.isArray(remoteCands)) {
          for (const cand of remoteCands) {
            if (!cand || !cand.candidate || !cand.candidate.trim()) continue
            const key = cand.candidate || JSON.stringify(cand)
            if (!processedIceSetRef.current.has(key)) {
              processedIceSetRef.current.add(key)
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }
          }
        }
      } else {
        // PATIENT: Receives Offer, Creates Answer
        if (data.webrtc_offer) {
          const offStr = JSON.stringify(data.webrtc_offer)
          if (processedOfferRef.current !== offStr) {
            processedOfferRef.current = offStr
            if (pc.signalingState !== 'stable') {
              console.log('[WebRTC] Patient resetting PeerConnection to receive new Offer')
            }
            await pc.setRemoteDescription(new RTCSessionDescription(data.webrtc_offer))
            console.log('[WebRTC] Patient successfully setRemoteDescription with Offer')
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            processedAnswerRef.current = JSON.stringify(answer)
            await appointmentAPI.updateTelehealthRoom(apptId, {
              action: 'webrtc_signal',
              signal_type: 'answer',
              signal_data: { type: answer.type, sdp: answer.sdp },
              participant_role: 'PATIENT',
            })
            setTimeout(() => flushIceCandidates(apptId), 250)
          }
        }
        const remoteCands = data.doctor_ice_candidates || []
        if (pc.remoteDescription && Array.isArray(remoteCands)) {
          for (const cand of remoteCands) {
            if (!cand || !cand.candidate || !cand.candidate.trim()) continue
            const key = cand.candidate || JSON.stringify(cand)
            if (!processedIceSetRef.current.has(key)) {
              processedIceSetRef.current.add(key)
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }
          }
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Negotiation step warning:', err)
    }
  }

  // Start or Accept Call -> Opens the Zalo Call Modal!
  const handleStartCall = async (targetApptId?: number, videoMode = true) => {
    const apptId = targetApptId || selectedApptId
    if (!apptId) return
    if (targetApptId && targetApptId !== selectedApptId) {
      const found = appointments.find(a => a.id === targetApptId)
      if (found) selectAppointment(found)
    }
    setIsVideoOn(videoMode)
    setIsCallModalOpen(true)
    setIsCallMinimized(false)
    const stream = await startLocalMedia(videoMode)
    setIsInCall(true)

    const pc = ensurePeerConnection(apptId)
    if (stream) {
      syncLocalTracksToPC(pc, stream)
    }

    const actualHasVideo = Boolean(stream && stream.getVideoTracks().length > 0)
    const res = await appointmentAPI.updateTelehealthRoom(apptId, {
      action: 'join',
      mic: isMicOn,
      video: actualHasVideo,
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    })
    const data = res.data?.data || res.data
    setRoomState(data)
    loadAppointments(true)
  }

  // End Call -> Closes the Zalo Call Modal and returns to Chat View
  const handleLeaveCall = async () => {
    stopLocalMedia()
    setIsInCall(false)
    setIsCallModalOpen(false)
    setIsCallMinimized(false)
    setCallTime(0)
    if (!selectedApptId) return
    const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
      action: 'leave',
      participant_role: isPatientUser ? 'PATIENT' : 'DOCTOR',
    })
    setRoomState(res.data?.data || res.data)
    loadAppointments(true)
  }

  const handleToggleMic = async () => {
    const nextMic = !isMicOn
    setIsMicOn(nextMic)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = nextMic })
    }
    if (selectedApptId && isInCall) {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'toggle_media',
        mic: nextMic,
        video: isVideoOn,
      })
      setRoomState(res.data?.data || res.data)
    }
  }

  const handleToggleVideo = async () => {
    const nextVid = !isVideoOn
    setIsVideoOn(nextVid)
    if (localStreamRef.current) {
      const vTracks = localStreamRef.current.getVideoTracks()
      if (vTracks.length > 0) {
        vTracks.forEach(t => { t.enabled = nextVid })
      } else if (nextVid) {
        await startLocalMedia(true, selectedCameraId)
      }
    } else if (nextVid) {
      await startLocalMedia(true, selectedCameraId)
    }
    if (selectedApptId && isInCall) {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'toggle_media',
        mic: isMicOn,
        video: nextVid,
      })
      setRoomState(res.data?.data || res.data)
    }
  }

  const handleSendMessage = async (customText?: string) => {
    const text = (customText ?? chatInput).trim()
    if (!text || !selectedApptId) return
    setSendingChat(true)
    try {
      const res = await appointmentAPI.updateTelehealthRoom(selectedApptId, {
        action: 'send_message',
        content: text,
      })
      setRoomState(res.data?.data || res.data)
      if (!customText) setChatInput('')
      loadAppointments(true)
    } finally {
      setSendingChat(false)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const filteredContacts = appointments.filter(app => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const contactName = isPatientUser ? (app.doctor_name || '') : (app.patient_name || '')
    return (
      contactName.toLowerCase().includes(q) ||
      String(app.id).includes(q) ||
      (app.reason || '').toLowerCase().includes(q) ||
      (app.doctor_specialization || '').toLowerCase().includes(q)
    )
  })

  const activeAppt = appointments.find(a => a.id === selectedApptId) || appointments[0] || null

  // Appointments where the other party is currently waiting in the call room
  const waitingAppointments = appointments.filter(a => {
    const ts = a.telehealth_status
    if (!ts) return false
    return isPatientUser
      ? (ts.doctor_in_room && !ts.patient_in_room)
      : (ts.patient_in_room && !ts.doctor_in_room)
  })

  const bothConnected = Boolean(roomState?.doctor_in_room && roomState?.patient_in_room)
  const otherPartyInRoom = isPatientUser ? Boolean(roomState?.doctor_in_room) : Boolean(roomState?.patient_in_room)

  // 🔔 Call ringtone: outgoing ring when waiting, incoming chime when other party arrives
  useCallRingtone({ isInCall, bothConnected, otherPartyInRoom, isCallModalOpen })
  const otherPartyMicOn = isPatientUser ? (roomState?.doctor_mic ?? true) : (roomState?.patient_mic ?? true)
  const otherPartyVideoOn = isPatientUser ? (roomState?.doctor_video ?? true) : (roomState?.patient_video ?? true)
  const isP2PConnected = iceState === 'connected' || iceState === 'completed' || peerConnectionState === 'connected'
  const isRemoteVideoActive = hasRemoteStream && isP2PConnected && (
    otherPartyVideoOn || (remoteStreamRef.current ? remoteStreamRef.current.getVideoTracks().some(t => t.readyState === 'live' && t.enabled) : false)
  )
  const otherPartyName = activeAppt
    ? (isPatientUser ? `BS. ${activeAppt.doctor_name}` : `BN. ${activeAppt.patient_name}`)
    : ''
  const myDisplayName = activeAppt
    ? (isPatientUser ? `BN. ${activeAppt.patient_name}` : `BS. ${activeAppt.doctor_name}`)
    : ''

  const handleSignAndSaveRecord = async () => {
    if (!activeAppt) return
    setSavingRecord(true)
    setSaveMessage(null)
    try {
      await medicalRecordAPI.create({
        patient: activeAppt.patient,
        doctor: activeAppt.doctor,
        appointment: activeAppt.id,
        diagnosis: diagnosis || 'I10 - Khám chuyên khoa Telehealth',
        symptoms: symptoms || activeAppt.reason,
        prescription: prescription || 'Theo dõi định kỳ',
        notes: clinicalNotes || 'Đã hoàn tất phiên hội chẩn Telehealth WebRTC.',
      })
      setSaveMessage('Đã ký số và lưu hồ sơ bệnh án trực tiếp vào Cơ sở dữ liệu PostgreSQL!')
      await loadAppointments(true)
    } catch (err: any) {
      setSaveMessage(err?.response?.data?.message || 'Lỗi khi lưu hồ sơ bệnh án.')
    } finally {
      setSavingRecord(false)
    }
  }

  const quickChatTemplates = isPatientUser
    ? [
        '👋 Chào Bác sĩ, tôi đã sẵn sàng trao đổi ạ.',
        '⚠️ Mic của tôi đang bị hỏng, tôi xin phép nhắn tin.',
        '📹 Bác sĩ có thể bấm Gọi Video giúp tôi được không ạ?',
      ]
    : [
        '👋 Chào bạn, Bác sĩ đã sẵn sàng tư vấn ca khám của bạn.',
        '⚠️ Nếu mic của bạn bị hỏng, bạn cứ nhắn tin triệu chứng vào đây nhé.',
        '💊 Bác sĩ đã cập nhật chẩn đoán và đơn thuốc trong bệnh án.',
      ]

  const getInitials = (name: string) => {
    const parts = (name || 'U').trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return (name || 'U').slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', height: 'calc(100vh - var(--header-height) - 40px)' }}>
      {/* INCOMING CALL FLOATING BANNER (Zalo Ringing Bar) when someone is calling */}
      {waitingAppointments.map(wa => (
        <div
          key={`incoming-${wa.id}`}
          style={{
            background: 'linear-gradient(90deg, #0068ff 0%, #0d9488 100%)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0, 104, 255, 0.25)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PhoneIncoming size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)' }}>
                {isPatientUser
                  ? `📲 Cuộc gọi đến từ BS. ${wa.doctor_name} (${wa.doctor_specialization})`
                  : `📲 Cuộc gọi đến từ Bệnh nhân ${wa.patient_name} (${wa.patient_code})`}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                Ca khám #BA-{1000 + wa.id} • {wa.reason} • Đang chờ bạn trong phòng cuộc gọi...
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
              onClick={() => {
                selectAppointment(wa)
                handleSendMessage('Tôi đang bận chút, xin phép nhắn tin trước ạ.')
              }}
            >
              <MessageSquare size={14} /> Nhắn tin
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#22c55e', color: 'white', border: 'none', fontWeight: 'bold', padding: '6px 14px' }}
              onClick={() => handleStartCall(wa.id, true)}
            >
              <Video size={15} /> Nghe máy / Mở Video
            </button>
          </div>
        </div>
      ))}

      {/* MAIN ZALO 3-COLUMN MESSENGER CONTAINER */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `${showLeftDrawer ? '280px' : '0px'} minmax(360px, 1fr) ${showRightDrawer ? '320px' : '0px'}`,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 0,
        width: '100%',
        maxWidth: '100%',
        transition: 'grid-template-columns 0.2s ease',
      }}>
        {/* ================= COLUMN 1: ZALO CONTACT LIST SIDEBAR ================= */}
        {showLeftDrawer && (
        <div style={{
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          minHeight: 0,
        }}>
          {/* Sidebar Header + Search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ fontSize: 'var(--text-base)', color: '#0068ff' }}>
                  {isPatientUser ? 'Bác sĩ của tôi' : user?.role === 'DOCTOR' ? 'Bệnh nhân phụ trách' : 'Danh bạ Telehealth'}
                </strong>
                <InfoTooltip
                  title="Danh bạ khám từ xa"
                  content="Danh sách bác sĩ hoặc bệnh nhân có lịch hẹn với bạn. Bấm vào một người để nhắn tin hoặc bấm Gọi để khám trực tiếp."
                />
              </div>
              <span className="badge badge-primary" style={{ fontSize: '11px' }}>{filteredContacts.length} liên hệ</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input
                type="text"
                className="form-input"
                placeholder={isPatientUser ? 'Tìm bác sĩ chuyên khoa...' : 'Tìm tên bệnh nhân, mã ca...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 'var(--text-sm)', height: 34, borderRadius: 'var(--radius-full)', background: 'var(--color-neutral-bg)' }}
              />
            </div>
          </div>

          {/* Contact Items List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredContacts.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                {loading ? 'Đang tải danh bạ...' : 'Không tìm thấy người liên hệ phù hợp.'}
              </div>
            ) : (
              filteredContacts.map(app => {
                const isSelected = app.id === activeAppt?.id
                const ts = app.telehealth_status || {}
                const isBoth = ts.doctor_in_room && ts.patient_in_room
                const isOtherWaiting = isPatientUser ? (ts.doctor_in_room && !ts.patient_in_room) : (ts.patient_in_room && !ts.doctor_in_room)
                const contactName = isPatientUser ? `BS. ${app.doctor_name}` : app.patient_name
                const subTitle = isPatientUser
                  ? `${app.doctor_specialization}`
                  : `${app.patient_code} • ${app.patient_gender || 'Nam'}, ${app.patient_age || 45}t`

                return (
                  <div
                    key={app.id}
                    onClick={() => selectAppointment(app)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      background: isSelected ? '#e5efff' : isOtherWaiting ? '#fff1f2' : 'transparent',
                      borderLeft: isSelected ? '4px solid #0068ff' : '4px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Avatar with Status Dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: isSelected ? '#0068ff' : '#dbeafe',
                        color: isSelected ? 'white' : '#1e40af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '15px',
                      }}>
                        {getInitials(isPatientUser ? app.doctor_name : app.patient_name)}
                      </div>
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: isOtherWaiting ? '#ef4444' : isBoth ? '#22c55e' : '#10b981',
                        border: '2px solid white',
                      }} />
                    </div>

                    {/* Name + Last Message Preview */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{
                          fontWeight: isSelected || isOtherWaiting ? 'var(--font-bold)' : 'var(--font-semibold)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {contactName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                          {ts.last_message_time || String(app.start_time || '').slice(0, 5)}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#0068ff', fontWeight: 500, marginBottom: 2 }}>
                        {subTitle} • #BA-{1000 + app.id}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        {isOtherWaiting ? (
                          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <PhoneIncoming size={12} /> Đang gọi cho bạn...
                          </span>
                        ) : isBoth ? (
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                            🟢 Đang trong cuộc gọi
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '12px',
                            color: ts.last_message ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {ts.last_message ? `💬 ${ts.last_message}` : app.reason}
                          </span>
                        )}

                        {ts.message_count > 0 && (
                          <span style={{
                            background: '#0068ff', color: 'white',
                            borderRadius: '10px', padding: '1px 6px',
                            fontSize: '10px', fontWeight: 'bold', flexShrink: 0
                          }}>
                            {ts.message_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        )}

        {/* ================= COLUMN 2: ZALO MAIN CHAT WINDOW (Shows Messages First!) ================= */}
        {!activeAppt ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
            Chọn một người liên hệ bên trái để bắt đầu nhắn tin hoặc gọi điện.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#eef3f8' }}>
            {/* Zalo Top Chat Header with Call Buttons */}
            <div style={{
              height: 68,
              padding: '0 20px',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowLeftDrawer(!showLeftDrawer)}
                  title={showLeftDrawer ? 'Ẩn danh bạ' : 'Hiện danh bạ'}
                  style={{ color: '#0068ff' }}
                >
                  {showLeftDrawer ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#0068ff', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '15px',
                  }}>
                    {getInitials(isPatientUser ? activeAppt.doctor_name : activeAppt.patient_name)}
                  </div>
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 11, height: 11, borderRadius: '50%',
                    background: '#22c55e', border: '2px solid white',
                  }} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>
                      {otherPartyName}
                    </strong>
                    <span className="badge badge-neutral font-mono" style={{ fontSize: '11px' }}>
                      #BA-{1000 + activeAppt.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {bothConnected ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Đang kết nối trong cuộc gọi ({formatTime(callTime)})</span>
                    ) : otherPartyInRoom ? (
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>📲 {otherPartyName} đang chờ bạn trong cuộc gọi!</span>
                    ) : (
                      <span>🟢 Đang trực tuyến • {activeAppt.doctor_specialization} • {activeAppt.clinic_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Zalo Call Action Buttons (Clicking these opens the Call UI!) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isInCall ? (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#16a34a', color: 'white', border: 'none', fontWeight: 600, padding: '8px 14px' }}
                    onClick={() => {
                      setIsCallModalOpen(true)
                      setIsCallMinimized(false)
                    }}
                  >
                    <Maximize2 size={15} /> Mở lại màn hình Cuộc gọi ({formatTime(callTime)})
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartCall(activeAppt.id, false)}
                      title="Bắt đầu cuộc gọi thoại"
                      style={{ padding: '7px 12px', fontWeight: 600 }}
                    >
                      <PhoneCall size={15} color="#0068ff" /> Gọi thoại
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStartCall(activeAppt.id, true)}
                      title="Bắt đầu cuộc gọi Video WebRTC"
                      style={{ background: '#0068ff', borderColor: '#0068ff', padding: '7px 14px', fontWeight: 600 }}
                    >
                      <Video size={15} /> {otherPartyInRoom ? 'Chấp nhận Gọi Video' : 'Gọi Video'}
                    </button>
                    <InfoTooltip
                      title="Khám bệnh trực tuyến"
                      content="Bạn có thể nhắn tin trao đổi trước. Khi cả hai đã sẵn sàng, hãy bấm nút Gọi Video để bắt đầu cuộc khám. Cuộc gọi được bảo mật y tế tuyệt đối."
                    />
                  </>
                )}

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                  title={showRightDrawer ? 'Ẩn thông tin bệnh án' : 'Mở thông tin bệnh án'}
                >
                  {showRightDrawer ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              </div>
            </div>

            {/* Pinned Appointment Context Banner inside Chat */}
            <div style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} color="#0068ff" />
                <span><strong>Nội dung khám:</strong> {activeAppt.reason}</span>
              </div>
              <span>Ngày hẹn: <strong>{activeAppt.date}</strong> ({String(activeAppt.start_time || '').slice(0, 5)})</span>
            </div>

            {/* Zalo Chat Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* System security notice bubble */}
              <div style={{
                alignSelf: 'center',
                background: 'rgba(255,255,255,0.75)',
                padding: '5px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
              }}>
                🔒 Tin nhắn và cuộc gọi giữa <strong>BS. {activeAppt.doctor_name}</strong> và <strong>BN. {activeAppt.patient_name}</strong> được đồng bộ thời gian thực.
              </div>

              {(!roomState?.messages || roomState.messages.length === 0) ? (
                <div style={{
                  margin: 'auto',
                  textAlign: 'center',
                  background: 'white',
                  padding: '24px 32px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  maxWidth: 420,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#e5efff', color: '#0068ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', fontWeight: 'bold', fontSize: '18px',
                  }}>
                    {getInitials(isPatientUser ? activeAppt.doctor_name : activeAppt.patient_name)}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--text-base)', marginBottom: 4 }}>
                    Bắt đầu trò chuyện với {otherPartyName}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                    Bạn có thể gửi tin nhắn trao đổi trước hoặc nhấn nút <strong>Gọi Video</strong> ở góc phải trên để bắt đầu cuộc gọi trực tuyến.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: '#0068ff', borderColor: '#0068ff' }}
                    onClick={() => handleStartCall(activeAppt.id, true)}
                  >
                    <Video size={14} /> Gọi Video với {otherPartyName}
                  </button>
                </div>
              ) : (
                roomState.messages.map((msg: any) => {
                  const isMine = msg.sender_id === user?.id
                  const senderLabel = msg.sender_role === 'DOCTOR' ? `BS. ${msg.sender_name}` : `BN. ${msg.sender_name}`
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: isMine ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      {!isMine && (
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: '#0068ff', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
                        }}>
                          {getInitials(msg.sender_name)}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isMine ? '#dbeafe' : '#ffffff',
                        color: '#0f172a',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        border: isMine ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      }}>
                        {!isMine && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0068ff', marginBottom: 3 }}>
                            {senderLabel}
                          </div>
                        )}
                        <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                          {msg.created_at}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Zalo Bottom Quick Replies + Input Composer */}
            <div style={{
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: 2 }}>
                {quickChatTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--color-border)',
                      whiteSpace: 'nowrap',
                      background: 'var(--color-neutral-bg)',
                    }}
                    onClick={() => handleSendMessage(tpl)}
                  >
                    {tpl}
                  </button>
                ))}
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <input
                  className="form-input"
                  style={{ flex: 1, borderRadius: 'var(--radius-full)', paddingLeft: 16 }}
                  placeholder={`Nhập tin nhắn tới ${otherPartyName}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={sendingChat || !chatInput.trim()}
                  style={{ borderRadius: 'var(--radius-full)', background: '#0068ff', borderColor: '#0068ff', padding: '8px 18px' }}
                >
                  <Send size={15} /> Gửi
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= COLUMN 3: COLLAPSIBLE CLINICAL RECORD SIDEBAR ================= */}
        {showRightDrawer && activeAppt && (
          <div style={{
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            minHeight: 0,
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={15} color="#0068ff" /> Hồ sơ Lâm sàng & Bệnh án
              </strong>
              <span className="font-mono badge badge-neutral" style={{ fontSize: '11px' }}>{activeAppt.patient_code}</span>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Patient Info */}
              <div style={{ padding: '12px', background: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>BN. {activeAppt.patient_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {activeAppt.patient_gender || 'Nam'} • {activeAppt.patient_age || 45} tuổi
                  {activeAppt.patient_blood_type ? ` • Nhóm máu ${activeAppt.patient_blood_type}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {activeAppt.patient_address || 'TP. Hồ Chí Minh'}
                </div>
              </div>

              {activeAppt.patient_history && (
                <div style={{ padding: '10px 12px', background: 'var(--color-emergency-bg)', border: '1px solid var(--color-emergency-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-emergency)', fontSize: '12px' }}>
                    <AlertTriangle size={13} /> Tiền sử & Dị ứng (Database)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-emergency-text)', marginTop: 4 }}>
                    {activeAppt.patient_history}
                  </div>
                </div>
              )}

              {/* Doctor's Encounter Note Form */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                    {t('telehealth.encounter_note')}
                  </strong>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>{activeAppt.status}</span>
                </div>

                {saveMessage && (
                  <div style={{ padding: '8px 10px', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> {saveMessage}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>{t('telehealth.icd10_label')}</label>
                  {isPatientUser ? (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {diagnosis || 'Chưa có chẩn đoán từ Bác sĩ'}
                    </div>
                  ) : (
                    <input
                      className="form-input"
                      style={{ fontSize: '12px' }}
                      placeholder={t('telehealth.icd10_placeholder')}
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>{t('telehealth.symptoms_label')}</label>
                  {isPatientUser ? (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {symptoms || 'Không ghi nhận'}
                    </div>
                  ) : (
                    <textarea
                      className="form-input"
                      style={{ fontSize: '12px' }}
                      rows={2}
                      placeholder={t('telehealth.symptoms_placeholder')}
                      value={symptoms}
                      onChange={e => setSymptoms(e.target.value)}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>{t('telehealth.quick_rx')}</label>
                  {isPatientUser ? (
                    <div style={{ padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {prescription || 'Chưa có đơn thuốc'}
                    </div>
                  ) : (
                    <textarea
                      className="form-input"
                      style={{ fontSize: '12px' }}
                      rows={3}
                      placeholder={t('telehealth.quick_rx_placeholder')}
                      value={prescription}
                      onChange={e => setPrescription(e.target.value)}
                    />
                  )}
                </div>

                {!isPatientUser && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                    onClick={handleSignAndSaveRecord}
                    disabled={savingRecord}
                  >
                    <Shield size={14} /> {savingRecord ? 'Đang lưu...' : t('actions.sign_save')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= ZALO VIDEO CALL OVERLAY MODAL (Opens ONLY when Calling!) ================= */}
      {isCallModalOpen && activeAppt && !isCallMinimized && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: showInCallChat ? 1120 : 820,
            height: '82vh',
            background: '#0f172a',
            borderRadius: '18px',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: showInCallChat ? '1fr 340px' : '1fr',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            {/* Video Stage */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
              {/* Top Call Bar */}
              <div style={{
                position: 'absolute', top: 16, left: 18, right: 18,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {bothConnected ? (
                    <span className="badge badge-success" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <span className="badge-dot" /> ĐÃ KẾT NỐI 2 CHIỀU • {formatTime(callTime)}
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ padding: '5px 12px', fontSize: '12px' }}>
                      <span className="badge-dot" /> ĐANG ĐỔ CHUÔNG CHỜ {otherPartyName.toUpperCase()} BẮT MÁY...
                    </span>
                  )}

                  {bothConnected && (
                    <span
                      className={`badge ${isP2PConnected ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      title={`ICE: ${iceState} | Peer: ${peerConnectionState}`}
                    >
                      {isP2PConnected
                        ? '⚡ P2P Trực Tiếp Hoạt Động'
                        : iceState === 'failed' || peerConnectionState === 'failed'
                          ? '⚠️ Lỗi kênh P2P'
                          : '🔄 Đang trao đổi gói P2P...'}
                    </span>
                  )}

                  {(iceState === 'failed' || peerConnectionState === 'failed') && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={handleRetryWebRTC}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
                      title="Bấm để tái tạo kênh kết nối WebRTC giữa 2 máy"
                    >
                      <RefreshCw size={12} style={{ marginRight: 4 }} /> Kết nối lại P2P
                    </button>
                  )}

                  {bothConnected && !otherPartyMicOn && (
                    <span className="badge badge-emergency" style={{ fontSize: '11px', padding: '4px 10px' }}>
                      <MicOff size={12} style={{ marginRight: 4 }} /> {otherPartyName} đang tắt/hỏng Mic — Hãy dùng khung Chat bên phải
                    </span>
                  )}
                  {cameraError && (
                    <span className="badge badge-emergency" style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5' }}>
                      ⚠️ {cameraError}
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
                  onClick={() => setIsCallMinimized(true)}
                  title="Thu nhỏ cửa sổ gọi về màn hình Chat"
                >
                  <Minimize2 size={14} /> Thu nhỏ về Chat
                </button>
              </div>

              {/* Remote Participant Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: bothConnected && isRemoteVideoActive ? 'block' : 'none',
                }}
              />

              {/* Waiting or Audio-only Fallback */}
              {(!bothConnected || !isRemoteVideoActive) && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {bothConnected ? (
                    <div style={{ textAlign: 'center', color: 'white', padding: 24 }}>
                      <div style={{
                        width: 110, height: 110, borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '3px solid #22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}>
                        <UserCheck size={52} color="#22c55e" />
                      </div>
                      <h2 style={{ color: 'white', marginBottom: 6 }}>{otherPartyName}</h2>
                      <p style={{ fontSize: 'var(--text-sm)', color: '#86efac', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Volume2 size={16} /> Đang kết nối trực tiếp trong cuộc gọi ({formatTime(callTime)})
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'white', padding: 24 }}>
                      <div style={{
                        width: 104, height: 104, borderRadius: '50%',
                        background: '#0068ff', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', fontSize: '32px', fontWeight: 'bold',
                        boxShadow: '0 0 0 12px rgba(0, 104, 255, 0.25)',
                      }}>
                        {getInitials(isPatientUser ? activeAppt?.doctor_name : activeAppt?.patient_name)}
                      </div>
                      <h2 style={{ color: 'white', marginBottom: 6 }}>Đang gọi cho {otherPartyName}...</h2>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', maxWidth: 420, margin: '0 auto' }}>
                        Hệ thống đã gửi thông báo cuộc gọi đến <strong>{otherPartyName}</strong>. Bạn cũng có thể nhắn tin ở khung bên phải trong lúc chờ.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Local Self PiP */}
              <div style={{
                position: 'absolute', bottom: 88, right: 20,
                width: 190, height: 125,
                background: '#1e293b',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    display: localStreamRef.current && isVideoOn ? 'block' : 'none',
                  }}
                />
                {(!localStreamRef.current || !isVideoOn) && (
                  <div style={{ textAlign: 'center', color: 'white', fontSize: '12px', padding: 8 }}>
                    <div style={{ fontWeight: 'bold' }}>Bạn ({myDisplayName})</div>
                    <div style={{ fontSize: '11px', opacity: 0.75, marginTop: 4 }}>
                      {isMicOn ? '🎙️ Mic đang bật' : '🔇 Mic đang tắt'}
                    </div>
                  </div>
                )}
              </div>

              {/* Zalo Bottom Call Control Buttons */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '16px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <button
                  className={`btn ${isMicOn ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={handleToggleMic}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  <span>{isMicOn ? 'Tắt Mic' : 'Bật Mic'}</span>
                </button>

                <button
                  className={`btn ${isVideoOn ? 'btn-secondary' : 'btn-danger'}`}
                  onClick={handleToggleVideo}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                  <span>{isVideoOn ? 'Tắt Camera' : 'Bật Camera'}</span>
                </button>

                {cameraError && (
                  <button
                    className="btn btn-warning"
                    onClick={() => startLocalMedia(true, selectedCameraId)}
                    style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 16px', fontSize: '12px' }}
                    title="Bấm để thử kết nối lại Camera / OBS sau khi đã bật 'Start Virtual Camera'"
                  >
                    <RefreshCw size={14} style={{ marginRight: 6 }} /> Thử lại Camera / OBS
                  </button>
                )}

                <button
                  className={`btn ${showInCallChat ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowInCallChat(!showInCallChat)}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 18px' }}
                >
                  <MessageSquare size={18} />
                  <span>Chat trong cuộc gọi ({(roomState?.messages || []).length})</span>
                </button>

                <button
                  className="btn btn-danger"
                  onClick={handleLeaveCall}
                  style={{ borderRadius: 'var(--radius-full)', height: 46, padding: '0 24px', fontWeight: 'bold' }}
                >
                  <Phone size={18} /> Kết thúc cuộc gọi
                </button>
              </div>
            </div>

            {/* In-Call Side Chat Drawer (for broken mic while video calling) */}
            {showInCallChat && (
              <div style={{
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid var(--color-border)',
                minHeight: 0,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>💬 Chat trong cuộc gọi</strong>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>Hỗ trợ khi tắt/hỏng Mic</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#eef3f8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(roomState?.messages || []).map((msg: any) => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div
                        key={`incall-${msg.id}`}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: isMine ? '#0068ff' : 'white',
                          color: isMine ? 'white' : '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', marginBottom: 2 }}>
                          {msg.sender_name} • {msg.created_at}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    )
                  })}
                  <div ref={inCallChatBottomRef} />
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  style={{ padding: '10px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '6px' }}
                >
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: '12px' }}
                    placeholder="Nhắn tin trong cuộc gọi..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={sendingChat || !chatInput.trim()}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
