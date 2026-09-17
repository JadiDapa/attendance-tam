import { IdentityForm } from "@/components/mobile/employee-data/identity-form";
import { PersonalIdentityService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function IdentitasPage() {
  const user = await requireUser();
  const identity = await PersonalIdentityService.getByUserId(user.id);

  return (
    <IdentityForm
      initial={
        identity
          ? {
              nik: identity.nik,
              placeOfBirth: identity.placeOfBirth,
              dateOfBirth: identity.dateOfBirth.toISOString(),
              gender: identity.gender,
              religion: identity.religion,
              maritalStatus: identity.maritalStatus,
              nationality: identity.nationality,
              ktpPhotoUrl: identity.ktpPhotoUrl,
            }
          : null
      }
    />
  );
}
