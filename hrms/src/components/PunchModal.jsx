import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, X } from 'lucide-react';

export default function PunchModal({ isOpen, onClose, onPunch }) {
  const [stream, setStream] = useState(null);
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      getLocation();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
    } catch (e) {
      console.error('Camera error', e);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng, address: 'Fetching address...' });
          
          try {
            // Using OpenStreetMap Nominatim for free reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();
            if (data && data.display_name) {
              setLocation({ lat, lng, address: data.display_name });
            } else {
              setLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            setLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
          }
        },
        err => setLocError(err.message)
      );
    } else {
      setLocError('Geolocation not supported');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !location) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoBase64 = canvas.toDataURL('image/webp', 0.8);
    
    await onPunch({ location, photo: photoBase64 });
    setCapturing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 bg-white/50 rounded-full p-1">
          <X size={20} />
        </button>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#162660' }}>Check-In / Check-Out</h3>
            <p className="text-xs text-slate-500">Capture photo and location to sync biometric attendance</p>
          </div>
        </div>
        
        <div className="p-5 bg-slate-50">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video mb-4 shadow-inner flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!stream ? 'hidden' : ''}`} 
            />
            {!stream && <p className="text-slate-400 text-sm">Waiting for camera...</p>}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-slate-200 shadow-sm mb-2">
            <MapPin size={18} className={location ? 'text-emerald-500' : 'text-slate-400'} />
            <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap" title={location?.address || `${location?.lat}, ${location?.lng}`}>
              <span className="font-semibold" style={{ color: '#162660' }}>Location: </span>
              {location ? <span className="text-emerald-600 text-xs">{location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}</span> 
               : locError ? <span className="text-red-500 text-xs">{locError}</span> 
               : <span className="text-slate-500 text-xs">Locating...</span>}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleCapture}
            disabled={capturing || !stream || !location}
            className="flex-1 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
          >
            {capturing ? 'Syncing...' : 'Capture & Punch'}
          </button>
        </div>
      </div>
    </div>
  );
}
