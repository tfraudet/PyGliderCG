import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { apiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface QueryErrorAlertProps {
  error: unknown | null | undefined
  title?: string
  descriptionClassName?: string
}

export function QueryErrorAlert({
  error,
  title,
  descriptionClassName,
}: QueryErrorAlertProps) {
  if (!error) {
    return null
  }

  return (
    <Alert variant="destructive">
      {title ? (
        <>
          <CircleAlert />
          <AlertTitle>{title}</AlertTitle>
        </>
      ) : null}
      <AlertDescription className={cn('whitespace-pre-wrap break-words', descriptionClassName)}>
        {apiError(error)}
      </AlertDescription>
    </Alert>
  )
}
