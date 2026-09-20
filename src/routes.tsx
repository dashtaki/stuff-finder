import type { RouteObject } from "react-router";
import { AddItemPage } from "./pages/AddItemPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DebugPage } from "./pages/DebugPage";
import { EditItemPage } from "./pages/EditItemPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";

export const routes: RouteObject[] = [
  { path: "/", element: <DashboardPage /> },
  { path: "/new", element: <AddItemPage /> },
  { path: "/item/:id", element: <ItemDetailPage /> },
  { path: "/item/:id/edit", element: <EditItemPage /> },
  { path: "/debug", element: <DebugPage /> },
];
