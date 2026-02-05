'use client';

import React from 'react';
import { Attachment } from 'stream-chat-react';
import type { Attachment as StreamAttachment } from 'stream-chat';

interface CustomAttachmentProps {
  attachments: StreamAttachment[];
  actionHandler?: (dataOrName?: string | Record<string, string>, value?: string, event?: React.BaseSyntheticEvent) => Promise<void> | void;
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

        // Message vocal : déléguer au composant par défaut (waveform + contrôle vitesse)
        if (attachment.type === 'voiceRecording') {
          return (
            <Attachment
              key={attachment.asset_url || index}
              attachments={[attachment]}
              actionHandler={actionHandler}
            />
          );
        }

        // Lecteur audio personnalisé (fichiers audio classiques, pas les messages vocaux)
        if (isAudio && attachment.asset_url) {
          return (
            <div key={attachment.asset_url || index} className="custom-audio-attachment p-3 bg-gray-100 rounded-lg max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎵</span>
                <span className="text-sm font-medium text-gray-700 truncate">
                  {attachment.title || 'Audio'}
                </span>
              </div>
              <audio
                controls
                className="w-full"
                preload="auto"
                src={attachment.asset_url}
              >
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            </div>
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
