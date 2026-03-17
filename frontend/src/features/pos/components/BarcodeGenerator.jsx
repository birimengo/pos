// src/features/pos/components/BarcodeGenerator.jsx
import { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import Barcode from 'react-barcode';
import { QRCodeCanvas } from 'qrcode.react';

export default function BarcodeGenerator({ product, onClose, onSave }) {
  const [barcodeValue, setBarcodeValue] = useState(product?.barcode || '');
  const [format, setFormat] = useState('code128');
  const [showQR, setShowQR] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  // Track window size for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const generateBarcode = () => {
    if (!barcodeValue) {
      const randomBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      setBarcodeValue(randomBarcode);
    }
  };

  const handleSave = () => {
    if (barcodeValue) {
      onSave(barcodeValue);
    }
  };

  const barcodeFormats = [
    { value: 'code128', label: 'Code 128' },
    { value: 'ean13', label: 'EAN-13' },
    { value: 'ean8', label: 'EAN-8' },
    { value: 'upc', label: 'UPC' },
    { value: 'qr', label: 'QR Code' },
  ];

  // Responsive sizes based on screen width
  const getBarcodeSize = () => {
    if (windowSize.width < 380) return { width: 1.2, height: 40 }; // very small mobile
    if (windowSize.width < 480) return { width: 1.5, height: 50 }; // small mobile
    if (windowSize.width < 640) return { width: 1.8, height: 60 }; // mobile
    if (windowSize.width < 768) return { width: 2, height: 70 }; // tablet
    return { width: 2.2, height: 80 }; // desktop
  };

  const getQRSize = () => {
    if (windowSize.width < 380) return 120; // very small mobile
    if (windowSize.width < 480) return 140; // small mobile
    if (windowSize.width < 640) return 160; // mobile
    if (windowSize.width < 768) return 180; // tablet
    return 200; // desktop
  };

  const getFontSize = () => {
    if (windowSize.width < 380) return 10; // very small mobile
    if (windowSize.width < 480) return 11; // small mobile
    if (windowSize.width < 640) return 12; // mobile
    return 14; // desktop
  };

  const barcodeSize = getBarcodeSize();
  const qrSize = getQRSize();
  const fontSize = getFontSize();

  // Check if content might overflow
  const previewHeight = format === 'qr' ? qrSize + 80 : barcodeSize.height + 100;
  const maxModalHeight = windowSize.height * 0.8; // 80% of viewport height

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className={`w-full max-w-sm sm:max-w-md md:max-w-lg ${currentTheme.colors.card} rounded-xl shadow-2xl my-4 sm:my-8 mx-auto max-h-[90vh] overflow-y-auto`}>
        {/* Header - Sticky */}
        <div className={`sticky top-0 z-10 p-3 sm:p-4 border-b ${currentTheme.colors.border} bg-inherit flex justify-between items-center`}>
          <h2 className={`text-base sm:text-lg font-semibold ${currentTheme.colors.text} truncate pr-2`}>
            {product?.name ? `Barcode for ${product.name}` : 'Generate Barcode'}
          </h2>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg ${currentTheme.colors.hover} flex-shrink-0`}
            aria-label="Close"
          >
            <Icons.x className="text-xl sm:text-2xl" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Format Selector */}
          <div>
            <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
              Barcode Format
            </label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setShowQR(e.target.value === 'qr');
              }}
              className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
            >
              {barcodeFormats.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Barcode Value Input */}
          <div>
            <label className={`text-xs sm:text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
              Barcode Value
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="Enter or generate barcode"
                className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
              <button
                type="button"
                onClick={generateBarcode}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText} flex-shrink-0`}
                title="Generate Random"
              >
                <Icons.refresh className="text-lg sm:text-xl" />
              </button>
            </div>
          </div>

          {/* Barcode Preview */}
          {barcodeValue && (
            <div className={`p-3 sm:p-4 ${currentTheme.colors.accentLight} rounded-lg text-center overflow-x-auto`}>
              <p className={`text-xs sm:text-sm mb-2 ${currentTheme.colors.textSecondary}`}>
                Preview
              </p>
              <div className="bg-white p-3 sm:p-4 rounded-lg inline-block max-w-full overflow-x-auto">
                <div className="flex justify-center min-w-[200px]">
                  {format === 'qr' ? (
                    <QRCodeCanvas 
                      value={barcodeValue} 
                      size={qrSize}
                      level="H"
                      includeMargin={true}
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  ) : (
                    <div className="transform scale-75 sm:scale-90 md:scale-100 origin-center">
                      <Barcode 
                        value={barcodeValue}
                        format={format}
                        width={barcodeSize.width}
                        height={barcodeSize.height}
                        displayValue={true}
                        fontSize={fontSize}
                        margin={5}
                        background="white"
                        lineColor="#000000"
                      />
                    </div>
                  )}
                </div>
              </div>
              <p className={`text-xs mt-2 font-mono ${currentTheme.colors.text} break-all px-2`}>
                {barcodeValue}
              </p>
            </div>
          )}

          {/* Instructions - Collapsible on mobile */}
          <details className="sm:block">
            <summary className={`text-xs sm:hidden cursor-pointer ${currentTheme.colors.accentText} mb-2`}>
              Show format info
            </summary>
            <div className={`text-xs ${currentTheme.colors.textMuted} space-y-1`}>
              <p>• Code 128: Alphanumeric, variable length</p>
              <p>• EAN-13: 13 digits, for retail products</p>
              <p>• EAN-8: 8 digits, for small packages</p>
              <p>• UPC: 12 digits, North America standard</p>
              <p>• QR Code: Can store more data (URLs, text)</p>
            </div>
          </details>
        </div>

        {/* Footer - Sticky */}
        <div className={`sticky bottom-0 p-3 sm:p-4 border-t ${currentTheme.colors.border} bg-inherit flex flex-col sm:flex-row gap-2 sm:gap-3`}>
          <button
            onClick={onClose}
            className={`w-full sm:flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} text-sm sm:text-base order-2 sm:order-1`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!barcodeValue}
            className={`w-full sm:flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2`}
          >
            Save Barcode
          </button>
        </div>
      </div>
    </div>
  );
}