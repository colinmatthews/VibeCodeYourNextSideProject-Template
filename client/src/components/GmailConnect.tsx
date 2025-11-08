import { useGmail } from "../hooks/useGmail";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mail, Loader2, RefreshCw, Unplug } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

// ============================================================================
// GMAIL CONNECT COMPONENT
// ============================================================================

export function GmailConnect() {
  const {
    isConnected,
    lastScan,
    isLoadingStatus,
    connectGmail,
    disconnectGmail,
    scanInbox,
    isConnecting,
    isDisconnecting,
    isScanning,
  } = useGmail();

  if (isLoadingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connect Gmail
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to automatically detect and track your subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">What we'll access:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Read-only access to your emails</li>
              <li>Scan for subscription confirmation emails</li>
              <li>Extract billing information securely</li>
            </ul>
            <p className="mt-3 text-xs">
              We never send emails or access your inbox without permission.
              You can disconnect anytime.
            </p>
          </div>

          <Button
            onClick={() => connectGmail()}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Connected
              <Badge variant="success" className="ml-2">
                Active
              </Badge>
            </CardTitle>
            <CardDescription>
              {lastScan
                ? `Last scanned: ${lastScan.toLocaleDateString()} at ${lastScan.toLocaleTimeString()}`
                : "Ready to scan for subscriptions"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={() => scanInbox()}
            disabled={isScanning}
            className="flex-1"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan Inbox
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isDisconnecting}>
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your Gmail connection and stop automatic subscription detection.
                  Your existing tracked subscriptions will remain, but no new ones will be detected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => disconnectGmail()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="text-xs text-muted-foreground rounded-lg border p-3">
          <p className="font-medium mb-1">Privacy:</p>
          <p>
            We scan your inbox for subscription-related emails and extract billing info.
            Email content is stored for 30 days then automatically deleted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
