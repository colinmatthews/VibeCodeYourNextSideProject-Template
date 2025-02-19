import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Contact, InsertContact } from "@shared/schema";

export default function EditContact({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = parseInt(params.id);

  const { data: contact } = useQuery<Contact>({
    queryKey: [`/api/contacts/${id}`],
  });

  const mutation = useMutation({
    mutationFn: async (contact: InsertContact) => {
      await apiRequest("PATCH", `/api/contacts/${id}`, contact);
    },
    onSuccess: () => {
      toast({
        title: "Contact updated",
        description: "The contact has been successfully updated.",
      });
      setLocation("/dashboard");
    },
  });

  if (!contact) return null;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm
            defaultValues={contact}
            onSubmit={(data) => mutation.mutate(data)}
            isLoading={mutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
