import { AppDataSource } from '../config/database';
import { Friendship } from '../models/Friendship';
import { SharedAccountMember, type SharedRole } from '../models/SharedAccountMember';
import { ActivityLog, type ActivityScope } from '../models/ActivityLog';
import { SharedEntry } from '../models/SharedEntry';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

/** True when the two users have an accepted friendship (either direction). */
export async function areFriends(a: number, b: number): Promise<boolean> {
  if (a === b) return false;
  const repo = AppDataSource.getRepository(Friendship);
  const found = await repo.find({
    where: [
      { requester_id: a, addressee_id: b, status: 'accepted' },
      { requester_id: b, addressee_id: a, status: 'accepted' },
    ],
  });
  return found.length > 0;
}

/** Active membership of a user in a shared account (null when none / left). */
export async function getMembership(
  sharedAccountId: number,
  userId: number,
): Promise<SharedAccountMember | null> {
  const repo = AppDataSource.getRepository(SharedAccountMember);
  const member = await repo.findOne({
    where: { shared_account_id: sharedAccountId, user_id: userId },
  });
  if (!member || member.left_at) return null;
  return member;
}

/** Ensures the user belongs to the shared account, otherwise throws 403. */
export async function requireMembership(
  sharedAccountId: number,
  userId: number,
): Promise<SharedAccountMember> {
  const member = await getMembership(sharedAccountId, userId);
  if (!member) {
    throw new AppError('No tienes acceso a esta cuenta compartida', 403);
  }
  return member;
}

export const isManagementRole = (role: SharedRole): boolean =>
  role === 'owner' || role === 'admin';

/** Viewer role is read-only; everyone else can write. */
export const canWrite = (role: SharedRole): boolean => role !== 'viewer';

/** Appends an audit entry. Failures never break the main request. */
export async function logActivity(
  scope: ActivityScope,
  scopeId: number,
  actorId: number,
  action: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(ActivityLog);
    await repo.save(
      repo.create({
        scope,
        scope_id: scopeId,
        actor_id: actorId,
        action,
        payload: payload ?? null,
      }),
    );
  } catch {
    /* audit is best-effort */
  }
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Signed effect of a shared entry on the account balance. */
export function entryDelta(type: SharedEntry['type'], amount: number | string): number {
  return type === 'contribution' ? Number(amount) : -Number(amount);
}

/** Balance of a shared account: contributions minus everything that goes out. */
export function computeSharedBalance(entries: SharedEntry[]): number {
  const total = entries
    .filter((entry) => !entry.voided_at)
    .reduce((sum, entry) => sum + entryDelta(entry.type, entry.amount), 0);
  return round2(total);
}

export interface PublicUser {
  id: number;
  username: string;
}

/** Resolves a set of user ids to their public identity, deduplicated. */
export async function usersByIds(ids: number[]): Promise<PublicUser[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return [];
  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({ where: unique.map((id) => ({ id })) });
  return users.map((u) => ({ id: u.id, username: u.username }));
}
