'use client';

import React from 'react';
import { Music } from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsProps {
  lyrics?: LyricLine[];
  currentTime: number;
}

export const Lyrics = ({ lyrics, currentTime }: LyricsProps) => {
  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-text-muted gap-4">
        <div className="p-4 rounded-full bg-white/5">
          <Music className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium opacity-40 italic">Chưa có lời bài hát cho bài này</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6 py-8">
        {lyrics.map((line, index) => {
          const isActive = currentTime >= line.time && (index === lyrics.length - 1 || currentTime < lyrics[index + 1].time);
          
          return (
            <div
              key={index}
              className={`transition-all duration-500 transform ${
                isActive 
                  ? 'text-white scale-105 origin-left font-bold opacity-100' 
                  : 'text-white/30 scale-100 font-medium opacity-100'
              }`}
            >
              <p className="text-xl md:text-2xl leading-relaxed">
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
