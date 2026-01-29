// src/components/discover/ProfileDiagnostic.tsx
'use client';
import { SimpleLoading, SimpleError, Button, Card } from '@/components/ui';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  EyeIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface DiagnosticData {
  totalProfiles: number;
  viewedProfiles: number;
  availableProfiles: number;
  viewedPercentage: number;
  needsReset: boolean;
  needsMoreProfiles: boolean;
}

interface DiagnosticResponse {
  success: boolean;
  diagnostic: DiagnosticData;
  profiles: any[];
  suggestions: {
    needsReset: boolean;
    needsMoreProfiles: boolean;
    message: string;
  };
}

const ProfileDiagnostic: React.FC<{
  onProfilesUpdated?: (count: number) => void;
}> = ({ onProfilesUpdated }) => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      console.log('🔍 Lancement du diagnostic...');
      const response = await fetch('/api/discover?diagnostic=true');
      const data: DiagnosticResponse = await response.json();
      
      if (data.success) {
        setDiagnostic(data.diagnostic);
        setSuggestions(data.suggestions);
        console.log('📊 Diagnostic reçu:', data.diagnostic);
      }
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoFix = async () => {
    if (!diagnostic || !suggestions) return;
    
    setFixing(true);
    try {
      let fixApplied = false;

      // Fix 1: Reset si nécessaire
      if (suggestions.needsReset) {
        console.log('🔧 Application du reset...');
        await fetch('/api/discover?reset=true');
        fixApplied = true;
      }

      // Fix 2: Générer plus de profils si nécessaire
      if (suggestions.needsMoreProfiles) {
        console.log('🔧 Génération de profils supplémentaires...');
        // Cette logique est déjà dans l'API
        fixApplied = true;
      }

      if (fixApplied) {
        console.log('✅ Corrections appliquées, nouveau diagnostic...');
        await runDiagnostic();
        
        // Informer le parent qu'il y a de nouveaux profils
        const newProfilesResponse = await fetch('/api/discover');
        const newProfilesData = await newProfilesResponse.json();
        onProfilesUpdated?.(newProfilesData.profiles?.length || 0);
      }

    } catch (error) {
      console.error('❌ Erreur auto-fix:', error);
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getHealthStatus = () => {
    if (!diagnostic) return 'unknown';
    
    if (diagnostic.availableProfiles === 0) return 'critical';
    if (diagnostic.availableProfiles < 5) return 'warning';
    if (diagnostic.viewedPercentage > 80) return 'warning';
    return 'good';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const healthStatus = getHealthStatus();
  const healthColorClass = getHealthColor(healthStatus);

  if (!showDiagnostic && healthStatus === 'good') {
    return (
      <button
        onClick={() => setShowDiagnostic(true)}
        className="fixed bottom-4 right-4 bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Diagnostic des profils"
      >
        <ChartBarIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 mb-4 ${healthColorClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5" />
          <h3 className="font-semibold">Diagnostic des Profils</h3>
          {healthStatus === 'critical' && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
          {healthStatus === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />}
          {healthStatus === 'good' && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="p-2 text-sm bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors disabled:opacity-50"
            title="Actualiser le diagnostic"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {showDiagnostic && healthStatus === 'good' && (
            <button
              onClick={() => setShowDiagnostic(false)}
              className="p-2 text-sm bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
       <SimpleLoading message="ChargeAnalyse en cours ..." />
      ) : diagnostic ? (
        <div className="space-y-4">
          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <UserGroupIcon className="w-4 h-4 mr-1" />
                <span className="text-lg font-bold">{diagnostic.totalProfiles}</span>
              </div>
              <p className="text-xs">Total</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <EyeIcon className="w-4 h-4 mr-1" />
                <span className="text-lg font-bold">{diagnostic.viewedProfiles}</span>
              </div>
              <p className="text-xs">Vus ({diagnostic.viewedPercentage}%)</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <SparklesIcon className="w-4 h-4 mr-1" />
                <span className="text-lg font-bold">{diagnostic.availableProfiles}</span>
              </div>
              <p className="text-xs">Disponibles</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${diagnostic.viewedPercentage}%`,
                backgroundColor: diagnostic.viewedPercentage > 80 ? '#ef4444' :
                                diagnostic.viewedPercentage > 60 ? '#f59e0b' : '#10b981'
              }}
            ></div>
          </div>

          {/* Message de suggestions */}
          {suggestions && (
            <div className="text-sm">
              <p className="mb-2">{suggestions.message}</p>
              
              {/* Actions recommandées */}
              {(suggestions.needsReset || suggestions.needsMoreProfiles) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase tracking-wide">Actions recommandées :</h4>
                  
                  {suggestions.needsReset && (
                    <div className="flex items-center justify-between bg-white bg-opacity-50 rounded p-2">
                      <span className="text-xs">Reset des profils vus</span>
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  )}
                  
                  {suggestions.needsMoreProfiles && (
                    <div className="flex items-center justify-between bg-white bg-opacity-50 rounded p-2">
                      <span className="text-xs">Ajouter plus de profils</span>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bouton Auto-Fix */}
          {(suggestions?.needsReset || suggestions?.needsMoreProfiles) && (
            <button
              onClick={autoFix}
              disabled={fixing}
              className="w-full bg-white bg-opacity-75 hover:bg-opacity-100 text-current py-2 px-4 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {fixing ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Correction en cours...
                </>
              ) : (
                <>
                  <CogIcon className="w-4 h-4 mr-2" />
                  Corriger automatiquement
                </>
              )}
            </button>
          )}

          {/* Statut de santé */}
          <div className="text-xs text-center opacity-75">
            Statut : {
              healthStatus === 'critical' ? '🔴 Critique' :
              healthStatus === 'warning' ? '🟡 Attention' :
              healthStatus === 'good' ? '🟢 Bon' : '⚪ Inconnu'
            }
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm">Erreur lors du diagnostic</p>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileDiagnostic;