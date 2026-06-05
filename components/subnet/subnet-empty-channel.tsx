interface SubnetEmptyChannelProps {
  title: string
  description?: string
}

export function SubnetEmptyChannel({ title, description }: SubnetEmptyChannelProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground/80">{description}</p>
      )}
    </div>
  )
}
