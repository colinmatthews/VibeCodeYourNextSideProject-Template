
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="mt-auto bg-background border-t">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold mb-4">Contact Manager</h3>
            <p className="text-muted-foreground">Making relationship management simple and effective.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/dashboard">Dashboard</Link></li>
              <li><Link href="/login">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li>support@contactmanager.com</li>
              <li>1-800-CONTACTS</li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Contact Manager. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
