import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Info, X } from 'lucide-react'

export interface InfoTooltipProps {
  /** Nội dung hướng dẫn bình dân, ngắn gọn */
  content: React.ReactNode
  /** Tiêu đề ngắn (tùy chọn) */
  title?: string
  /** Hướng hiển thị popover */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Kích thước icon */
  size?: number
  /** Kiểu inline hay block */
  className?: string
  style?: React.CSSProperties
}

export default function InfoTooltip({
  content,
  title,
  placement = 'bottom',
  size = 15,
  className = '',
  style,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Đóng khi người dùng bấm ra ngoài khung (Click-outside listener)
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  // Đóng khi bấm phím Escape
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClickOutside, handleKeyDown])

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen((prev) => !prev)
  }

  // Định vị popover
  const getPopoverStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
      width: 'max-content',
      maxWidth: 280,
      background: '#ffffff',
      color: '#1e293b',
      border: '1px solid #cbd5e1',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12.5,
      lineHeight: 1.5,
      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.2), 0 6px 12px -3px rgba(15, 23, 42, 0.1)',
      textAlign: 'left',
      cursor: 'default',
    }

    if (placement === 'top') {
      return {
        ...base,
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    }
    if (placement === 'left') {
      return {
        ...base,
        right: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
      }
    }
    if (placement === 'right') {
      return {
        ...base,
        left: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
      }
    }
    // Default: bottom
    return {
      ...base,
      top: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
    }
  }

  return (
    <div
      ref={containerRef}
      className={`info-tooltip-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        verticalAlign: 'middle',
        margin: '0 4px',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label="Xem hướng dẫn thông tin"
        title="Bấm để xem hướng dẫn"
        style={{
          background: isOpen ? 'var(--color-primary, #0284c7)' : 'transparent',
          color: isOpen ? '#ffffff' : '#64748b',
          border: '1px solid',
          borderColor: isOpen ? 'var(--color-primary, #0284c7)' : '#cbd5e1',
          borderRadius: '50%',
          width: size + 7,
          height: size + 7,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.color = 'var(--color-primary, #0284c7)'
            e.currentTarget.style.borderColor = 'var(--color-primary, #0284c7)'
            e.currentTarget.style.background = '#f0f9ff'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.color = '#64748b'
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <Info size={size} strokeWidth={2.4} />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={getPopoverStyle()}
          className="info-popover-content"
        >
          {title && (
            <div
              style={{
                fontWeight: 700,
                color: '#0f172a',
                fontSize: 13,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>{title}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Đóng"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div style={{ color: '#334155', fontWeight: 400 }}>{content}</div>
          <div
            style={{
              fontSize: 10.5,
              color: '#94a3b8',
              marginTop: 6,
              textAlign: 'right',
              fontStyle: 'italic',
            }}
          >
            Bấm ra ngoài để đóng
          </div>
        </div>
      )}
    </div>
  )
}

