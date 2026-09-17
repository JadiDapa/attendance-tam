import { DocumentsForm } from "@/components/mobile/employee-data/documents-form";
import { AdministrativeDocumentService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function DokumenPage() {
  const user = await requireUser();
  const documents = await AdministrativeDocumentService.getByUserId(user.id);

  return <DocumentsForm initial={documents} />;
}
