'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-screen bg-white text-black text-center p-6">
      <div>
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-4 text-lg">Sorry, an unexpected error occurred.</p>
        <button
          onClick={reset}
          className="mt-6 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
