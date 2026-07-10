import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'kitchen';
  timestamp: Date;
}

interface NotificationContextType {
  notifications: ToastNotification[];
  addNotification: (title: string, message: string, type?: ToastNotification['type']) => void;
  removeNotification: (id: string) => void;
  playChime: (type?: 'success' | 'alert' | 'notification') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Custom sound synthesizer using Web Audio API so it runs offline without external assets
const playSynthSound = (type: 'success' | 'alert' | 'notification' = 'notification') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'success') {
      // Arpeggio of pleasant sounds (C5 -> E5 -> G5)
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        
        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } else if (type === 'alert') {
      // Direct high-attention alert sound (Ding-dong chime)
      const now = ctx.currentTime;
      // High pitch
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.7);

      // Low pitch delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, now + 0.15); // D5
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } else {
      // Simple notification chime
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.warn("Web Audio API not allowed yet by browser policy:", e);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = (title: string, message: string, type: ToastNotification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif: ToastNotification = {
      id,
      title,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotif, ...prev]);
    
    // Play sound depending on notification type
    if (type === 'success') {
      playSynthSound('success');
    } else if (type === 'warning' || type === 'kitchen') {
      playSynthSound('alert');
    } else {
      playSynthSound('notification');
    }

    // Auto-remove native browser-style toast after 6 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 6000);

    // Also trigger native HTML5 Notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/assets/icon.png'
        });
      } catch (e) {
        console.warn("Failed to dispatch native system notification:", e);
      }
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const playChime = (type: 'success' | 'alert' | 'notification' = 'notification') => {
    playSynthSound(type);
  };

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request permission passively, doesn't block
      Notification.requestPermission();
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, playChime }}>
      {children}
      
      {/* Visual in-app notifications container */}
      <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex flex-col gap-1 transition-all duration-300 transform translate-y-0 scale-100 bg-white/95 backdrop-blur-md ${
              notif.type === 'success' ? 'border-emerald-200 text-emerald-900 bg-emerald-50/95 shadow-emerald-100/40' :
              notif.type === 'warning' ? 'border-amber-200 text-amber-900 bg-amber-50/95 shadow-amber-100/40' :
              notif.type === 'kitchen' ? 'border-gold-200 text-church-navy bg-gold-50/95 shadow-gold-100/40' :
              'border-slate-200 text-slate-800 bg-white/95'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-semibold text-sm leading-tight font-display">{notif.title}</h4>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-normal">{notif.message}</p>
            <span className="text-[10px] text-slate-400 mt-1 block self-end font-mono">
              {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
