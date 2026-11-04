import { parseRoom, type Room } from './room';

const load = (files: Record<string, string>): Room[] => Object.values(files).map(parseRoom);

export const startTemplates = load(
  import.meta.glob<string>('./rooms/start/*.txt', { query: '?raw', import: 'default', eager: true }),
);

export const normalTemplates = load(
  import.meta.glob<string>('./rooms/normal/*.txt', { query: '?raw', import: 'default', eager: true }),
);
