// src/app/test-discover/page.tsx - Test API discover sans erreurs TypeScript
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name?: string;
  email?: string;
  compatibility: number;
}

interface Stats {
  totalUsers: number;
  excludedCount: number;
  discoverableCount: number;
  breakdown: {
    alreadyLiked: number;
    alreadyDisliked: number;
    alreadyMatched: number;
  };
}

export default function TestDiscoverPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const testDiscoverAPI = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Test API Discover...');
      
      const response = await fetch('/api/discover');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setUsers(data.users || []);
      setStats(data.stats || null);
      setTestResults(data);
      
      console.log('Résultats API Discover:', data);
      
    } catch (err: any) {
      console.error('Erreur test discover:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testMatchesAPI = async () => {
    try {
      console.log('Test API Matches...');
      
      const response = await fetch('/api/matches');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('Résultats API Matches:', data);
      
      alert(`Matches trouvés: ${data.matches?.length || 0}\nVoir la console pour détails`);
      
    } catch (err: any) {
      console.error('Erreur test matches:', err);
      alert(`Erreur matches: ${err.message}`);
    }
  };

  const testLike = async (targetUserId: string) => {
    try {
      console.log('Test Like vers:', targetUserId);
      
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like',
          targetUserId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('Résultat like:', result);
      
      if (result.isMatch) {
        alert(`MATCH avec ${result.targetUser?.name || targetUserId} !`);
      } else {
        alert(`Like envoyé à ${result.targetUser?.name || targetUserId}`);
      }
      
      testDiscoverAPI();
      
    } catch (err: any) {
      console.error('Erreur test like:', err);
      alert(`Erreur like: ${err.message}`);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      testDiscoverAPI();
    }
  }, [status]);

  if (status === 'loading') {
    return <div className="p-8">Chargement session...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="p-8">Non connecté</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Test API Discover</h1>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={testDiscoverAPI}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Test en cours...' : 'Tester API Discover'}
            </button>
            
            <button
              onClick={testMatchesAPI}
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
            >
              Tester API Matches
            </button>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <strong>Utilisateur connecté:</strong> {session?.user?.email}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h3 className="font-bold text-red-800">Erreur:</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {testResults?.stats && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <h3 className="font-bold text-blue-800 mb-2">Statistiques de filtrage:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total utilisateurs</div>
                  <div className="font-bold">{testResults.stats.totalUsers}</div>
                </div>
                <div>
                  <div className="text-gray-600">Exclus</div>
                  <div className="font-bold text-red-600">{testResults.stats.excludedCount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Découvrables</div>
                  <div className="font-bold text-green-600">{testResults.stats.discoverableCount}</div>
                </div>
                <div>
                  <div className="text-gray-600">Matchés</div>
                  <div className="font-bold text-pink-600">{testResults.stats.breakdown.alreadyMatched}</div>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                <strong>Détail exclusions:</strong>
                <ul className="mt-1">
                  <li>Déjà likés: {testResults.stats.breakdown.alreadyLiked}</li>
                  <li>Déjà dislikés: {testResults.stats.breakdown.alreadyDisliked}</li>
                  <li>Déjà matchés: {testResults.stats.breakdown.alreadyMatched}</li>
                </ul>
              </div>
            </div>
          )}

          {users.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-bold text-green-800 mb-3">
                Utilisateurs découvrables ({users.length}):
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <div className="font-medium">
                        {user.name || user.email?.split('@')[0]}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.id} | Compatibilité: {user.compatibility}%
                      </div>
                    </div>
                    <button
                      onClick={() => testLike(user.id)}
                      className="px-3 py-1 bg-pink-500 text-white rounded text-sm hover:bg-pink-600"
                    >
                      Liker
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {users.length === 0 && !isLoading && !error && testResults && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h3 className="font-bold text-yellow-800">Aucun utilisateur découvrable</h3>
              <p className="text-yellow-600 text-sm mt-1">
                Tous les utilisateurs ont déjà été likés, dislikés ou matchés.
              </p>
              {testResults.stats?.breakdown?.alreadyMatched > 0 && (
                <p className="text-green-600 text-sm mt-2 font-medium">
                  Vous avez {testResults.stats.breakdown.alreadyMatched} match(s) !
                </p>
              )}
            </div>
          )}
        </div>

        {testResults && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-2">Données brutes:</h3>
            <pre className="text-xs bg-white p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}