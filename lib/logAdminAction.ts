import { supabase } from '@/lib/supabase';
import { Database, Json } from '@/types/database';

type LogAdminActionArgs = Database['public']['Functions']['log_admin_action']['Args'];

export type LogAdminActionParams = {
  tableName: string;
  action: string;
  rowId?: string | null;
  payload?: Json | null;
};

export const logAdminAction = async ({
  tableName,
  action,
  rowId,
  payload,
}: LogAdminActionParams) => {
  console.log('[Audit] Logging action', action, 'on', tableName);

  const rpcPayload: LogAdminActionArgs = {
    p_table_name: tableName,
    p_action: action,
    p_row_id: rowId ?? '',
    p_payload: payload ?? null,
  };

  const { error } = await supabase.rpc('log_admin_action', rpcPayload as never);

  if (error) {
    console.error('[Audit] Failed to log action:', JSON.stringify(error, null, 2));
  } else {
    console.log('[Audit] Action logged successfully');
  }

  return { error };
};
