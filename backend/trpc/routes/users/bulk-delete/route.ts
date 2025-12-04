import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(z.object({ userIds: z.array(z.string()) }))
  .mutation(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const currentUserId = (profile as any).id;
    const userIdsToDelete = input.userIds.filter(id => id !== currentUserId);

    if (userIdsToDelete.length === 0) {
      throw new Error("No valid users to delete");
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .in("id", userIdsToDelete);

    if (error) {
      console.error("Error bulk deleting users:", error);
      throw new Error(`Failed to bulk delete users: ${error.message}`);
    }

    await (supabase.from("audit_logs") as any).insert({
      table_name: "profiles",
      action: "bulk_user_deleted",
      performed_by: currentUserId,
      row_id: null,
      payload: { deleted_ids: userIdsToDelete } as any,
    });

    return { success: true, deleted: userIdsToDelete.length };
  });
