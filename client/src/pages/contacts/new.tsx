import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertContact } from "@shared/schema";

export default function NewContact() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (contact: InsertContact) => {
      await apiRequest("POST", "/api/contacts", contact);
    },
    onSuccess: () => {
      toast({
        title: "Contact created",
        description: "The contact has been successfully created.",
      });
      setLocation("/dashboard");
    },
  });

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm
            onSubmit={(data) => mutation.mutate(data)}
            isLoading={mutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
