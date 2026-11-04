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
