import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, Chip, CircularProgress, IconButton, Modal, Paper, Tooltip, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { getUrl } from '../../common/utils'
import { VideoService } from '../../services'

export const TONEMAP_LABELS = {
  bt2390: 'bt.2390',
  hable: 'hable',
  mobius: 'mobius',
  reinhard: 'reinhard',
}

const AS_STORED = 'as_stored'

/** Where an operator runs, as the badge text: 'GPU', 'CPU', or null when unavailable. */
export const deviceLabel = (op) => (op?.device === 'gpu' ? 'GPU' : op?.device === 'cpu' ? 'CPU' : null)

const deviceBadgeSx = (device) => ({
  height: 18,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  borderRadius: '4px',
  color: device === 'gpu' ? '#4CC08A' : '#FFFFFFB3',
  border: `1px solid ${device === 'gpu' ? '#4CC08A88' : '#FFFFFF33'}`,
  bgcolor: device === 'gpu' ? '#4CC08A14' : '#FFFFFF0A',
  '& .MuiChip-label': { px: 0.75 },
})

/** The GPU / CPU badge shown beside an operator wherever it can be chosen. */
export const DeviceBadge = ({ op, sx }) => {
  const label = deviceLabel(op)
  if (!label) return null
  return <Chip label={label} size="small" sx={{ ...deviceBadgeSx(op.device), ...sx }} />
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

const nameOf = (operator) => (operator === AS_STORED ? 'as stored' : TONEMAP_LABELS[operator] || operator)

export const previewUrl = (videoId, seconds, operator, zoom = false) =>
  `${getUrl()}/api/video/${videoId}/tonemap/preview?t=${seconds}&op=${operator}${zoom ? '&zoom=1' : ''}`

const overlaySx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: '#000000AA',
}

const cornerLabelSx = {
  position: 'absolute',
  top: 10,
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#fff',
  bgcolor: '#000000B3',
  px: 1,
  py: 0.25,
  borderRadius: '4px',
  pointerEvents: 'none',
}

/**
 * Two renders of the same frame under one draggable handle: the left source shows to
 * the left of it, the right source to the right. Drag anywhere, or use the arrow keys.
 * `fit` scales the pair to the container; otherwise they are laid out at `width` x
 * `height` for a native-pixel look, inside whatever scrolls around them.
 */
const CompareSlider = ({ leftSrc, rightSrc, leftLabel, rightLabel, width, height, fit }) => {
  const [pos, setPos] = useState(50)
  const [loaded, setLoaded] = useState({ left: false, right: false })
  const [failed, setFailed] = useState(false)
  const boxRef = useRef(null)
  const dragging = useRef(false)

  useEffect(() => {
    setLoaded({ left: false, right: false })
    setFailed(false)
  }, [leftSrc, rightSrc])

  const moveTo = (clientX) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect?.width) return
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  const ready = loaded.left && loaded.right
  const imgStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
  }

  return (
    <Box
      ref={boxRef}
      role="slider"
      tabIndex={0}
      aria-label="Drag to compare"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
        moveTo(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={(e) => {
        dragging.current = false
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 2))
        if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 2))
      }}
      sx={{
        position: 'relative',
        flex: 'none',
        width: fit ? '100%' : width,
        height: fit ? 'auto' : height,
        aspectRatio: fit ? `${width} / ${height}` : undefined,
        bgcolor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'ew-resize',
        outline: 'none',
        '&:focus-visible': { boxShadow: '0 0 0 2px #4AA3FF' },
      }}
    >
      <img
        src={leftSrc}
        alt={leftLabel}
        style={imgStyle}
        onLoad={() => setLoaded((l) => ({ ...l, left: true }))}
        onError={() => setFailed(true)}
      />
      <img
        src={rightSrc}
        alt={rightLabel}
        style={{ ...imgStyle, clipPath: `inset(0 0 0 ${pos}%)` }}
        onLoad={() => setLoaded((l) => ({ ...l, right: true }))}
        onError={() => setFailed(true)}
      />
      <Box sx={{ ...cornerLabelSx, left: 10 }}>{leftLabel}</Box>
      <Box sx={{ ...cornerLabelSx, right: 10 }}>{rightLabel}</Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: 2,
          ml: '-1px',
          bgcolor: '#4AA3FF',
          pointerEvents: 'none',
          boxShadow: '0 0 6px #000000AA',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: `${pos}%`,
          transform: 'translate(-50%, -50%)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: '#061322',
          border: '2px solid #4AA3FF',
          color: '#4AA3FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          boxShadow: '0 2px 12px #000000AA',
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 20, mr: -0.75 }} />
        <ChevronRightIcon sx={{ fontSize: 20, ml: -0.75 }} />
      </Box>
      {!ready && !failed && (
        <Box sx={overlaySx}>
          <CircularProgress size={28} sx={{ color: '#FFFFFF99' }} />
        </Box>
      )}
      {failed && (
        <Box sx={overlaySx}>
          <Typography sx={{ color: '#FF6B6B', fontSize: 13 }}>One of the renders failed; see the server log</Typography>
        </Box>
      )}
    </Box>
  )
}

