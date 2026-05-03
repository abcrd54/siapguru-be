import { v2 as cloudinary } from "cloudinary";

export function configureCloudinary(settings) {
  if (!settings?.cloudinary_cloud_name || !settings?.cloudinary_api_key || !settings?.cloudinary_api_secret) {
    throw new Error("Cloudinary settings are incomplete.");
  }

  cloudinary.config({
    cloud_name: settings.cloudinary_cloud_name,
    api_key: settings.cloudinary_api_key,
    api_secret: settings.cloudinary_api_secret,
    secure: true,
  });

  return cloudinary;
}
