import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell";
import { DashboardPage } from "@/pages/dashboard";
import { DataroomPage, FilePreviewPanel } from "@/pages/dataroom";
import { StarredPage } from "@/pages/starred";
import { TrashPage } from "@/pages/trash";
import { NotFoundPage } from "@/pages/not-found";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/datarooms" replace />} />
          <Route path="datarooms" element={<DashboardPage />} />
          <Route path="datarooms/:dataroomId" element={<DataroomPage />}>
            <Route path="files/:fileId" element={<FilePreviewPanel />} />
          </Route>
          <Route path="datarooms/:dataroomId/folders/:folderId" element={<DataroomPage />}>
            <Route path="files/:fileId" element={<FilePreviewPanel />} />
          </Route>
          <Route path="starred" element={<StarredPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
