import { ThemeProvider } from "./providers/theme-provider";
import { QueryProvider } from "./providers/query-provider";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/sonner";
import { Router } from "./Router";

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <Router />
        </TooltipProvider>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
