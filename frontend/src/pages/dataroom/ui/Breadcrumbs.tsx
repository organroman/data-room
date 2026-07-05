import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { FolderOpenIcon } from "lucide-react";

interface BreadcrumbsProps {
  dataroomId: string;
  dataroomName: string;
  folders: Array<{ id: string; name: string }>;
}

export function Breadcrumbs({
  dataroomId,
  dataroomName,
  folders,
}: BreadcrumbsProps) {
  const isAtRoot = folders.length === 0;

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          {isAtRoot ? (
            <BreadcrumbPage className="inline-flex items-center gap-1.5">
              <FolderOpenIcon className="w-5 h-5 " />
              {dataroomName}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link
                to={`/datarooms/${dataroomId}`}
                className="inline-flex items-center gap-1.5"
              >
                <FolderOpenIcon className="w-5 h-5" />
                {dataroomName}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {folders.map((folder, index) => {
          const isLast = index === folders.length - 1;
          return (
            <span key={folder.id} className="inline-flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="max-w-[16rem] truncate">
                    {folder.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={`/datarooms/${dataroomId}/folders/${folder.id}`}
                      className="max-w-[16rem] truncate"
                    >
                      {folder.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
