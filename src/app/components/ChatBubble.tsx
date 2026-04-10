import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatBubbleProps {
  text: string;
  msgId: number; // Incrementing ID — changes on each new message to reset the timer
  position?: 'above' | 'below'; // Whether bubble appears above or below the anchor; defaults to 'below'
}

const DISPLAY_DURATION_MS = 4000;

export function ChatBubble({ text, msgId, position = 'below' }: ChatBubbleProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [msgId]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={msgId}
          initial={{ opacity: 0, y: position === 'above' ? 6 : -6, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === 'above' ? -4 : 4, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className={`absolute ${position === 'above' ? 'bottom-full left-1/2 translate-x-1/2 mb-2' : 'top-full left-1/2 -translate-x-1/2 mt-2'} z-40 pointer-events-none`}
          style={{ minWidth: '60px', maxWidth: '160px' }}
        >
          <div className="bg-white text-gray-900 text-[14px] font-semibold px-2.5 py-1.5 rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.6)] text-center leading-tight break-words relative">
            {position === 'above' ? (
              /* Triangle pointer pointing down */
              <div
                className="absolute top-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid white',
                }}
              />
            ) : (
              /* Triangle pointer pointing up */
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '6px solid white',
                }}
              />
            )}
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
