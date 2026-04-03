import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const PASSWORD = 'MCSP'
const STORAGE_KEY = 'mcsp-case-study-access'

function PasswordGate() {
  const [value, setValue] = React.useState('')
  const [error, setError] = React.useState(false)
  const [granted, setGranted] = React.useState(
    localStorage.getItem(STORAGE_KEY) === 'granted'
  )

  const handleSubmit = (e) => {
    e.preventDefault()

    if (value === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'granted')
      setGranted(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (granted) {
    return <App />
  }

  return (
    <div className="gate-shell">
      <div className="gate-card">
        <div className="gate-kicker">M+C Saatchi Performance</div>
        <h1>Case Study Matchmaker</h1>
        <p className="gate-copy">
          Enter the password to access the site.
        </p>

        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Password"
            className="gate-input"
          />
          <button type="submit" className="gate-button">
            Enter
          </button>
        </form>

        {error && <p className="gate-error">Incorrect password</p>}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PasswordGate />
  </React.StrictMode>,
)
