import { NewProject } from "@/components/NewProject"
import { UploadActorImages } from "@/components/UploadActorImages"

const Index = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Temporary upload utility */}
        <UploadActorImages />
        
        {/* Main new project component */}
        <NewProject />
      </div>
    </div>
  )
};

export default Index;
