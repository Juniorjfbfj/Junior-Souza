
export interface VideoScript {
  title: string;
  hook: string;
  narration: string;
  scenes: Scene[];
  finalQuestion: string;
}

export interface Scene {
  visualPrompt: string;
  displayText: string;
  durationSeconds: number;
}

export interface GenerationState {
  step: 'idle' | 'scripting' | 'voicing' | 'filming' | 'finished' | 'error';
  progress: number;
  message: string;
}

export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}
