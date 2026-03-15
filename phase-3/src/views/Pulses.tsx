import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pulsesApi } from '../services/api'
import { WeeklyPulse } from '../types'

function Pulses() {
  const [pulses, setPulses] = useState<WeeklyPulse[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [weekStart, setWeekStart] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadPulses()
    // Set default week start to current Monday
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    setWeekStart(monday.toISOString().slice(0, 10))
  }, [])

  const loadPulses = async () => {
    try {
      setLoading(true)
      const response = await pulsesApi.list(10)
      setPulses(response.data)
    } catch (err) {
      console.error('Failed to load pulses:', err)
      setPulses([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!weekStart) {
      setMessage({ type: 'error', text: 'Please select a week start date' })
      return
    }

    setGenerating(true)
    try {
      const response = await pulsesApi.generate(weekStart)
      setMessage({ type: 'success', text: 'Pulse generated successfully!' })
      navigate(`/pulses/${response.data.id}`)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to generate pulse' })
    } finally {
      setGenerating(false)
    }
  }

  const viewPulse = (id: number) => {
    navigate(`/pulses/${id}`)
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Weekly Pulses</h1>
        <p>View and generate weekly review insights</p>
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
          <h2 className="card-title">Generate New Pulse</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
            <label className="form-label">Week Starting (Monday)</label>
            <input
              type="date"
              className="form-input"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={generating}
              style={{ whiteSpace: 'nowrap' }}
            >
              {generating ? 'Generating...' : '📊 Generate Pulse'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Generated Pulses</h2>
          <span style={{ color: 'var(--text-light)' }}>{pulses.length} pulses</span>
        </div>

        {pulses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p>No pulses generated yet. Create your first weekly pulse above.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Top Themes</th>
                  <th>Quotes</th>
                  <th>Actions</th>
                  <th>Word Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pulses.map((pulse) => (
                  <tr key={pulse.id}>
                    <td>
                      <strong>{new Date(pulse.week_start).toLocaleDateString()}</strong>
                      <br />
                      <small style={{ color: 'var(--text-light)' }}>
                        to {new Date(pulse.week_end).toLocaleDateString()}
                      </small>
                    </td>
                    <td>
                      {pulse.top_themes.map(t => t.name).join(', ')}
                    </td>
                    <td>{pulse.user_quotes.length} quotes</td>
                    <td>{pulse.action_ideas.length} ideas</td>
                    <td>
                      <span style={{ 
                        color: pulse.note_body.split(/\s+/).filter(Boolean).length > 250 ? 'var(--danger)' : 'var(--primary)',
                        fontWeight: 600
                      }}>
                        {pulse.note_body.split(/\s+/).filter(Boolean).length}
                      </span>
                      <small> / 250</small>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => viewPulse(pulse.id)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Pulses
