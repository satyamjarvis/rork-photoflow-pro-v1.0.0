import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import usersList from "./routes/users/list/route";
import usersGet from "./routes/users/get/route";
import usersUpdateRole from "./routes/users/update-role/route";
import usersUpdateStatus from "./routes/users/update-status/route";
import usersDelete from "./routes/users/delete/route";
import usersBulkDelete from "./routes/users/bulk-delete/route";
import dashboardStats from "./routes/dashboard/stats/route";
import mediaStats from "./routes/media/stats/route";
import mediaList from "./routes/media/list/route";
import mediaCreate from "./routes/media/create/route";
import mediaDelete from "./routes/media/delete/route";
import mediaUpdate from "./routes/media/update/route";
import portfolioStats from "./routes/portfolio/stats/route";
import portfolioList from "./routes/portfolio/list/route";
import portfolioCreate from "./routes/portfolio/create/route";
import portfolioUpdate from "./routes/portfolio/update/route";
import portfolioDelete from "./routes/portfolio/delete/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  users: createTRPCRouter({
    list: usersList,
    get: usersGet,
    updateRole: usersUpdateRole,
    updateStatus: usersUpdateStatus,
    delete: usersDelete,
    bulkDelete: usersBulkDelete,
  }),
  dashboard: createTRPCRouter({
    stats: dashboardStats,
  }),
  media: createTRPCRouter({
    stats: mediaStats,
    list: mediaList,
    create: mediaCreate,
    update: mediaUpdate,
    delete: mediaDelete,
  }),
  portfolio: createTRPCRouter({
    stats: portfolioStats,
    list: portfolioList,
    create: portfolioCreate,
    update: portfolioUpdate,
    delete: portfolioDelete,
  }),
});

export type AppRouter = typeof appRouter;
