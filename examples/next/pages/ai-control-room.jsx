import AiAdminControlRoom from '../../../src/ui/AiAdminControlRoom';

export default function AiControlRoomPage() {
  return (
    <AiAdminControlRoom
      projectName="Example Project"
      title="AI Control Room"
      apiBasePath="/api/ai-admin"
      adminUser="next-example-admin"
    />
  );
}
