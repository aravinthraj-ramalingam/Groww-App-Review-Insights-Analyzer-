import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './views/Dashboard'
import Reviews from './views/Reviews'
import Pulses from './views/Pulses'
import Preferences from './views/Preferences'
import PulseDetail from './views/PulseDetail'

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="container navbar-content">
          <NavLink to="/" className="logo">
            Groww Insights
          </NavLink>
          <ul className="nav-links">
            <li>
              <NavLink to="/" end>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/reviews">
                Reviews
              </NavLink>
            </li>
            <li>
              <NavLink to="/pulses">
                Pulses
              </NavLink>
            </li>
            <li>
              <NavLink to="/preferences">
                Schedule
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/pulses" element={<Pulses />} />
            <Route path="/pulses/:id" element={<PulseDetail />} />
            <Route path="/preferences" element={<Preferences />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
