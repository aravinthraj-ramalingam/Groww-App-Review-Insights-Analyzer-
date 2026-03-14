import { useState, useEffect } from 'react'
import { reviewsApi } from '../services/api'
import { Review } from '../types'

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    week_start: '',
    minRating: '',
    maxRating: ''
  })

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.week_start) params.week_start = filters.week_start
      if (filters.minRating) params.minRating = parseInt(filters.minRating)
      if (filters.maxRating) params.maxRating = parseInt(filters.maxRating)
      
      const response = await reviewsApi.list(params)
      setReviews(response.data)
    } catch (err) {
      console.error('Failed to load reviews:', err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const applyFilters = () => {
    loadReviews()
  }

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
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
        <h1>Reviews</h1>
        <p>Browse and filter stored reviews from Google Play Store</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Filters</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Week Starting</label>
            <input
              type="date"
              name="week_start"
              className="form-input"
              value={filters.week_start}
              onChange={handleFilterChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Min Rating</label>
            <select
              name="minRating"
              className="form-select"
              value={filters.minRating}
              onChange={handleFilterChange}
            >
              <option value="">Any</option>
              <option value="1">1 ★</option>
              <option value="2">2 ★</option>
              <option value="3">3 ★</option>
              <option value="4">4 ★</option>
              <option value="5">5 ★</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Max Rating</label>
            <select
              name="maxRating"
              className="form-select"
              value={filters.maxRating}
              onChange={handleFilterChange}
            >
              <option value="">Any</option>
              <option value="1">1 ★</option>
              <option value="2">2 ★</option>
              <option value="3">3 ★</option>
              <option value="4">4 ★</option>
              <option value="5">5 ★</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={applyFilters}>
            Apply Filters
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Review List</h2>
          <span style={{ color: 'var(--text-light)' }}>{reviews.length} reviews found</span>
        </div>
        
        {reviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No reviews found. Try adjusting your filters or scrape new reviews.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Date</th>
                  <th>Week</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td style={{ color: '#ffb800', fontSize: '1.1rem' }}>
                      {getRatingStars(review.rating)}
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <strong>{review.title || '(No title)'}</strong>
                    </td>
                    <td style={{ maxWidth: '400px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {review.clean_text || review.text}
                      </div>
                    </td>
                    <td>{new Date(review.created_at).toLocaleDateString()}</td>
                    <td>{review.week_start}</td>
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

export default Reviews
