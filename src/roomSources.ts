import campfireTemplate from './rooms/special/campfire.txt?raw';
import { createCaveRoom, createChunkyRoom, createCircularRoom, fromTemplate } from './roomgen';

const load = (files: Record<string, string>) => Object.values(files).map(fromTemplate);

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
  createCaveRoom,
  createCircularRoom,
  createChunkyRoom,
];

// The room with the campfire, on one floor of each stage.
export const campfireRoom = fromTemplate(campfireTemplate);
