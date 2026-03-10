import { supabaseAdmin } from './db/client';

interface NotificationParams {
  userId: string;
  type: 'comment_reply' | 'vote_received' | 'new_report' | 'badge_earned';
  title: string;
  body?: string;
  url?: string;
}

/**
 * Create a notification for a user, respecting their notification preferences.
 * Never creates notifications for a user about their own actions (check before calling).
 */
export async function createNotification({ userId, type, title, body, url }: NotificationParams) {
  try {
    // Check user preferences
    const { data: prefs } = await supabaseAdmin
      .from('users')
      .select('notify_on_reply, notify_on_vote')
      .eq('id', userId)
      .single();

    if (prefs) {
      if (type === 'comment_reply' && prefs.notify_on_reply === false) return;
      if (type === 'vote_received' && prefs.notify_on_vote === false) return;
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body?.slice(0, 200) ?? null,
      url: url ?? null,
      is_read: false,
    });
  } catch (err) {
    // Notification failures should never break the main operation
    console.error('Notification creation failed:', err);
  }
}

/**
 * Get game slug by game ID (cached in-memory for the request lifetime).
 */
export async function getGameSlug(gameId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('games')
    .select('slug')
    .eq('id', gameId)
    .single();
  return data?.slug ?? null;
}
