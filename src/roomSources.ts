import campfireTemplate from './rooms/special/campfire.txt?raw';
import { createCaveRoom, createChunkyRoom, createCircularRoom, fromTemplate } from './roomgen';

const load = (files: Record<string, string>, isCorridor = false) =>
  Object.values(files).map((text) => fromTemplate(text, isCorridor));

export const startRooms = load(
  import.meta.glob<string>('./rooms/start/*.txt', { query: '?raw', import: 'default', eager: true }),
);

export const normalRooms = [
  ...load(
    import.meta.glob<string>('./rooms/normal/*.txt', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ),
  // Corridors only link rooms, so nothing but passing characters belongs in them.
  ...load(
    import.meta.glob<string>('./rooms/corridor/*.txt', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
    true,
  ),
  createCaveRoom,
  createCircularRoom,
  createChunkyRoom,
];

// The room with the campfire, on one floor of each stage.
export const campfireRoom = fromTemplate(campfireTemplate);
