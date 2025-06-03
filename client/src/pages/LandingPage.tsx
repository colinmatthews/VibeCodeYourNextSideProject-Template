import { Card } from "@/components/ui/card";
import { SiFirebase, SiSendgrid, SiStripe } from "react-icons/si";

export default function LandingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Vibe Code Your Next Side Project</h1>
      <p className="text-lg mb-8 text-center text-muted-foreground">
        A production-ready web application template with authentication, payments, and email notifications built in. 
        Currently configured for tracking a list of elements, but easily customizable to build your own product! 
        Built with modern web technologies and best practices.
      </p>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <SiFirebase className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-semibold">Firebase Setup</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to the <a href="https://console.firebase.google.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
            <li>Create a new Firebase project</li>
            <li>Click "Add app" and select Web platform ({"</>"} icon)</li>
            <li>Register your app and note down the configuration values</li>
            <li>Go to Authentication → Sign-in method</li>
            <li>Enable Google sign-in</li>
            <li>Add your Replit webview domain to Authorized domains:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Copy your Replit webview URL</li>
                <li>Go to Authentication → Settings</li>
                <li>Add the domain under Authorized domains</li>
              </ul>
            </li>
            <li>Add these Firebase secrets to your Replit:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>VITE_FIREBASE_API_KEY</li>
                <li>VITE_FIREBASE_PROJECT_ID</li>
                <li>VITE_FIREBASE_APP_ID</li>
                <li>VITE_FIREBASE_AUTH_DOMAIN (your-project-id.firebaseapp.com)</li>
                <li>VITE_FIREBASE_MESSAGING_SENDER_ID (from Project Settings)</li>
              </ul>
            </li>
          </ol>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <SiSendgrid className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-semibold">SendGrid Setup</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a <a href="https://signup.sendgrid.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">SendGrid account</a></li>
            <li>Verify your sender identity</li>
            <li>Create an API key:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Go to Settings → API Keys</li>
                <li>Click "Create API Key"</li>
                <li>Choose "Full Access" or "Restricted Access"</li>
              </ul>
            </li>
            <li>Add your SendGrid API key to Replit secrets as SENDGRID_API_KEY</li>
          </ol>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <SiStripe className="h-6 w-6 text-[#635BFF]" />
            <h2 className="text-2xl font-semibold">Stripe Setup</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a <a href="https://dashboard.stripe.com/register" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Stripe account</a></li>
            <li>Get your API keys:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Go to Developers → API keys</li>
                <li>Use test keys for development</li>
                <li>Switch to live keys for production</li>
              </ul>
            </li>
            <li>Set up your product and price:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Go to Products → Add Product</li>
                <li>Create a product with a recurring price</li>
                <li>Copy the price ID (starts with 'price_')</li>
              </ul>
            </li>
            <li>Configure webhook endpoint:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Go to Developers → Webhooks</li>
                <li>Click "Add endpoint"</li>
                <li>Use your Replit URL + '/api/webhook'</li>
                <li>Select events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed</li>
                <li>Copy the webhook signing secret (starts with 'whsec_')</li>
              </ul>
            </li>
            <li>Add these Stripe secrets to your Replit:
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>STRIPE_SECRET_KEY (from API keys)</li>
                <li>STRIPE_PRICE_ID_PRO (your price ID)</li>
                <li>VITE_STRIPE_PUBLIC_KEY (publishable key from API keys)</li>
                <li>STRIPE_WEBHOOK_SECRET (webhook signing secret)</li>
              </ul>
            </li>
          </ol>
        </Card>
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-4">Features & Customization</h3>
        <ul className="text-lg text-muted-foreground inline-block text-left">
          <li>✓ User Authentication via Firebase</li>
          <li>✓ Email Notifications with SendGrid</li>
          <li>✓ Payment Processing through Stripe</li>
          <li>✓ Database with PostgreSQL</li>
          <li>✓ Responsive UI with Tailwind CSS</li>
          <li>✓ Type-safe with TypeScript</li>
          <li>✓ Easily customizable data model</li>
          <li>✓ Modern React patterns</li>
        </ul>
      </div>
    </div>
  );
}