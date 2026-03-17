// src/features/pos/components/BarcodeScanner.jsx (Enhanced - Complete)
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Html5Qrcode } from 'html5-qrcode';
import { Icons } from '../../../components/ui/Icons';

export default function BarcodeScanner({ onClose, onScanComplete, mode = 'camera' }) {
  const [scanStatus, setScanStatus] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanMethod, setScanMethod] = useState(mode); // 'camera', 'file', 'manual'
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerDivId = 'qr-scanner-container';
  
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  useEffect(() => {
    if (scanMethod === 'camera') {
      startScanner();
    }
    
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().then(() => {
          console.log('Scanner stopped');
          setIsScanning(false);
        }).catch(console.error);
      }
    };
  }, [scanMethod, selectedCamera]);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        const cameraId = selectedCamera || devices[0].id;
        setSelectedCamera(cameraId);

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await scanner.start(
          cameraId,
          config,
          onScanSuccess,
          onScanError
        );
        
        setScanStatus({ type: 'info', message: 'Scanner ready - point at barcode' });
      } else {
        setScanStatus({ type: 'error', message: 'No cameras found' });
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setScanStatus({ type: 'error', message: 'Failed to access camera. Please check permissions.' });
      setIsScanning(false);
    }
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    // Beep or vibrate on successful scan
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(200);
    }

    // Play a beep sound if available
    const audio = new Audio('/beep.mp3');
    audio.play().catch(() => {});

    setScanStatus({ type: 'success', message: `✓ Scanned: ${decodedText}` });
    
    // Stop scanner after successful scan
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(console.error);
    }
    
    // Return result after a short delay
    setTimeout(() => {
      onScanComplete({ success: true, barcode: decodedText, format: decodedResult?.result?.format });
      onClose();
    }, 1500);
  };

  const onScanError = (error) => {
    // Silent fail - don't show errors for every failed frame
    console.debug('Scan error:', error);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setScanStatus({ type: 'info', message: 'Scanning image...' });

    const scanner = new Html5Qrcode(scannerDivId);
    scanner.scanFile(file, true)
      .then(decodedText => {
        setScanStatus({ type: 'success', message: `✓ Scanned: ${decodedText}` });
        setTimeout(() => {
          onScanComplete({ success: true, barcode: decodedText });
          onClose();
        }, 1500);
      })
      .catch(err => {
        setScanStatus({ type: 'error', message: 'Could not read barcode from image' });
      });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScanComplete({ success: true, barcode: manualBarcode.trim() });
      onClose();
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(console.error);
    }
  };

  const restartScanner = () => {
    stopScanner();
    setTimeout(() => {
      startScanner();
    }, 500);
  };

  const switchCamera = (cameraId) => {
    stopScanner();
    setSelectedCamera(cameraId);
    setTimeout(() => {
      startScanner();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`w-full max-w-lg ${currentTheme.colors.card} rounded-xl shadow-2xl`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Scan Barcode / QR Code</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Method Selector */}
        <div className="px-4 pt-4 flex gap-2">
          <button
            onClick={() => setScanMethod('camera')}
            className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
              scanMethod === 'camera'
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            <Icons.camera className="text-sm" /> Camera
          </button>
          <button
            onClick={() => setScanMethod('file')}
            className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
              scanMethod === 'file'
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            <Icons.image className="text-sm" /> Upload Image
          </button>
          <button
            onClick={() => setScanMethod('manual')}
            className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
              scanMethod === 'manual'
                ? `bg-gradient-to-r ${currentTheme.colors.accent} text-white`
                : `${currentTheme.colors.hover} ${currentTheme.colors.textSecondary}`
            }`}
          >
            <Icons.edit className="text-sm" /> Manual
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {scanMethod === 'camera' && (
            <div className="space-y-3">
              {/* Camera Selection */}
              {cameras.length > 1 && (
                <div className="flex gap-2">
                  <select
                    value={selectedCamera}
                    onChange={(e) => switchCamera(e.target.value)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  >
                    {cameras.map(camera => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label?.replace('camera2', '') || `Camera ${camera.id}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={restartScanner}
                    className={`px-3 py-2 rounded-lg ${currentTheme.colors.accentLight} ${currentTheme.colors.accentText}`}
                    title="Restart Scanner"
                  >
                    <Icons.refresh className="text-lg" />
                  </button>
                </div>
              )}
              
              {/* Scanner Container */}
              <div 
                id={scannerDivId}
                className="w-full aspect-square bg-black rounded-lg overflow-hidden relative"
              >
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    <div className="text-center">
                      <Icons.camera className="text-4xl mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Camera not active</p>
                      <button
                        onClick={startScanner}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded"
                      >
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner Guide */}
              <div className="text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-xs ${
                  scanStatus?.type === 'success' ? 'bg-green-100 text-green-700' :
                  scanStatus?.type === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {scanStatus?.message || 'Position barcode in the frame'}
                </div>
              </div>

              {/* Tips */}
              <div className={`text-xs ${currentTheme.colors.textMuted} space-y-1`}>
                <p className="flex items-center gap-1">
                  <Icons.check className="text-green-500" /> Hold steady for best results
                </p>
                <p className="flex items-center gap-1">
                  <Icons.check className="text-green-500" /> Ensure good lighting
                </p>
                <p className="flex items-center gap-1">
                  <Icons.check className="text-green-500" /> Keep 15-30cm from barcode
                </p>
              </div>
            </div>
          )}

          {scanMethod === 'file' && (
            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed ${currentTheme.colors.border} rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Icons.image className="text-4xl mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${currentTheme.colors.text}`}>Click to upload an image</p>
                <p className={`text-xs ${currentTheme.colors.textMuted} mt-1`}>PNG, JPG, GIF up to 10MB</p>
              </div>

              {scanStatus && (
                <div className={`p-3 rounded-lg text-center ${
                  scanStatus.type === 'success' ? 'bg-green-100 text-green-700' :
                  scanStatus.type === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {scanStatus.message}
                </div>
              )}
            </div>
          )}

          {scanMethod === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className={`text-sm ${currentTheme.colors.textSecondary} block mb-1`}>
                  Enter Barcode / QR Code
                </label>
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Type or paste barcode..."
                  className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualBarcode.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer for camera mode */}
        {scanMethod === 'camera' && (
          <div className={`p-4 border-t ${currentTheme.colors.border} flex gap-3`}>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={restartScanner}
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            >
              Restart Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}