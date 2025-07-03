export interface AudioOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export class AudioService {
  private static audioCache = new Map<string, Blob>();
  private static currentAudio: HTMLAudioElement | null = null;

  static async synthesizeSpeech(
    text: string,
    options: AudioOptions = {}
  ): Promise<void> {
    try {
      // Check cache first
      const cacheKey = `${text}-${options.voice}-${options.speed}`;
      let audioBlob = this.audioCache.get(cacheKey);

      if (!audioBlob) {
        // Call OpenAI TTS API
        const response = await fetch('/api/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voice: options.voice || 'alloy',
            speed: options.speed || 1.0,
          }),
        });

        if (!response.ok) {
          // Fallback to browser speech synthesis
          this.fallbackToWebSpeech(text);
          return;
        }

        audioBlob = await response.blob();
        this.audioCache.set(cacheKey, audioBlob);
      }

      // Stop current audio if playing
      this.stopCurrentAudio();

      // Create and play new audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      // Add error handler for audio playback
      audio.addEventListener('error', (e) => {
        console.error('AudioService: Audio playback error:', e);
        this.fallbackToWebSpeech(text);
      });

      // Clean up URL after playback
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
      });

      await audio.play();
    } catch (error) {
      console.error('AudioService: Error in speech synthesis:', error);
      // Fallback to browser speech synthesis
      this.fallbackToWebSpeech(text);
    }
  }

  static stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  static isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  private static fallbackToWebSpeech(text: string): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;


      utterance.addEventListener('error', (e) => {
        console.error('AudioService: Browser speech synthesis error:', e);
      });

      window.speechSynthesis.speak(utterance);
    } else {
      console.error('AudioService: Speech synthesis not available');
    }
  }

  static clearCache(): void {
    this.audioCache.clear();
  }
}
