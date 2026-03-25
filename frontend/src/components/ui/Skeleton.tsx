// frontend/src/components/ui/Skeleton.tsx

import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse bg-dark-800/80 rounded', className)} />
)

export const StatCardSkeleton = () => (
  <div className="card rounded-2xl p-6 animate-slide-up">
    <Skeleton className="h-10 w-12 rounded-xl mb-4 bg-dark-700/50" />
    <Skeleton className="h-8 w-24 rounded-lg" />
    <Skeleton className="h-4 w-16 mt-3 rounded" />
  </div>
)

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-dark-800/50 animate-slide-up">
    <Skeleton className="h-10 w-10 rounded-full bg-dark-800/80" />
    <div className="flex-1">
      <Skeleton className="h-4 w-48 mb-2 rounded bg-dark-800/80" />
      <Skeleton className="h-3 w-32 rounded bg-dark-800/80" />
    </div>
    <Skeleton className="h-8 w-20 rounded-lg bg-dark-800/80" />
  </div>
)

export const IntegrationCardSkeleton = () => (
  <div className="card rounded-2xl p-6 animate-slide-up">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="h-12 w-12 rounded-xl bg-dark-800/80" />
      <div className="flex-1">
        <Skeleton className="h-5 w-24 mb-2 rounded bg-dark-800/80" />
        <Skeleton className="h-4 w-32 rounded bg-dark-800/80" />
      </div>
    </div>
    <Skeleton className="h-10 w-full rounded-xl bg-dark-800/80" />
  </div>
)

export const ProjectCardSkeleton = () => (
  <div className="card rounded-2xl p-5 animate-slide-up">
    <Skeleton className="h-5 w-48 mb-2 rounded bg-dark-800/80" />
    <Skeleton className="h-4 w-full mb-1 rounded bg-dark-800/80" />
    <Skeleton className="h-3 w-32 rounded bg-dark-800/80" />
  </div>
)
