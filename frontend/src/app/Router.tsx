import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell";
import { RequireAuth } from "./RequireAuth";
import { LoginPage, SignupPage } from "@/pages/auth";
import { DashboardPage } from "@/pages/dashboard";
import { DataroomPage, FilePreviewPanel } from "@/pages/dataroom";
import { StarredPage } from "@/pages/starred";
import { SharedWithMePage } from "@/pages/shared-with-me";
import { SharedViewLayout } from "@/pages/shared-view";
import { TrashPage } from "@/pages/trash";
import { NotFoundPage } from "@/pages/not-found";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        {/* Unguarded — an anonymous public-link viewer never logs in. Mirrors the
            authenticated /datarooms/... route shape 1:1, prefixed under the token, so
            DataroomPage/FilePreviewPanel are reused as-is (see BrowseContext). The bare
            /shared/:token path (no dataroomId yet) is handled inside SharedViewLayout
            itself, which redirects into the fuller path once it resolves the token. */}
        <Route path="shared/:token" element={<SharedViewLayout />}>
          <Route path="datarooms/:dataroomId" element={<DataroomPage />}>
            <Route path="files/:fileId" element={<FilePreviewPanel />} />
          </Route>
          <Route path="datarooms/:dataroomId/folders/:folderId" element={<DataroomPage />}>
            <Route path="files/:fileId" element={<FilePreviewPanel />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
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
            <Route path="shared-with-me" element={<SharedWithMePage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
