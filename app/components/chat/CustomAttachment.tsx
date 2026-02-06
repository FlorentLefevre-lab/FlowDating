'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Attachment } from 'stream-chat-react';
import type { Attachment as StreamAttachment } from 'stream-chat';

interface CustomAttachmentProps {
  attachments: StreamAttachment[];
  actionHandler?: (dataOrName?: string | Record<string, string>, value?: string, event?: React.BaseSyntheticEvent) => Promise<void> | void;
}

// Composant audio avec gestion d'erreur pour Firefox
function AudioPlayer({ src, title, isVoiceMessage = false }: { src: string; title?: string; isVoiceMessage?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const errorCode = audio.error?.code;
    const errorMessage = audio.error?.message;

    console.warn('Audio playback error:', { errorCode, errorMessage, src });

    // Ignorer les erreurs d'abandon utilisateur sur Firefox
    if (errorMessage?.includes('aborted')) {
      return;
    }

    setError('Impossible de lire ce fichier audio');
  }, [src]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Sur Firefox, forcer le chargement avant la lecture
      if (audioRef.current.readyState < 2) {
        audioRef.current.load();
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Play failed:', err);
        // Réessayer après un court délai
        setTimeout(() => {
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        }, 100);
      });
    }
  }, [isPlaying]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-w-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-2 block"
        >
          Télécharger le fichier
        </a>
      </div>
    );
  }

  // Affichage compact pour les messages vocaux
  if (isVoiceMessage) {
    return (
      <div className="voice-message-player flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl max-w-xs border border-purple-100">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isPlaying ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1 bg-purple-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-100"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <audio
          ref={audioRef}
          preload="metadata"
          crossOrigin="anonymous"
          onError={handleError}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={() => setIsPlaying(false)}
        >
          <source src={src} type="audio/mpeg" />
          <source src={src} type="audio/mp4" />
          <source src={src} type="audio/ogg" />
          <source src={src} type="audio/wav" />
        </audio>
      </div>
    );
  }

  // Affichage standard pour les fichiers audio
  return (
    <div className="custom-audio-attachment p-3 bg-gray-100 rounded-lg max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🎵</span>
        <span className="text-sm font-medium text-gray-700 truncate">
          {title || 'Audio'}
        </span>
        {isLoading && (
          <span className="text-xs text-gray-500">Chargement...</span>
        )}
      </div>
      <audio
        ref={audioRef}
        controls
        className="w-full"
        preload="metadata"
        crossOrigin="anonymous"
        onError={handleError}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
      >
        <source src={src} type="audio/mpeg" />
        <source src={src} type="audio/mp4" />
        <source src={src} type="audio/ogg" />
        <source src={src} type="audio/wav" />
        Votre navigateur ne supporte pas la lecture audio.
      </audio>
    </div>
  );
}

// Composant personnalisé pour les pièces jointes avec support audio/vidéo
export function CustomAttachment({ attachments, actionHandler }: CustomAttachmentProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="custom-attachments space-y-2">
      {attachments.map((attachment, index) => {
        // Vérifier si c'est un fichier audio
        const isAudio =
          attachment.type === 'audio' ||
          attachment.mime_type?.startsWith('audio/') ||
          attachment.asset_url?.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i) ||
          attachment.title?.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);

        // Vérifier si c'est un fichier vidéo
        const isVideo =
          attachment.type === 'video' ||
          attachment.mime_type?.startsWith('video/') ||
          attachment.asset_url?.match(/\.(mp4|webm|mov|avi|mkv)$/i) ||
          attachment.title?.match(/\.(mp4|webm|mov|avi|mkv)$/i);

        // Message vocal : utiliser notre lecteur personnalisé (meilleur support Firefox)
        if (attachment.type === 'voiceRecording' && attachment.asset_url) {
          return (
            <AudioPlayer
              key={attachment.asset_url || index}
              src={attachment.asset_url}
              isVoiceMessage={true}
            />
          );
        }

        // Lecteur audio personnalisé (fichiers audio classiques, pas les messages vocaux)
        if (isAudio && attachment.asset_url) {
          return (
            <AudioPlayer
              key={attachment.asset_url || index}
              src={attachment.asset_url}
              title={attachment.title}
            />
          );
        }

        // Lecteur vidéo personnalisé
        if (isVideo && attachment.asset_url) {
          return (
            <div key={attachment.asset_url || index} className="custom-video-attachment rounded-lg overflow-hidden max-w-md">
              <video
                controls
                crossOrigin="anonymous"
                className="w-full"
                preload="metadata"
              >
                <source src={attachment.asset_url} type={attachment.mime_type || 'video/mp4'} />
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
              {attachment.title && (
                <div className="p-2 bg-gray-100 text-sm text-gray-600 truncate">
                  {attachment.title}
                </div>
              )}
            </div>
          );
        }

        // Utiliser le composant par défaut pour les autres types
        return (
          <Attachment
            key={attachment.asset_url || attachment.image_url || index}
            attachments={[attachment]}
            actionHandler={actionHandler}
          />
        );
      })}
    </div>
  );
}

export default CustomAttachment;
