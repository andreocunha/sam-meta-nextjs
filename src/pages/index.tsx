import { ImageUploader } from "@/components/ImageUploader";
import { CanvasHandler } from "../components/CanvasHandler";

export default function Home() {
  return (
    <div className='flex flex-col items-center justify-center w-full h-screen bg-black'>
      <CanvasHandler />
      {/* <ImageUploader /> */}
    </div>
  );
}
