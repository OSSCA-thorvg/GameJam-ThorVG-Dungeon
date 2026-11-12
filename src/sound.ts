export type SoundName =
  | 'step'
  | 'boss-clear'
  | 'hit'
  | 'hurt'
  | 'crit'
  | 'miss'
  | 'pickup'
  | 'drink'
  | 'stairs'
  | 'level-up'
  | 'click'
  | 'death'
  | 'equip-cloth'
  | 'equip-weapon'
  | 'eat'
  | 'cook'
  | 'trap-found'
  | 'trap-trigger'
  | 'shatter'
  | 'coffin';

export type MusicName = 'bgm-menu' | 'bgm-floor1' | 'bgm-boss1' | 'bgm-floor2' | 'bgm-boss2';

export interface Sound {
  // The pitch is off by a random share of up to the variance, so a sound heard over and over does
  // not repeat exactly.
  play(name: SoundName, pitchVariance?: number): void;
  // Loops a track and fades the one playing out. Null stops the music.
  playMusic(name: MusicName | null): void;
  // From 0 to 1.
  setVolume(volume: number): void;
}

const files = import.meta.glob<string>('../assets/sound/*.ogg', {
  query: '?url',
  import: 'default',
  eager: true,
});

// Placeholder value. How long a track takes to fade in or out.
const MUSIC_FADE_SECONDS = 1;

const GESTURES = ['pointerdown', 'pointerup', 'keydown'] as const;

// Plays the sounds in assets/sound with Web Audio. A browser starts audio only after a click or a
// key press, so sounds before the first one are skipped, and the music asked for before it starts
// then.
export function createSound(volume: number): Sound {
  const downloads = new Map<string, Promise<ArrayBuffer | null>>();
  for (const [path, url] of Object.entries(files)) {
    const name = path.slice(path.lastIndexOf('/') + 1, -'.ogg'.length);
    downloads.set(
      name,
      fetch(url)
        .then((response) => response.arrayBuffer())
        .catch(() => null),
    );
  }

  const buffers = new Map<string, AudioBuffer>();
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let wantedMusic: MusicName | null = null;
  let music: { name: MusicName; source: AudioBufferSourceNode; gain: GainNode } | null = null;

  const fadeOut = ({ source, gain }: NonNullable<typeof music>, context: AudioContext) => {
    const end = context.currentTime + MUSIC_FADE_SECONDS;
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, end);
    source.stop(end);
  };

  const applyMusic = () => {
    if (!context || !master || context.state !== 'running' || music?.name === wantedMusic) {
      return;
    }
    const buffer = wantedMusic && buffers.get(wantedMusic);
    if (wantedMusic && !buffer) {
      return;
    }
    if (music) {
      fadeOut(music, context);
      music = null;
    }
    if (!wantedMusic || !buffer) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + MUSIC_FADE_SECONDS);
    source.connect(gain).connect(master);
    source.start();
    music = { name: wantedMusic, source, gain };
  };

  const start = () => {
    const created = new AudioContext();
    master = created.createGain();
    master.gain.value = volume;
    master.connect(created.destination);
    for (const [name, download] of downloads) {
      void download.then(async (bytes) => {
        if (bytes) {
          buffers.set(name, await created.decodeAudioData(bytes.slice(0)));
          applyMusic();
        }
      });
    }
    return created;
  };

  const unlock = () => {
    context ??= start();
    void context.resume().then(() => {
      if (context?.state === 'running') {
        for (const gesture of GESTURES) {
          window.removeEventListener(gesture, unlock);
        }
        applyMusic();
      }
    });
  };
  for (const gesture of GESTURES) {
    window.addEventListener(gesture, unlock);
  }

  return {
    play(name, pitchVariance = 0) {
      const buffer = buffers.get(name);
      if (!context || !master || context.state !== 'running' || !buffer) {
        return;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchVariance;
      source.connect(master);
      source.start();
    },
    playMusic(name) {
      wantedMusic = name;
      applyMusic();
    },
    setVolume(next) {
      volume = next;
      if (master) {
        master.gain.value = next;
      }
    },
  };
}
