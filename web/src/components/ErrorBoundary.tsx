import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-md space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
            <h1 className="text-base font-semibold text-destructive">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              type="button"
              className="text-xs text-primary underline underline-offset-2"
              onClick={() => this.setState({ error: null })}
            >
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
