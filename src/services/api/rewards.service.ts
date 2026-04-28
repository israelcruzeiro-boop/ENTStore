import { api } from './client';

export interface IncrementSelfStatsPayload {
  xp: number;
  coins: number;
}

export interface IncrementSelfStatsResult {
  userId: string;
  xpTotal: number | null;
  coinsTotal: number | null;
}

/**
 * HTTP wrapper for the legacy `increment_user_stats` database RPC.
 *
 * The backend route (`POST /api/users/me/rewards/increment`) is authenticated
 * and acts only on the current user — the actor's `userId` is read from the
 * session. Admin flows that need to award XP to other users will have a
 * different endpoint.
 */
export const rewardsService = {
  incrementSelf: (payload: IncrementSelfStatsPayload) =>
    api.post<IncrementSelfStatsResult>('/users/me/rewards/increment', payload),
};
