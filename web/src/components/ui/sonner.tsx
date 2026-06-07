import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			richColors
			closeButton
			toastOptions={{
				classNames: {
					toast: 'border-border bg-popover text-popover-foreground',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }
