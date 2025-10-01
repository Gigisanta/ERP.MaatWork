import { useEffect } from 'react';

export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  dependencies: React.DependencyList = []
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = key.toLowerCase().split('+');
      const isCtrl = keys.includes('ctrl') && event.ctrlKey;
      const isAlt = keys.includes('alt') && event.altKey;
      const isShift = keys.includes('shift') && event.shiftKey;
      const mainKey = keys[keys.length - 1];

      const keyMatches = event.key.toLowerCase() === mainKey ||
                        event.code.toLowerCase() === mainKey;

      const ctrlMatch = keys.includes('ctrl') ? isCtrl : !event.ctrlKey;
      const altMatch = keys.includes('alt') ? isAlt : !event.altKey;
      const shiftMatch = keys.includes('shift') ? isShift : !event.shiftKey;

      if (keyMatches && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};

export default useKeyboardShortcut;


