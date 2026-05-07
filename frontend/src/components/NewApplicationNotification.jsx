import { useState, useEffect } from 'react';

export default function NewApplicationNotification({ count, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    console.log('NewApplicationNotification: count=', count, 'isVisible=', isVisible);
    if (!count || count <= 0) {
      console.log('Count is 0 or less, hiding notification');
      setIsVisible(false);
      return;
    }

    console.log('Playing beep for count:', count);
    // Play system beep
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.error('Beep error:', e);
    }

    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      console.log('Auto-dismissing notification');
      setIsVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [count]);

  console.log('Rendering notification: isVisible=', isVisible, 'count=', count);
  if (!isVisible || !count || count <= 0) {
    console.log('Not rendering notification (conditions not met)');
    return null;
  }

  return (
    <>
      <div style={{ position: 'fixed', top: '10px', left: '10px', background: 'red', color: 'white', padding: '10px', zIndex: 9999 }}>
        TEST: Notification rendering! Count={count}
      </div>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm"
             style={{ background: 'var(--color-success)', color: 'white' }}>
          <div className="text-xl">🔔</div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {count} new {count === 1 ? 'application' : 'applications'}
            </p>
            <p className="text-xs opacity-90">Ready for review</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="ml-2 text-white hover:opacity-75 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
