import { cn } from '@/lib/utils';
import icon from '../../../assets/icon.svg';
export const User = ({ ready }: { ready: boolean }) => {
  return (
    <span
      className="absolute left-2 top-3 py-1 w-7 h-7 flex justify-center items-center bg-secondary rounded-md cursor-move dark:bg-blue-950"
      id="drag-region"
    >
      <img
        className={cn('w-6 h-6', ready ? 'opacity-100' : 'opacity-30')}
        src={icon}
        alt="Chat-spot Logo"
      />
    </span>
  );
};

export const Bot = ({ waiting }: { waiting: boolean }) => {
  return (
    <span className="text-xl bg-secondary px-1 rounded-md w-7 h-7 text-center flex justify-center items-center dark:bg-blue-950">
      {waiting ? <span className="animate-bounce">🥸</span> : '🥸'}
    </span>
  );
};
