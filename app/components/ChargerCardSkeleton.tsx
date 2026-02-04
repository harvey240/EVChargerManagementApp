export default function ChargerCardSkeleton() {
    return (
        <div className="p-6 rounded-lg border-2 border-gray-200 bg-gray-50 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-4">
                <div className="h-7 bg-gray-300 rounded w-32"></div>
                <div className="h-7 bg-gray-300 rounded-full w-24"></div>
            </div>

            {/* Button Skeleton */}
            <div className="mt-4">
                <div className="h-10 bg-gray-300 rounded w-full"></div>
            </div>

        </div>

    );
}