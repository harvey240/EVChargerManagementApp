import { getCurrentUser } from "../lib/auth";

export async function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4 text-foreground'>
            Authentication Required
          </h1>
          <p className='text-muted-foreground'>
            Please log in to access this application.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}