import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image, Mic, Heart, Send, Download, Sparkles, RefreshCw, X, Check, Volume2, ShieldCheck, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

// ⚠️ MASUKKAN URL GOOGLE APPS SCRIPT ANDA DI SINI
const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx.../exec";

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [guestName, setGuestName] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successScreen, setSuccessScreen] = useState(false);
  
  // Camera & Photo State
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('original');
  
  // Photostrip State
  const [stripPhotos, setStripPhotos] = useState([]);
  const [generatedStrip, setGeneratedStrip] = useState(null);
  const photostripCanvasRef = useRef(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Gallery Data State
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // Fetch Public Gallery Photos
  const fetchPublicGallery = async () => {
    setIsLoadingGallery(true);
    try {
      const res = await fetch(APPS_SCRIPT_WEB_APP_URL);
      const data = await res.json();
      if (data.success && data.photos) {
        setPublicPhotos(data.photos);
      }
    } catch (e) {
      console.log("Gallery load skipped or offline");
    }
    setIsLoadingGallery(false);
  };

  useEffect(() => {
    if (activeTab === 'gallery') fetchPublicGallery();
  }, [activeTab]);

  // Handle Base Backend Upload
  const handleUploadToDrive = async (fileBase64, type) => {
    setUploading(true);
    try {
      const payload = {
        file: fileBase64,
        type: type,
        name: guestName || 'Tetamu',
        message: guestMessage
      };

      await fetch(APPS_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setUploading(false);
      setSuccessScreen(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      alert("Oops! Masa muat naik mengalami ralat. Sila cuba lagi ♡");
      setUploading(false);
    }
  };

  // Camera Functions
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Akses kamera diperlukan untuk mengambil gambar ♡");
      setIsCameraActive(false);
    }
  };

  const takePhotoWithCountdown = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        captureFrame();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(dataUrl);
    
    // Stop stream
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  // Generate Photostrip via Canvas
  const generatePhotostrip = async () => {
    if (stripPhotos.length < 3) return alert("Sila pilih sekurang-kurangnya 3 gambar ♡");
    
    const canvas = photostripCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const width = 400;
    const height = 1100;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#FBF8FF";
    ctx.fillRect(0, 0, width, height);

    // Outer Border
    ctx.strokeStyle = "#D9CBEA";
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Load and draw photos
    let currentY = 40;
    for (let i = 0; i < Math.min(stripPhotos.length, 4); i++) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = stripPhotos[i];
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 40, currentY, 320, 220);
          ctx.strokeStyle = "#B9A4D6";
          ctx.lineWidth = 4;
          ctx.strokeRect(40, currentY, 320, 220);
          currentY += 235;
          resolve();
        };
      });
    }

    // Branding Footer
    ctx.fillStyle = "#806A9B";
    ctx.font = "bold 26px 'Playfair Display', serif";
    ctx.textAlign = "center";
    ctx.fillText("Zafirah & Shakir", width / 2, height - 90);
    
    ctx.fillStyle = "#B9A4D6";
    ctx.font = "18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Yay Kahwin! ♡", width / 2, height - 60);
    ctx.fillText("2026", width / 2, height - 35);

    setGeneratedStrip(canvas.toDataURL('image/jpeg'));
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => setAudioBlob(reader.result);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTimer(0);
      timerIntervalRef.current = setInterval(() => setRecordingTimer(prev => prev + 1), 1000);
    } catch (err) {
      alert("Akses mikrofon diperlukan untuk merekod ucapan suara ♡");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto bg-[#FBF8FF] text-[#4B4352] relative shadow-2xl">
      
      {/* Header Branding */}
      <header className="p-6 text-center border-b border-[#F3DDE8] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-[#806A9B] tracking-wide">Zafirah & Shakir</h1>
        <p className="text-xs text-[#B9A4D6] font-medium tracking-widest uppercase mt-1">Yay Kahwin! ♡ 2026</p>
      </header>

      {/* Success Modal Overlay */}
      {successScreen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 text-center shadow-xl border-2 border-[#D9CBEA] max-w-xs w-full animate-bounce-short">
            <div className="w-16 h-16 bg-[#F3DDE8] text-[#806A9B] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">♡</div>
            <h3 className="text-xl font-bold text-[#806A9B] mb-2">Yay! Memori Disimpan</h3>
            <p className="text-sm text-[#4B4352] mb-6">Terima kasih kerana meraikan hari bahagia kami! Memory anda tersimpan selamanya ♡</p>
            <button 
              onClick={() => { setSuccessScreen(false); setActiveTab('home'); setCapturedPhoto(null); setAudioBlob(null); }} 
              className="w-full py-3 bg-[#B9A4D6] text-white font-semibold rounded-xl shadow-md hover:bg-[#806A9B] transition"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Content Views */}
      <main className="p-4">
        {activeTab === 'home' && (
          <div className="space-y-6 text-center">
            <div className="py-6 px-4 bg-white rounded-3xl border border-[#F3DDE8] shadow-sm">
              <h2 className="text-xl font-semibold text-[#806A9B]">Sudut Memori Kami ♡</h2>
              <p className="text-xs text-gray-500 mt-1">Tangkap momen indah & kongsi bersama kami!</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setActiveTab('camera'); startCamera(); }} className="p-5 bg-white rounded-2xl border-2 border-[#D9CBEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition">
                <Camera className="w-8 h-8 text-[#B9A4D6]" />
                <span className="font-bold text-sm text-[#806A9B]">AMBIL GAMBAR</span>
              </button>

              <button onClick={() => setActiveTab('photostrip')} className="p-5 bg-white rounded-2xl border-2 border-[#D9CBEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition">
                <Sparkles className="w-8 h-8 text-[#B9A4D6]" />
                <span className="font-bold text-sm text-[#806A9B]">PHOTOSTRIP</span>
              </button>

              <button onClick={() => setActiveTab('audio')} className="p-5 bg-white rounded-2xl border-2 border-[#D9CBEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition">
                <Mic className="w-8 h-8 text-[#B9A4D6]" />
                <span className="font-bold text-sm text-[#806A9B]">AUDIO WISH</span>
              </button>

              <button onClick={() => setActiveTab('gallery')} className="p-5 bg-white rounded-2xl border-2 border-[#D9CBEA] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition">
                <Image className="w-8 h-8 text-[#B9A4D6]" />
                <span className="font-bold text-sm text-[#806A9B]">PUBLIC ALBUM</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera View */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            {!capturedPhoto ? (
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] flex items-center justify-center">
                {isCameraActive && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
                {countdown && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-7xl font-bold">
                    {countdown}
                  </div>
                )}
                <button 
                  onClick={takePhotoWithCountdown} 
                  disabled={!!countdown}
                  className="absolute bottom-6 w-16 h-16 bg-white border-4 border-[#B9A4D6] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition"
                >
                  <div className="w-12 h-12 bg-[#F3DDE8] rounded-full" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <img src={capturedPhoto} className="w-full rounded-2xl border-2 border-[#D9CBEA]" />
                <input 
                  type="text" 
                  placeholder="Nama anda (opsional)" 
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#D9CBEA] bg-white text-sm focus:outline-none" 
                />
                <button 
                  onClick={() => handleUploadToDrive(capturedPhoto, 'photo')}
                  disabled={uploading}
                  className="w-full py-3 bg-[#B9A4D6] text-white font-bold rounded-xl shadow-md"
                >
                  {uploading ? 'Muat Naik...' : 'SHARE MY MEMORY ♡'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Photostrip View */}
        {activeTab === 'photostrip' && (
          <div className="space-y-4 text-center">
            <h3 className="font-bold text-lg text-[#806A9B]">Cipta Photostrip ✦</h3>
            <canvas ref={photostripCanvasRef} className="hidden" />
            
            {generatedStrip ? (
              <div className="space-y-4">
                <img src={generatedStrip} className="mx-auto rounded-xl shadow-lg border-2 border-[#D9CBEA] max-h-96" />
                <button 
                  onClick={() => handleUploadToDrive(generatedStrip, 'photostrip')}
                  disabled={uploading}
                  className="w-full py-3 bg-[#B9A4D6] text-white font-bold rounded-xl"
                >
                  {uploading ? 'Menyimpan...' : 'SIMPAN KE ALBUM ♡'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-2xl border border-[#D9CBEA]">
                <p className="text-xs text-gray-500 mb-4">Sila ambil gambar baru atau upload gambar dari album phone anda.</p>
                <button onClick={generatePhotostrip} className="w-full py-3 bg-[#806A9B] text-white font-bold rounded-xl">
                  Jana Photostrip ♡
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audio View */}
        {activeTab === 'audio' && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-white rounded-3xl border border-[#F3DDE8]">
              <Mic className="w-12 h-12 text-[#B9A4D6] mx-auto mb-2" />
              <h3 className="font-bold text-[#806A9B]">Tinggalkan Ucapan Suara 🎙️</h3>
              <p className="text-xs text-gray-400 mt-1">Masa rakaman maksimum: 60 saat</p>

              <div className="my-6">
                {!isRecording ? (
                  <button onClick={startRecording} className="px-6 py-3 bg-[#B9A4D6] text-white font-bold rounded-full shadow-md">
                    MULA RAKAM
                  </button>
                ) : (
                  <button onClick={stopRecording} className="px-6 py-3 bg-red-400 text-white font-bold rounded-full animate-pulse">
                    BERHENTI ({recordingTimer}s)
                  </button>
                )}
              </div>

              {audioBlob && (
                <button 
                  onClick={() => handleUploadToDrive(audioBlob, 'audio')}
                  disabled={uploading}
                  className="w-full py-3 bg-[#806A9B] text-white font-bold rounded-xl"
                >
                  {uploading ? 'Hantar...' : 'HANTAR UCAPAN SUARA ♡'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <h3 className="font-bold text-[#806A9B] text-center">Album Kenangan Tetamu 🖼️</h3>
            {isLoadingGallery ? (
              <p className="text-center text-xs text-gray-400">Loading gallery...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {publicPhotos.map((p, idx) => (
                  <img key={idx} src={p.url} className="rounded-xl border border-[#F3DDE8] object-cover h-36 w-full" />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Toolbar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-[#F3DDE8] p-3 flex justify-around text-xs font-semibold text-[#806A9B] z-40">
        <button onClick={() => setActiveTab('home')} className="flex flex-col items-center gap-1">
          <Home className="w-5 h-5" /> Home
        </button>
        <button onClick={() => { setActiveTab('camera'); startCamera(); }} className="flex flex-col items-center gap-1">
          <Camera className="w-5 h-5" /> Kamera
        </button>
        <button onClick={() => setActiveTab('photostrip')} className="flex flex-col items-center gap-1">
          <Sparkles className="w-5 h-5" /> Strip
        </button>
        <button onClick={() => setActiveTab('gallery')} className="flex flex-col items-center gap-1">
          <Image className="w-5 h-5" /> Album
        </button>
      </nav>

    </div>
  );
}
