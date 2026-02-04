"use-client";

import { useUser } from "../providers/UserProvider";

export default function UserMenu() {
  const user = useUser();
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleLogout = () => {
    if (isDevelopment) {
      alert("Logout only works in production with EasyAuth enabled.");
      return;
    }

    window.location.href = "/.auth/logout";
  };

  return (
    <div className='flex items-center gap-4'>
      <button
        onClick={handleLogout}
        className='p-2 rounded-lg font-semibold text-sm text-white bg-stone-700  dark:bg-gray700 hover:bg-gray-300 dark:hover:bg-gray-600 tranition-colors'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M16 17l5-5-5-5M19.8 12H9M10 3H4v18h6' />
        </svg>
      </button>
    </div>
  );
}
