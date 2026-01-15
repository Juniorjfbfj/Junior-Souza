
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { VideoScript, VoiceName } from "../types";

// Helper to decode base64 audio
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateVideoScript = async (topic: string): Promise<VideoScript> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Crie um roteiro para um vídeo curto de curiosidade culinária sobre: ${topic}. 
  O roteiro deve ter um gancho de 3 segundos, narração misteriosa em português brasileiro, e descrições visuais detalhadas para IA de vídeo.
  Retorne EXATAMENTE no formato JSON solicitado.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          hook: { type: Type.STRING },
          narration: { type: Type.STRING },
          finalQuestion: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                visualPrompt: { type: Type.STRING },
                displayText: { type: Type.STRING },
                durationSeconds: { type: Type.NUMBER }
              },
              required: ["visualPrompt", "displayText", "durationSeconds"]
            }
          }
        },
        required: ["title", "hook", "narration", "finalQuestion", "scenes"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateNarration = async (text: string, voice: VoiceName = VoiceName.Kore): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Diga com voz misteriosa e rítmica: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};

export const generateVideoClip = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Cinematic, dramatic lighting, intense colors, high sharpness, mysterious mood, vertical 9:16 aspect ratio. ${prompt}`,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
