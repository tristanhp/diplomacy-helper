import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Diplomacy Helper v2</h1>
          <p className="text-gray-400">A new and improved Diplomacy board game assistant</p>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Version 2</h2>
            <p className="text-gray-300 mb-4">
              This is a fresh start for the Diplomacy Helper application. 
              Version 1 is preserved in the v1 directory for reference.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">🎯 Goals for v2</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Improved architecture</li>
                  <li>• Better user experience</li>
                  <li>• Enhanced performance</li>
                  <li>• Modern design patterns</li>
                </ul>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="text-lg font-medium mb-2">🚀 Tech Stack</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• React 18</li>
                  <li>• TypeScript 5</li>
                  <li>• Vite</li>
                  <li>• Tailwind CSS</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
