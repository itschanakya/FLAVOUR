import { Cloudinary } from '@cloudinary/url-gen';

// Initialize Cloudinary SDK
// Uses the client-side safe environment variable for cloud name
const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  }
});

export default cld;
