export interface SpeechModelPerformance {
  metric: string;
  base: number;
  fineTuned: number;
}

export interface SpeechModel {
  id: string;
  name: string;
  author: string;
  type: string;
  parameters: string;
  sizeMB: number;
  license: string;
  features: string[];
  technology: string;
  url: string;
  category: 'ASR' | 'TTS' | 'Filter';
  // Advanced Metrics
  wer_base: number;
  wer_finetuned: number;
  latency_ms: number;
  rtf: number; // Real Time Factor
  robustness: number; // 1-10
  versatility: number; // 1-10
}

export const speechModels: SpeechModel[] = [
  {
    id: 'personal-stt',
    name: 'Personal STT (Wav2Vec2)',
    author: 'fractalego',
    type: 'Automatic Speech Recognition (ASR)',
    parameters: '315M',
    sizeMB: 1260,
    license: 'Apache 2.0',
    features: ['Fine-tuned for personal accents', 'Optimized for wav2vec2 architecture', 'Handles noisy personal recordings'],
    technology: 'Wav2Vec2-Large-XLSR-53',
    url: 'https://huggingface.co/fractalego/personal-speech-to-text-model',
    category: 'ASR',
    wer_base: 24.5,
    wer_finetuned: 6.8,
    latency_ms: 180,
    rtf: 0.15,
    robustness: 9,
    versatility: 5
  },
  {
    id: 'fish-speech-1-5',
    name: 'Fish-Speech 1.5',
    author: 'fishaudio',
    type: 'Text-to-Speech (TTS)',
    parameters: '1.4B',
    sizeMB: 1470,
    license: 'CC-BY-NC-SA 4.0',
    features: ['13 languages supported', 'Dual AR architecture', 'Trained on 1M+ hours'],
    technology: 'Dual AR Transformer + Firefly GAN',
    url: 'https://huggingface.co/fishaudio/fish-speech-1.5',
    category: 'TTS',
    wer_base: 12.0, // Base acoustic model
    wer_finetuned: 3.5, // After multi-lingual fine-tuning
    latency_ms: 100,
    rtf: 0.45,
    robustness: 7,
    versatility: 10
  },
  {
    id: 'nemotron-streaming',
    name: 'Nemotron-Speech Streaming',
    author: 'nvidia',
    type: 'Streaming ASR',
    parameters: '600M',
    sizeMB: 2400,
    license: 'NVIDIA Open Model License',
    features: ['Low latency streaming', 'Cache-Aware FastConformer', 'Configurable chunk sizes'],
    technology: 'Cache-Aware FastConformer-RNNT',
    url: 'https://huggingface.co/nvidia/nemotron-speech-streaming-en-0.6b',
    category: 'ASR',
    wer_base: 15.2, // Small chunk size
    wer_finetuned: 7.1, // Large chunk size + fine-tuned
    latency_ms: 80,
    rtf: 0.08,
    robustness: 8,
    versatility: 8
  },
  {
    id: 'hindi-tts-speecht5',
    name: 'Hindi TTS (SpeechT5)',
    author: 'ShigrafS',
    type: 'Text-to-Speech (TTS)',
    parameters: 'Base-T5',
    sizeMB: 578,
    license: 'MIT / Apache 2.0',
    features: ['Hindi localized prosody', 'Sub-600MB footprint', 'Unified architecture'],
    technology: 'SpeechT5 (Fine-tuned for Hindi)',
    url: 'https://huggingface.co/ShigrafS/hindi_text_to_speech',
    category: 'TTS',
    wer_base: 14.8, // Intelligibility measure
    wer_finetuned: 4.8, // After Hindi specific fine-tuning
    latency_ms: 220,
    rtf: 0.38,
    robustness: 7,
    versatility: 6
  }
];
