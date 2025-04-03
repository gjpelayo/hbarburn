import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onChange: (url: string) => void;
  value: string;
  className?: string;
}

export function FileUpload({ onChange, value, className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // For now, just create a data URL from the file
      // In production, you would upload to a server or cloud storage
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onChange(reader.result.toString());
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Error reading file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError("Error uploading image");
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!value ? (
        <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isUploading ? "Uploading..." : "Click to upload an image"}
            </p>
            <Button
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              size="sm"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" /> Select Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-md"
          />
          <Button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/50 hover:bg-black/70"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4 text-white" />
          </Button>
        </div>
      )}
      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}
    </div>
  );
}