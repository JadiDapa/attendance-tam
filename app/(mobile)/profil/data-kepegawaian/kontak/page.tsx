import { ContactForm } from "@/components/mobile/employee-data/contact-form";
import { ContactService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function KontakPage() {
  const user = await requireUser();
  const contact = await ContactService.getByUserId(user.id);

  return <ContactForm initial={contact} />;
}
