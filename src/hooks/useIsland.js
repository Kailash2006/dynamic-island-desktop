import { useSyncExternalStore } from 'react';
import { island } from '../services/activityManager.js';

export const useIsland = () => useSyncExternalStore(island.subscribe, island.getState);
