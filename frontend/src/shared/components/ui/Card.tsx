import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'neon' | 'gradient';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/20 hover:shadow-xl hover:border-white/15 transition-all',
      glass: 'bg-glass border border-white/10 backdrop-blur-2xl shadow-xl shadow-black/20 hover:border-white/20 transition-all',
      neon: 'bg-gradient-to-br from-purple-700/20 via-fuchsia-700/18 to-pink-700/18 border border-white/10 shadow-2xl shadow-fuchsia-500/10 hover:border-fuchsia-500/30 transition-all',
      gradient: 'bg-gradient-to-br from-purple-500/20 via-fuchsia-500/18 to-pink-500/18 border border-white/10 backdrop-blur-xl hover:from-purple-500/30 hover:via-fuchsia-500/30 hover:to-pink-500/30 transition-all',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[28px] p-6 transition-all duration-300',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
