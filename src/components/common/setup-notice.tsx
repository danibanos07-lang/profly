import { Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function SetupNotice({ t }: { t: Dictionary }) {
  return (
    <Alert variant="warning">
      <Database />
      <AlertTitle>{t.setup.title}</AlertTitle>
      <AlertDescription>
        <p className="break-words [overflow-wrap:anywhere]">{t.setup.body}</p>
      </AlertDescription>
    </Alert>
  );
}
