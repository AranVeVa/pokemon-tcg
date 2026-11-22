import { useState, useEffect } from 'react';

/**
 * Hook para retrasar la actualización de un valor (debounce)
 * Evita consultas y filtrados excesivos mientras el usuario teclea.
 * @param {*} value - Valor de entrada
 * @param {number} delay - Tiempo en milisegundos (por defecto 350ms)
 * @returns {*} debouncedValue
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