/**
 * Compare the tone map operators on real frames of the video before choosing one.
 *
 * The operator cards across the top pick what sits to the right of the handle and
 * what Apply will use; the left side defaults to the frame as stored and can be any
 * other operator, so two curves can be compared directly. Frames are random
 * timestamps from the video, and the view toggles between the whole frame and a
 * centre crop at native pixels. Applying hands the choice to the parent, which saves
 * it and shows progress.
 */
const TonemapCompareModal = ({
  open,
  onClose,
  videoId,
  videoInfo,
  capabilities,
  getCurrentTime,
  onApply,
  onRemove,
  busy = false,
}) => {
  const [frames, setFrames] = useState([])
  const [frame, setFrame] = useState(null)
  const [framesLoading, setFramesLoading] = useState(false)
  const [framesError, setFramesError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [left, setLeft] = useState(AS_STORED)
  const [mode, setMode] = useState('frame')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const current = videoInfo?.has_sdr ? videoInfo.tonemap : null
  const operators = capabilities?.operators || []
  const available = operators.filter((o) => o.available)
  const width = videoInfo?.width || 1920
  const height = videoInfo?.height || 1080

  const loadFrames = async () => {
    setFramesLoading(true)
    setFramesError(null)
    try {
      const res = await VideoService.getTonemapFrames(videoId, 3)
      const next = res.data.frames || []
      setFrames(next)
      setFrame(next[0] ?? null)
    } catch (err) {
      setFramesError(err.response?.data?.message || 'Could not pick frames from this video')
    }
    setFramesLoading(false)
  }

  useEffect(() => {
    if (!open) return
    setLeft(AS_STORED)
    setMode('frame')
    setConfirmRemove(false)
    loadFrames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId])

  // The right side starts on what the video plays with, else the server's default.
  useEffect(() => {
    if (!open) return
    setSelected(
      (prev) =>
        (prev && available.some((o) => o.id === prev) && prev) ||
        (current && available.some((o) => o.id === current) && current) ||
        (capabilities?.auto_default &&
          available.some((o) => o.id === capabilities.auto_default) &&
          capabilities.auto_default) ||
        available[0]?.id ||
        null,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, capabilities, current])

  // Rendering a tile takes the server a few seconds; ask for every operator's render of
  // the chosen frame as soon as it is chosen, so moving between operators is instant.
  useEffect(() => {
    if (!open || frame == null) return
    const zoom = mode === 'crop'
    ;[AS_STORED, ...available.map((o) => o.id)].forEach((op) => {
      const img = new Image()
      img.src = previewUrl(videoId, frame, op, zoom)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoId, frame, mode, capabilities])

  const addCurrentTime = () => {
    const t = Math.round((getCurrentTime?.() ?? 0) * 10) / 10
    setFrames((prev) => (prev.includes(t) ? prev : [...prev, t].sort((a, b) => a - b)))
    setFrame(t)
  }

  const canApply = selected && !busy && (selected !== current || !videoInfo?.has_sdr)
  const sameSides = left === selected
  const zoom = mode === 'crop'

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
    >
      <Paper
        sx={{
          position: 'relative',
          width: 'min(1400px, 100%)',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#061322',
          color: '#fff',
          border: '1px solid #FFFFFF1F',
          borderRadius: '14px',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid #FFFFFF1F',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Compare tone mapping</Typography>
            <Typography sx={{ fontSize: 12, color: '#FFFFFFA6', fontFamily: 'monospace' }}>
              {videoInfo?.title} · HDR · {width}x{height}
            </Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={loadFrames} disabled={framesLoading || busy} sx={ghostBtnSx}>
            Reshuffle frames
          </Button>
          {getCurrentTime && (
            <Button size="small" variant="outlined" onClick={addCurrentTime} disabled={busy} sx={ghostBtnSx}>
              Add current time
            </Button>
          )}
          <IconButton size="small" onClick={onClose} disabled={busy} sx={{ color: '#FFFFFFB3' }} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Body */}
        <Box
          sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          {/* Operators: the right side of the handle, and what Apply uses */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(operators.length, 1)}, minmax(0, 1fr))`,
              gap: 1,
            }}
            role="radiogroup"
            aria-label="Tone map operator"
          >
            {operators.map((op) => {
              const checked = selected === op.id
              return (
                <Tooltip key={op.id} title={op.note || ''} placement="top" disableHoverListener={!op.note}>
                  <Box
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={!op.available || busy}
                    onClick={() => op.available && setSelected(op.id)}
                    sx={{
                      textAlign: 'left',
                      border: '1px solid',
                      borderColor: checked ? '#4AA3FF' : '#FFFFFF1F',
                      boxShadow: checked ? 'inset 0 0 0 1px #4AA3FF' : 'none',
                      borderRadius: '10px',
                      bgcolor: '#0B1B2E',
                      color: op.available ? '#fff' : '#FFFFFF55',
                      p: 1,
                      cursor: op.available ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      minWidth: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: 13 }}>
                      <Box
                        sx={{
                          width: 13,
                          height: 13,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: checked ? '#4AA3FF' : '#FFFFFF80',
                          flex: 'none',
                          background: checked ? 'radial-gradient(circle, #4AA3FF 45%, transparent 50%)' : 'none',
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nameOf(op.id)}
                      </span>
                      <DeviceBadge op={op} />
                      {op.id === current && (
                        <Box
                          component="span"
                          sx={{
                            ml: 'auto',
                            fontSize: 10,
                            bgcolor: '#4AA3FF',
                            color: '#061322',
                            borderRadius: '4px',
                            px: 0.6,
                            fontFamily: 'monospace',
                          }}
                        >
                          current
                        </Box>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: '#FFFFFFA6',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {op.available
                        ? op.note || (op.device === 'gpu' ? 'runs on your GPU' : 'runs on the CPU')
                        : op.note || 'not available'}
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>

          {/* Frames and view */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 11.5,
                color: '#FFFFFFA6',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                mr: 0.5,
              }}
            >
              Frame
            </Typography>
            {frames.map((t) => (
              <Chip
                key={t}
                label={formatTime(t)}
                size="small"
                onClick={() => setFrame(t)}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  color: frame === t ? '#4AA3FF' : '#fff',
                  bgcolor: frame === t ? '#FFFFFF14' : 'transparent',
                  border: `1px solid ${frame === t ? '#4AA3FF' : '#FFFFFF33'}`,
                  '&:hover': { bgcolor: '#FFFFFF1A' },
                }}
              />
            ))}
            {framesLoading && <CircularProgress size={14} sx={{ color: '#FFFFFF80' }} />}
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
              {[
                ['frame', 'Full frame'],
                ['crop', '1:1 crop'],
              ].map(([id, label]) => (
                <Button
                  key={id}
                  size="small"
                  variant="outlined"
                  onClick={() => setMode(id)}
                  sx={{ ...ghostBtnSx, ...(mode === id && { color: '#4AA3FF', borderColor: '#4AA3FF' }) }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Box>

          {framesError && <Typography sx={{ color: '#FF6B6B', fontSize: 13 }}>{framesError}</Typography>}

          {/* Left side picker */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', fontSize: 13, color: '#FFFFFFA6' }}
          >
            <span>Left of the handle:</span>
            <select
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              aria-label="Left side of the comparison"
              style={{
                background: '#FFFFFF0D',
                color: 'white',
                border: '1px solid #FFFFFF26',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 13,
              }}
            >
              <option value={AS_STORED}>as stored (no tone map)</option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>
                  {nameOf(o.id)}
                </option>
              ))}
            </select>
            <span style={{ marginLeft: 'auto' }}>
              Right of the handle: <b style={{ color: '#fff' }}>{selected ? nameOf(selected) : '—'}</b>
              {sameSides && ' · pick a different operator on either side to see a difference'}
            </span>
          </Box>

          {/* The comparison */}
          {frame != null && selected && (
            <Box sx={{ overflow: 'auto', display: 'flex' }}>
              <CompareSlider
                leftSrc={previewUrl(videoId, frame, left, zoom)}
                rightSrc={previewUrl(videoId, frame, selected, zoom)}
                leftLabel={nameOf(left)}
                rightLabel={nameOf(selected)}
                width={zoom ? 1280 : width}
                height={zoom ? 720 : height}
                fit={!zoom}
              />
            </Box>
          )}
          {frame != null && !selected && !framesLoading && (
            <Typography sx={{ color: '#FFFFFFA6', fontSize: 13 }}>
              No tone map operator is available on this server.
            </Typography>
          )}
        </Box>

        {/* Remove confirmation */}
        {confirmRemove && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              px: 2.5,
              py: 1.25,
              bgcolor: '#F0824A14',
              borderTop: '1px solid #F0824A44',
            }}
          >
            <Typography sx={{ fontSize: 13, flex: 1, minWidth: 240 }}>
              Remove the tone map? This deletes the SDR copy and remakes the transcodes from the original. The HDR file
              itself is never touched.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => setConfirmRemove(false)} sx={ghostBtnSx}>
              Keep it
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setConfirmRemove(false)
                onRemove()
              }}
              sx={dangerBtnSx}
            >
              Remove
            </Button>
          </Box>
        )}

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            px: 2.5,
            py: 1.5,
            borderTop: '1px solid #FFFFFF1F',
            bgcolor: '#0B1B2E',
          }}
        >
          <Typography sx={{ fontSize: 13, color: '#FFFFFFA6', flex: 1, minWidth: 200 }}>
            {busy ? (
              <>
                <CircularProgress size={12} sx={{ color: '#4AA3FF', mr: 1, verticalAlign: 'middle' }} />
                Building the SDR copy, then the transcodes…
              </>
            ) : current ? (
              <>
                Current: <b style={{ color: '#fff' }}>{nameOf(current)}</b>
                {canApply ? ' · applying rebuilds the SDR copy and every transcode' : ' · SDR ready'}
              </>
            ) : (
              <>
                No tone map · plays the <b style={{ color: '#fff' }}>HDR original</b>
              </>
            )}
          </Typography>
          {current && !busy && (
            <Button size="small" variant="outlined" onClick={() => setConfirmRemove(true)} sx={dangerBtnSx}>
              Remove tone map
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={onClose} disabled={busy} sx={ghostBtnSx}>
            Close
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!canApply}
            onClick={() => onApply(selected)}
            sx={{ fontWeight: 600 }}
          >
            {selected ? `Apply ${nameOf(selected)}` : 'Apply'}
          </Button>
        </Box>
      </Paper>
    </Modal>
  )
}

const ghostBtnSx = {
  color: '#fff',
  borderColor: '#FFFFFF33',
  textTransform: 'none',
  '&:hover': { borderColor: '#FFFFFF80', bgcolor: '#FFFFFF11' },
  '&.Mui-disabled': { color: '#FFFFFF55', borderColor: '#FFFFFF1A' },
}

const dangerBtnSx = {
  color: '#F5A37C',
  borderColor: '#F0824A66',
  textTransform: 'none',
  '&:hover': { borderColor: '#F0824A', bgcolor: '#F0824A1F' },
}

export default TonemapCompareModal
