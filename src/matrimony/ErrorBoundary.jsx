import { Component } from 'react'

// Shows an error message instead of a blank white page if a screen crashes
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Matrimony crashed:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20 }}>
          <div className="mm-banner bad">Something went wrong: {String(this.state.error.message || this.state.error)}</div>
          <button className="btn" onClick={this.props.onBack}>← Back</button>
        </div>
      )
    }
    return this.props.children
  }
}
