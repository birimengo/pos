// src/features/pos/hooks/useBarcodeScanner.js
import { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';

export function useBarcodeScanner({ onScan, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [lastBarcode, setLastBarcode] = useState('');
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);
  
  const { state: inventoryState } = useInventory();
  const { dispatch: cartDispatch } = useCart();

  // Barcode scanner typically sends characters rapidly
  // We detect a scan by the speed of input and the Enter key
  useEffect(() => {
    if (!isListening) return;

    const handleKeyDown = (e) => {
      // Clear timeout on each key press
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If Enter is pressed, process the barcode
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        if (barcode) {
          handleBarcode(barcode);
        }
        bufferRef.current = '';
        e.preventDefault();
        return;
      }

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // Add character to buffer
      bufferRef.current += e.key;

      // Set timeout to clear buffer if typing is slow (manual entry)
      timeoutRef.current = setTimeout(() => {
        if (bufferRef.current) {
          // If buffer is long enough, treat as manual barcode entry
          if (bufferRef.current.length >= 8) {
            handleBarcode(bufferRef.current);
          }
          bufferRef.current = '';
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isListening]);

  const handleBarcode = (barcode) => {
    setLastBarcode(barcode);
    
    // Find product by barcode
    const product = inventoryState.products.find(p => p.barcode === barcode);
    
    if (product) {
      // Add to cart automatically
      cartDispatch({ type: 'ADD_ITEM', payload: product });
      if (onScan) {
        onScan({ success: true, product, barcode });
      }
    } else {
      if (onError) {
        onError({ success: false, error: 'Product not found', barcode });
      }
    }
    
    bufferRef.current = '';
  };

  const startListening = () => setIsListening(true);
  const stopListening = () => setIsListening(false);
  const manualEntry = (barcode) => handleBarcode(barcode);

  return {
    isListening,
    lastBarcode,
    startListening,
    stopListening,
    manualEntry
  };
}