import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { PaginationToken } from '@/lib/pagination'
import { cn } from '@/lib/utils'

interface PageNavigationProps {
  currentPage: number
  pageCount: number
  pageTokens: PaginationToken[]
  onPageChange: (page: number) => void
  className?: string
}

export function PageNavigation({
  currentPage,
  pageCount,
  pageTokens,
  onPageChange,
  className,
}: PageNavigationProps) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <Pagination className={cn('mx-0 w-auto justify-start md:justify-end', className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Précédent"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage > 1) {
                onPageChange(currentPage - 1)
              }
            }}
            className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>

        {pageTokens.map((token, index) => (
          <PaginationItem key={typeof token === 'number' ? `page-${token}` : `${token}-${index}`}>
            {typeof token === 'number' ? (
              <PaginationLink
                href="#"
                isActive={token === currentPage}
                onClick={(event) => {
                  event.preventDefault()
                  onPageChange(token)
                }}
              >
                {token}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            text="Suivant"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage < pageCount) {
                onPageChange(currentPage + 1)
              }
            }}
            className={cn(currentPage === pageCount && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
