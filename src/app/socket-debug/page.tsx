// src/app/socket-debug/page.tsx - Diagnostic du SocketProvider
'use client';

import React, { useEffect, useState } from 'react';

export default function SocketDebugPage() {
  const [debug, setDebug] = useState<any>({});

  useEffect(() => {
    const debugInfo: any = {};

    // 1. Chercher dans React DevTools
    if (typeof window !== 'undefined') {
      // Chercher les éléments React
      const reactFiber = (document.querySelector('#__next') as any)?._reactInternalFiber 
        || (document.querySelector('#__next') as any)?._reactInternals;
      
      debugInfo.reactFiber = !!reactFiber;

      // 2. Chercher dans window
      debugInfo.windowKeys = Object.keys(window).filter(key => 
        key.toLowerCase().includes('socket') || 
        key.toLowerCase().includes('provider') ||
        key.toLowerCase().includes('context')
      );

      // 3. Chercher les contextes React
      try {
        // Méthode pour accéder aux contextes (peut ne pas marcher)
        const contexts = [];
        if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          debugInfo.reactDevTools = true;
        }
        debugInfo.contexts = contexts;
      } catch (e) {
        debugInfo.contextError = e.message;
      }

      // 4. Chercher dans les props du composant parent
      const bodyClasses = document.body.className;
      const htmlClasses = document.documentElement.className;
      
      debugInfo.bodyClasses = bodyClasses;
      debugInfo.htmlClasses = htmlClasses;

      // 5. Chercher les data attributes
      const allElements = document.querySelectorAll('*');
      const dataAttrs: string[] = [];
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-') && !dataAttrs.includes(attr.name)) {
            dataAttrs.push(attr.name);
          }
        });
      });
      
      debugInfo.dataAttributes = dataAttrs.slice(0, 10); // Limiter à 10 pour éviter le spam
    }

    setDebug(debugInfo);
  }, []);

  const testSocketConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      alert(`Serveur OK: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Erreur serveur: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Diagnostic Socket Provider</h1>
      
      <div className="space-y-6">
        {/* Test serveur */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Test Serveur Socket.IO</h2>
          <button
            onClick={testSocketConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tester http://localhost:3000/health
          </button>
        </div>

        {/* Debug Window */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Debug Window Object</h2>
          <div className="text-sm space-y-1">
            <div><strong>Keys Socket/Provider:</strong> {JSON.stringify(debug.windowKeys)}</div>
            <div><strong>React DevTools:</strong> {debug.reactDevTools ? '✅' : '❌'}</div>
            <div><strong>React Fiber:</strong> {debug.reactFiber ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* Instructions de recherche manuelle */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">🔍 Recherche Manuelle Nécessaire</h2>
          <div className="text-sm space-y-2">
            <p>Exécutez ces commandes dans votre terminal :</p>
            <div className="bg-gray-800 text-green-400 p-2 rounded font-mono text-xs">
              <div>find src -name "*Socket*" -type f</div>
              <div>find src -name "*Provider*" -type f</div>
              <div>grep -r "createContext" src/</div>
              <div>grep -r "SocketProvider\|SocketContext" src/</div>
            </div>
          </div>
        </div>

        {/* Structure probable */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">🎯 Structure Probable de votre SocketProvider</h2>
          <div className="text-sm space-y-2">
            <p>Votre SocketProvider se trouve probablement dans :</p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs">
              <li>src/contexts/SocketContext.tsx</li>
              <li>src/providers/SocketProvider.tsx</li>
              <li>src/lib/socket/SocketProvider.tsx</li>
              <li>src/components/providers/SocketProvider.tsx</li>
            </ul>
            
            <p className="mt-4">Et ressemble à :</p>
            <pre className="bg-gray-800 text-green-400 p-2 rounded text-xs overflow-x-auto">
{`// SocketProvider.tsx
export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState();
  const [isConnected, setIsConnected] = useState(false);
  
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook d'utilisation
export const useSocket = () => {
  const context = useContext(SocketContext);
  return context;
};`}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">📋 Actions à faire</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Trouvez votre SocketProvider avec les commandes ci-dessus</li>
            <li>Partagez-moi le contenu des fichiers trouvés</li>
            <li>Je vais adapter le ChatSystem pour utiliser votre provider exact</li>
            <li>Vérifiez que la page chat est dans le SocketProvider (layout.tsx)</li>
          </ol>
        </div>

        {/* Raw debug */}
        <details className="bg-gray-100 p-4 rounded-lg">
          <summary className="font-semibold cursor-pointer">🔍 Debug Raw (Cliquez pour voir)</summary>
          <pre className="text-xs mt-2 overflow-x-auto bg-white p-2 rounded">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}