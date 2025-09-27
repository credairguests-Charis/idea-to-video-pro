import { NewProject } from "@/components/NewProject"
import { UploadActorImages } from "@/components/UploadActorImages"
import { PollStatus } from "@/components/PollStatus"

const Index = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Temporary utilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadActorImages />
          <PollStatus />
        </div>
        
        {/* Main new project component */}
        <NewProject />
      </div>
    </div>
  )
};

export default Index;
