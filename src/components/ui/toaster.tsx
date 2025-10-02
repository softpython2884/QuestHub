
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import React from "react"

// Fonction pour jouer le son de notification
function playNotificationSound() {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Fréquence A5

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Volume pour éviter le "clic"
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}


export function Toaster() {
  const { toasts } = useToast()
  const previousToastsRef = React.useRef(toasts);

  React.useEffect(() => {
    // Détecte si un nouveau toast a été ajouté
    if (toasts.length > previousToastsRef.current.length) {
      // S'assure que le son n'est joué que pour les nouveaux toasts
      const newToast = toasts[0];
      const isNew = !previousToastsRef.current.some(t => t.id === newToast.id);
      if(isNew) {
        playNotificationSound();
      }
    }
    previousToastsRef.current = toasts;
  }, [toasts]);


  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
