import { useRouteError } from "react-router";
import { Button } from "../components/ui/button";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-2">Oops!</h1>
          <p className="text-muted-foreground mb-4">
            Something went wrong. We're sorry for the inconvenience.
          </p>
        </div>

        <div className="space-y-4">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
            </pre>
          </details>

          <div className="flex gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Reload Page
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}