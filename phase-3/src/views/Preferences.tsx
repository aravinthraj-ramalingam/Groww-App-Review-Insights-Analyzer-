import { useState, useEffect } from 'react'
import { preferencesApi } from '../services/api'
import { UserPreferences } from '../types'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC'
]

function Preferences() {
  const [prefs, setPrefs] = useState<UserPreferences>({
    email: '',
    timezone: 'Asia/Kolkata',
    preferred_day_of_week: 1,
    preferred_time: '09:00'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savedPrefs, setSavedPrefs] = useState<UserPreferences | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await preferencesApi.get()
      if (response.data) {
        setPrefs(response.data)
        setSavedPrefs(response.data)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prefs.email) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    setSaving(true)
    try {
      const response = await preferencesApi.save({
        email: prefs.email,
        timezone: prefs.timezone,
        preferred_day_of_week: prefs.preferred_day_of_week,
        preferred_time: prefs.preferred_time
      })
      setSavedPrefs(response.data)
      setMessage({ type: 'success', text: 'Preferences saved successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save preferences' })
    } finally {
      setSaving(false)
    }
  }

  const getNextSendDate = (): string => {
    if (!savedPrefs) return ''
    
    const now = new Date()
    const currentDay = now.getDay()
    const targetDay = savedPrefs.preferred_day_of_week
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7
    
    const nextDate = new Date(now)
    nextDate.setDate(now.getDate() + daysUntilTarget)
    
    const [hours, minutes] = savedPrefs.preferred_time.split(':')
    nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    return nextDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: savedPrefs.timezone,
      timeZoneName: 'short'
    })
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
        <h1>Schedule Weekly Pulse</h1>
        <p>Configure when and where to receive your automated weekly insights</p>
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

      {savedPrefs && (
        <div className="alert alert-success">
          <strong>✅ Schedule Active!</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            You will receive your weekly pulse every{' '}
            <strong>{DAYS_OF_WEEK.find(d => d.value === savedPrefs.preferred_day_of_week)?.label}</strong>{' '}
            at <strong>{savedPrefs.preferred_time}</strong> ({savedPrefs.timezone}){' '}
            to <strong>{savedPrefs.email}</strong>.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            Next scheduled send: {getNextSendDate()}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Email Preferences</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={prefs.email}
              onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="day">
                Preferred Day
              </label>
              <select
                id="day"
                className="form-select"
                value={prefs.preferred_day_of_week}
                onChange={(e) => setPrefs({ ...prefs, preferred_day_of_week: parseInt(e.target.value) })}
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="time">
                Preferred Time (24h format)
              </label>
              <input
                type="time"
                id="time"
                className="form-input"
                value={prefs.preferred_time}
                onChange={(e) => setPrefs({ ...prefs, preferred_time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="timezone">
                Timezone
              </label>
              <select
                id="timezone"
                className="form-select"
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Schedule'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ background: '#e3f2fd', border: '1px solid var(--secondary)' }}>
        <h3 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>ℹ️ How It Works</h3>
        <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
          <li>Your weekly pulse will be automatically generated and sent on your chosen day/time</li>
          <li>The email includes: Top 3 themes, 3 user quotes, 3 action ideas, and a summary note</li>
          <li>All content is PII-free and sourced from public Play Store reviews</li>
          <li>You can always generate and send pulses manually from the Pulses page</li>
        </ul>
      </div>
    </div>
  )
}

export default Preferences
