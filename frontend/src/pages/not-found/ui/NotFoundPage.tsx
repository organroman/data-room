import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild>
        <Link to="/datarooms">Back to Data Rooms</Link>
      </Button>
    </div>
  );
}
