
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

import Navbar from "@/components/Navbar";

export default function Landing() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    toast({
      title: "Subscribed!",
      description: "Thank you for subscribing to our newsletter.",
    });
    setEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Manage Your Contacts Effortlessly</h1>
          <p className="text-xl text-muted-foreground mb-8">Keep your relationships strong with our intuitive contact management system</p>
          <Link href="/dashboard">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80"
          ].map((src, i) => (
            <div key={i} className="rounded-lg overflow-hidden shadow-lg">
              <img
                src={src}
                alt="People socializing"
                className="w-full h-64 object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-muted py-16 px-4">
        <div className="container mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">Subscribe to our newsletter for tips on managing your contacts effectively.</p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>

      {/* Footer */}
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
    </div>
  );
}
