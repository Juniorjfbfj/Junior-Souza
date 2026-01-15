
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Sparkles, 
  ChefHat, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Volume2, 
  Film, 
  Key, 
  RefreshCw,
  Download
} from 'lucide-react';
import { VideoScript, GenerationState, VoiceName } from './types';
import { 
  generateVideoScript, 
  generateNarration, 
  generateVideoClip, 
  decode, 
  decodeAudioData 
} from './services/geminiService';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [topic, setTopic] = useState<string>("O segredo mortal do peixe Fugu");
  const [state, setState] = useState<GenerationState>({
    step: 'idle',
    progress: 0,
    message: ''
  });
  
  const [script, setScript] = useState<VideoScript | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Check if user has selected key
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasKey(true); // Assume success per guidelines
  };

  const startGeneration = async () => {
    try {
      setState({ step: 'scripting', progress: 10, message: 'Tecendo a história misteriosa...' });
      
      // 1. Scripting
      const generatedScript = await generateVideoScript(topic);
      setScript(generatedScript);
      setState({ step: 'voicing', progress: 30, message: 'Gravando a narração sombria...' });

      // 2. Narration
      const base64Audio = await generateNarration(`${generatedScript.hook}. ${generatedScript.narration}. ${generatedScript.finalQuestion}`, VoiceName.Kore);
      const audioBlob = new Blob([decode(base64Audio)], { type: 'audio/pcm' });
      // Convert PCM to WAV/playable format or play directly if needed
      // For simplicity in this demo, we'll use a data URL for playback
      setAudioUrl(`data:audio/mp3;base64,${base64Audio}`); // Note: TTS returns raw PCM, playing it as mp3 might fail without a header.
      // Better: Use a helper to create a Blob with Wav header or use AudioContext
      
      setState({ step: 'filming', progress: 60, message: 'Capturando as imagens cinematográficas (isso pode levar 1-2 minutos)...' });

      // 3. Filming (Veo)
      // We generate the most impactful scene
      const mainScene = generatedScript.scenes[0].visualPrompt;
      const videoUri = await generateVideoClip(mainScene);
      setVideoUrl(videoUri);

      setState({ step: 'finished', progress: 100, message: 'Sua obra-prima está pronta!' });
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
      setState({ step: 'error', progress: 0, message: `Erro: ${error.message || 'Falha inesperada'}` });
    }
  };

  const playVideo = async () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
    
    // Handle PCM Audio Playback
    if (audioUrl && !audioContextRef.current) {
       audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (audioUrl && audioContextRef.current) {
      const base64 = audioUrl.split(',')[1];
      const bytes = decode(base64);
      const buffer = await decodeAudioData(bytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    }
  };

  const renderContent = () => {
    if (!hasKey) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
          <div className="bg-amber-500/10 p-4 rounded-full">
            <Key className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-3xl font-display italic">Chave de API Necessária</h2>
          <p className="text-zinc-400 max-w-md">
            Para gerar vídeos cinematográficos com o modelo Veo, você precisa selecionar uma chave de API de um projeto faturável.
          </p>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-amber-400 hover:underline text-sm">
            Saiba mais sobre o faturamento do Veo
          </a>
          <button 
            onClick={handleOpenKey}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            Selecionar Chave de API <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (state.step === 'finished' && videoUrl) {
      return (
        <div className="flex flex-col md:flex-row gap-12 items-start animate-in fade-in duration-700">
          {/* Vertical Video Container */}
          <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-[3rem] overflow-hidden border-[8px] border-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
            <video 
              ref={videoRef}
              src={videoUrl} 
              className="w-full h-full object-cover"
              loop
              playsInline
            />
            
            {/* Overlay Text Simulator (matching scenes) */}
            <div className="absolute inset-x-0 bottom-24 p-6 text-center z-10">
              <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-xl font-bold uppercase tracking-widest text-white border border-white/20">
                {script?.scenes[0].displayText || "Mistério Revelado"}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />
            
            <button 
              onClick={playVideo}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-6 bg-white/20 backdrop-blur-xl rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="w-12 h-12 fill-white" />
            </button>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <span className="text-amber-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Geração Concluída
              </span>
              <h2 className="text-4xl font-display italic">{script?.title}</h2>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3 text-zinc-300">
                <Volume2 className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">Narração (Script)</span>
              </div>
              <p className="text-zinc-400 italic leading-relaxed">
                "{script?.hook} {script?.narration} {script?.finalQuestion}"
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setState({ step: 'idle', progress: 0, message: '' })}
                className="px-6 py-3 border border-zinc-700 rounded-full hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Criar Outro
              </button>
              <a 
                href={videoUrl} 
                download="culinary-mystery.mp4"
                className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Baixar Vídeo
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (state.step !== 'idle') {
      return (
        <div className="flex flex-col items-center justify-center p-20 text-center space-y-10 w-full max-w-2xl mx-auto">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-zinc-800 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              {state.step === 'scripting' && <Sparkles className="w-10 h-10 text-amber-500" />}
              {state.step === 'voicing' && <Volume2 className="w-10 h-10 text-amber-500" />}
              {state.step === 'filming' && <Film className="w-10 h-10 text-amber-500 animate-pulse" />}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold tracking-tight">{state.message}</h3>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${state.progress}%` }} 
              />
            </div>
            <p className="text-zinc-500 text-sm italic">O modelo Veo está orquestrando os pixels...</p>
          </div>
          {state.step === 'error' && (
            <button 
              onClick={() => setState({ step: 'idle', progress: 0, message: '' })}
              className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> Tentar Novamente
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="space-y-4 text-center">
          <h2 className="text-5xl md:text-7xl font-display italic leading-tight">
            Transforme curiosidades em <span className="text-amber-500">cinema vertical.</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Gere Shorts misteriosos sobre culinária com narração profissional e vídeos ultra-realistas usando Gemini 3 e Veo.
          </p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl space-y-8">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold ml-1">Sobre qual mistério culinário falaremos?</label>
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: O mel de 3000 anos encontrado nas tumbas do Egito..."
              className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-xl focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
              <div className="bg-amber-500/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-amber-500" /></div>
              <div className="text-sm"><p className="font-bold">30-40 Segundos</p><p className="text-zinc-500">Tempo ideal p/ Shorts</p></div>
            </div>
            <div className="flex items-center gap-4 bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
              <div className="bg-amber-500/20 p-2 rounded-lg"><ChefHat className="w-5 h-5 text-amber-500" /></div>
              <div className="text-sm"><p className="font-bold">Temática Gourmet</p><p className="text-zinc-500">Curiosidade e sabor</p></div>
            </div>
            <div className="flex items-center gap-4 bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
              <div className="bg-amber-500/20 p-2 rounded-lg"><Volume2 className="w-5 h-5 text-amber-500" /></div>
              <div className="text-sm"><p className="font-bold">Voz Misteriosa</p><p className="text-zinc-500">Ritmo envolvente</p></div>
            </div>
          </div>

          <button 
            onClick={startGeneration}
            className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-black font-black text-xl rounded-2xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3 group"
          >
            GERAR VÍDEO CINEMATOGRÁFICO <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 md:py-24">
      <header className="fixed top-0 inset-x-0 h-20 bg-black/60 backdrop-blur-xl border-b border-zinc-800/50 z-50 flex items-center px-8 justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <ChefHat className="w-6 h-6 text-black" />
          </div>
          <span className="font-display italic text-2xl tracking-tight">Misteri<span className="text-amber-500">Cook</span></span>
        </div>
        {hasKey && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800 text-xs font-medium text-zinc-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            VE-3.1-GEN-READY
          </div>
        )}
      </header>

      <main className="w-full max-w-6xl mt-12 flex flex-col items-center">
        {renderContent()}
      </main>

      <footer className="mt-20 text-zinc-600 text-sm flex items-center gap-2">
        Powered by <span className="text-zinc-400 font-semibold">Google Gemini 3</span> & <span className="text-zinc-400 font-semibold">Veo</span>
      </footer>
    </div>
  );
};

export default App;
