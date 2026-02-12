import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
    </div>
  );
}
