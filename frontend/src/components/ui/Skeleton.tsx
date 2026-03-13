// frontend/src/components/ui/Skeleton.tsx

import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse bg-gray-800 rounded', className)} />
)

export const StatCardSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <Skeleton className="h-4 w-24 mb-3" />
    <Skeleton className="h-8 w-32" />
  </div>
)

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-gray-800">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1">
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
    <Skeleton className="h-8 w-20" />
  </div>
)

export const IntegrationCardSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
)

export const ProjectCardSkeleton = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <Skeleton className="h-5 w-48 mb-2" />
    <Skeleton className="h-4 w-full mb-1" />
    <Skeleton className="h-3 w-32" />
  </div>
)
