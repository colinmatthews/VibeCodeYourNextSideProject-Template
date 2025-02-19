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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/contacts/new" component={NewContact} />
          <Route path="/contacts/edit/:id" component={EditContact} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
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