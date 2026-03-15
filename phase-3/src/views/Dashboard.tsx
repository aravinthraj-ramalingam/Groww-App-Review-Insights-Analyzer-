import { useState, useEffect } from 'react'
import { reviewsApi, themesApi, pulsesApi } from '../services/api'
import { DashboardStats, WeeklyPulse, Theme } from '../types'

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [latestPulse, setLatestPulse] = useState<WeeklyPulse | null>(null)
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, pulsesRes, themesRes] = await Promise.all([
        reviewsApi.getStats().catch(() => ({ data: { totalReviews: 0, totalThemes: 0, lastPulseDate: null, weeksCovered: 0 } })),
        pulsesApi.list(1).catch(() => ({ data: [] })),
        themesApi.list().catch(() => ({ data: [] }))
      ])
      
      setStats(statsRes.data)
      setLatestPulse(pulsesRes.data[0] || null)
      setThemes(themesRes.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleScrape = async () => {
    setActionLoading('scrape')
    try {
      await reviewsApi.scrape(12)
      setMessage({ type: 'success', text: 'Review scraping initiated successfully!' })
      loadDashboardData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to scrape reviews' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateThemes = async () => {
    setActionLoading('themes')
    try {
      await themesApi.generate()
      setMessage({ type: 'success', text: 'Themes generated successfully!' })
      loadDashboardData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to generate themes' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignThemes = async () => {
    setActionLoading('assign')
    try {
      const weekStart = getCurrentWeekStart()
      await themesApi.assign(weekStart)
      setMessage({ type: 'success', text: 'Themes assigned to reviews successfully!' })
      loadDashboardData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to assign themes' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleGeneratePulse = async () => {
    setActionLoading('pulse')
    try {
      const weekStart = getCurrentWeekStart()
      await pulsesApi.generate(weekStart)
      setMessage({ type: 'success', text: 'Weekly pulse generated successfully!' })
      loadDashboardData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to generate pulse' })
    } finally {
      setActionLoading(null)
    }
  }

  const getCurrentWeekStart = (): string => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().slice(0, 10)
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
        <h1>Dashboard</h1>
        <p>Overview of your Groww app review insights</p>
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalReviews || 0}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{themes.length}</div>
          <div className="stat-label">Active Themes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.weeksCovered || 0}</div>
          <div className="stat-label">Weeks Covered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{latestPulse ? new Date(latestPulse.week_start).toLocaleDateString() : '—'}</div>
          <div className="stat-label">Latest Pulse</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleScrape}
            disabled={actionLoading === 'scrape'}
          >
            {actionLoading === 'scrape' ? 'Scraping...' : '📥 Scrape Reviews'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleGenerateThemes}
            disabled={actionLoading === 'themes'}
          >
            {actionLoading === 'themes' ? 'Generating...' : '🏷️ Generate Themes'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleAssignThemes}
            disabled={actionLoading === 'assign'}
          >
            {actionLoading === 'assign' ? 'Assigning...' : '🔗 Assign Themes'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleGeneratePulse}
            disabled={actionLoading === 'pulse'}
          >
            {actionLoading === 'pulse' ? 'Generating...' : '📊 Generate Weekly Pulse'}
          </button>
        </div>
      </div>

      {latestPulse && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Latest Weekly Pulse</h2>
            <span style={{ color: 'var(--text-light)' }}>
              Week of {new Date(latestPulse.week_start).toLocaleDateString()}
            </span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Top Themes:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              {latestPulse.top_themes.map((theme, i) => (
                <li key={i}>{theme.name} ({theme.review_count} reviews)</li>
              ))}
            </ul>
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
            Word count: {latestPulse.note_body.split(/\s+/).filter(Boolean).length} / 250
          </div>
        </div>
      )}

      <div className="card" style={{ background: '#e6f7f1', border: '1px solid var(--primary)' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>ℹ️ About This Tool</h3>
        <p style={{ fontSize: '0.95rem' }}>
          This internal tool analyzes public Google Play Store reviews for the Groww app. 
          All data is PII-free. Use the navigation above to explore reviews, view generated pulses, 
          or schedule automated email delivery.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
