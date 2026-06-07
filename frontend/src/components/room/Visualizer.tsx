'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface VisualizerProps {
  isPlaying: boolean;
}

export const Visualizer = ({ isPlaying }: VisualizerProps) => {
  // Create 20 bars for the visualizer
  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);

  return (
    <div className="flex items-end justify-center gap-[3px] h-12 w-full px-4 overflow-hidden">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500/40 via-emerald-400 to-emerald-300"
          animate={
            isPlaying
              ? {
                  height: [
                    '20%',
                    `${Math.random() * 60 + 40}%`,
                    `${Math.random() * 40 + 20}%`,
                    `${Math.random() * 70 + 30}%`,
                    '20%',
                  ],
                }
              : { height: '15%' }
          }
          transition={{
            duration: isPlaying ? Math.random() * 0.5 + 0.6 : 1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
};
