import { Badge } from '@/components/ui/badge'

interface ProviderStatusProps {
  name: string
  configured: boolean
}

export function ProviderStatus({ name, configured }: ProviderStatusProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-mono">{name}</span>
      {configured ? (
        <Badge variant="outline" className="text-xs text-green-400 border-green-700">
          Configured
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
          Not Set
        </Badge>
      )}
    </div>
  )
}
