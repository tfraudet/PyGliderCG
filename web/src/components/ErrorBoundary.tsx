import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface Props { children: ReactNode }
interface State { error: Error | null }

function getErrorMessage(error: Error): string {
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }

  return 'Une erreur inattendue est survenue.'
}

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
          <div className="flex w-full max-w-md flex-col gap-4">
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Une erreur est survenue</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">
                {getErrorMessage(this.state.error)}
              </AlertDescription>
            </Alert>
            <div className="flex justify-start">
              <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
