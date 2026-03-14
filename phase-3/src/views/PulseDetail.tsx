import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pulsesApi } from '../services/api'
import { WeeklyPulse } from '../types'

function PulseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pulse, setPulse] = useState<WeeklyPulse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (id) {
      loadPulse(parseInt(id))
    }
  }, [id])

  const loadPulse = async (pulseId: number) => {
    try {
      setLoading(true)
      const response = await pulsesApi.get(pulseId)
      setPulse(response.data)
    } catch (err) {
      console.error('Failed to load pulse:', err)
      setMessage({ type: 'error', text: 'Failed to load pulse' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!id) return
    
    setSending(true)
    try {
      await pulsesApi.sendEmail(parseInt(id), email || undefined)
      setMessage({ type: 'success', text: `Pulse sent to ${email || 'configured email'} successfully!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send email' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!pulse) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <p>Pulse not found</p>
        <button className="btn btn-primary" onClick={() => navigate('/pulses')}>
          Back to Pulses
        </button>
      </div>
    )
  }

  const wordCount = pulse.note_body.split(/\s+/).filter(Boolean).length

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Weekly Pulse</h1>
            <p>Week of {new Date(pulse.week_start).toLocaleDateString()} – {new Date(pulse.week_end).toLocaleDateString()}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/pulses')}>
            ← Back to List
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button 
            onClick={() => setMessage(null)} 
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📧 Send This Pulse</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
            <label className="form-label">Email Address (optional - uses default if empty)</label>
            <input
              type="email"
              className="form-input"
              placeholder="aaravinthraj3@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSendEmail}
            disabled={sending}
          >
            {sending ? 'Sending...' : '📤 Send Email'}
          </button>
        </div>
      </div>

      <div className="pulse-preview">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--primary)'
        }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>
            Groww Weekly Reviews Pulse
          </h2>
          <span style={{ color: 'var(--text-light)' }}>
            Week of {pulse.week_start}
          </span>
        </div>

        <div className="pulse-section">
          <h3>🏷️ Top {pulse.top_themes.length} Themes</h3>
          {pulse.top_themes.map((theme, i) => (
            <div key={i} className="theme-item">
              <h4>{theme.name}</h4>
              <p>{theme.description}</p>
              <div className="theme-meta">
                {theme.review_count} mentions • Average rating: {theme.avg_rating}★
              </div>
            </div>
          ))}
        </div>

        <div className="pulse-section">
          <h3>💬 User Quotes</h3>
          {pulse.user_quotes.map((quote, i) => (
            <div key={i} className="quote-item">
              "{quote.text}"
              <span style={{ color: '#ffb800', marginLeft: '0.5rem' }}>
                {quote.rating}★
              </span>
            </div>
          ))}
        </div>

        <div className="pulse-section">
          <h3>🎯 Recommended Actions</h3>
          {pulse.action_ideas.map((action, i) => (
            <div key={i} className="action-item">
              <span className="action-number">{i + 1}</span>
              <span>{action.idea}</span>
            </div>
          ))}
        </div>

        <div className="pulse-section">
          <h3>📝 Weekly Note</h3>
          <div className="note-body">{pulse.note_body}</div>
          <div style={{ 
            marginTop: '1rem', 
            textAlign: 'right',
            color: wordCount > 250 ? 'var(--danger)' : 'var(--text-light)',
            fontSize: '0.9rem'
          }}>
            Word count: {wordCount} / 250
            {wordCount > 250 && <span> ⚠️ Exceeds limit</span>}
          </div>
        </div>

        <div style={{ 
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.85rem',
          color: 'var(--text-light)',
          textAlign: 'center'
        }}>
          This is an internal pulse report generated from public Groww Play Store reviews. No PII is included.
        </div>
      </div>
    </div>
  )
}

export default PulseDetail
