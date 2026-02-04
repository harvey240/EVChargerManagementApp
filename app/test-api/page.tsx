"use client";

export default function TestApiPage() {
  const testStart = async () => {
    const response = await fetch("/api/chargers/start?id=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: "test@company.com" }),
    });
    const data = await response.json();
    console.log("Start Response:", data);
    alert(JSON.stringify(data, null, 2));
  };

  const testStop = async () => {
    const response = await fetch("/api/chargers/stop?id=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: "test@company.com" }),
    });

    const data = await response.json();
    console.log("Stop Response:", data);
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>API Test Page</h1>
      <div className='space-y-4'>
        <button
          onClick={testStart}
          className='bg-green-500 text-white px-4 py-2 rounded'
        >
          Test Start Charger 1
        </button>
        <button
          onClick={testStop}
          className='bg-red-500 text-white px-4 py-2 rounded ml-4'
        >
          Test Stop Charger 1
        </button>
      </div>
    </div>
  );
}
