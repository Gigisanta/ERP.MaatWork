import { Card, CardHeader, CardContent, Skeleton } from '@maatwork/ui';

export function PortfolioSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
             <Skeleton className="h-3 w-full" />
             <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
