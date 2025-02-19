import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NewContact from "@/pages/contacts/new";
import EditContact from "@/pages/contacts/edit";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing"; // Added import for Landing page

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} /> {/* Added Landing page route */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contacts/new" component={NewContact} />
      <Route path="/contacts/edit/:id" component={EditContact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;