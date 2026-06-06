import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
const SIDEBAR_WIDTH_ICON = '3rem'

type SidebarContext = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | undefined>(undefined)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }
  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ defaultOpen = true, open: openProp, onOpenChange, className, style, children, ...props }, ref) => {
  const [openMobile, setOpenMobile] = React.useState(false)
  const [open, setOpen] = React.useState(openProp ?? defaultOpen)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  React.useEffect(() => {
    if (openProp !== undefined) {
      setOpen(openProp)
    }
  }, [openProp])

  const toggleSidebar = React.useCallback(() => {
    const newState = !open
    setOpen(newState)
    onOpenChange?.(newState)
  }, [open, onOpenChange])

  const state: 'expanded' | 'collapsed' = open ? 'expanded' : 'collapsed'

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, openMobile, isMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn('flex min-h-screen w-full', className)}
        style={{
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = 'SidebarProvider'

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'left' | 'right'
    variant?: 'sidebar' | 'floating' | 'inset'
    collapsible?: 'offcanvas' | 'icon' | 'none'
  }
>(({ side = 'left', variant = 'sidebar', collapsible = 'icon', className, children, ...props }, ref) => {
  const { state, openMobile, setOpenMobile, isMobile } = useSidebar()
 
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/80"
          onClick={() => setOpenMobile(false)}
        />
      )}
 
      <aside
        ref={ref}
        className={cn(
          'flex flex-col fixed left-0 top-0 z-40 h-screen w-[--sidebar-width] border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out md:relative md:z-0',
          state === 'collapsed' && 'w-[--sidebar-width-icon]',
          isMobile && !openMobile && '-translate-x-full',
          className
        )}
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
          } as React.CSSProperties
        }
        {...props}
      >
        {!isMobile && children}
      </aside>
 
      {/* Mobile overlay sidebar */}
      {isMobile && (
        <aside
          className={cn(
            'flex flex-col fixed left-0 inset-y-0 z-50 w-[--sidebar-width-mobile] border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out',
            openMobile ? 'translate-x-0' : '-translate-x-full'
          )}
          style={
            {
              '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </aside>
      )}
    </>
  )
})
Sidebar.displayName = 'Sidebar'

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, isMobile, setOpenMobile, openMobile } = useSidebar()

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md p-2 hover:bg-sidebar-accent',
        className
      )}
      onClick={(e) => {
        if (isMobile) {
          setOpenMobile(!openMobile)
        } else {
          toggleSidebar()
        }
        onClick?.(e)
      }}
      {...props}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <path d="M9 3v18"/>
      </svg>
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
})
SidebarTrigger.displayName = 'SidebarTrigger'

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative flex w-full flex-1 flex-col overflow-hidden', className)}
      {...props}
    />
  )
)
SidebarInset.displayName = 'SidebarInset'

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-1 flex-col gap-0 overflow-y-auto px-2 py-4', className)} {...props} />
  )
)
SidebarContent.displayName = 'SidebarContent'

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 p-4', className)} {...props} />
  )
)
SidebarHeader.displayName = 'SidebarHeader'

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 border-t border-sidebar-border p-4', className)} {...props} />
  )
)
SidebarFooter.displayName = 'SidebarFooter'

const SidebarSeparator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn('mx-2 my-2 border-sidebar-border', className)} {...props} />
  )
)
SidebarSeparator.displayName = 'SidebarSeparator'

const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
  )
)
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('group/menu-item relative', className)} {...props} />
)
SidebarMenuItem.displayName = 'SidebarMenuItem'

const sidebarMenuButtonVariants = cva('peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]/sidebar/:-w-10 group-data-[collapsible=icon]/sidebar/:!p-0 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    isActive: {
      true: 'bg-sidebar-accent text-sidebar-accent-foreground',
      false: 'text-sidebar-foreground',
    },
    size: {
      default: 'h-8',
      sm: 'h-7',
      lg: 'h-12',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ReactNode
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive, size, className, tooltip, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      className={cn(sidebarMenuButtonVariants({ isActive, size }), className)}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => (
  <div ref={ref} className={cn('flex w-full animate-pulse flex-col gap-2', className)} {...props}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2 rounded-md p-2">
        {showIcon && <div className="size-4 rounded-md bg-sidebar-accent" />}
        <div className="h-4 w-full rounded-md bg-sidebar-accent" />
      </div>
    ))}
  </div>
))
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

export {
  Sidebar,
  SidebarProvider,
  useSidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton,
}
