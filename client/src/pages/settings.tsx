
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
          <div className="space-y-4">
            <Button variant="outline">Change Password</Button>
            <Button variant="outline">Update Email Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
