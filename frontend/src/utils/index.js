import axios from "axios";

export const imageUpload = async imageData =>{
      const formData = new FormData();
    formData.append("image", imageData);

      const  {data}  = await axios.post(
        `https://api.imgbb.com/1/upload?key=${
          import.meta.env.VITE_IMAGE_API_KEY
        }`,
        formData
      );
      return data?.data.display_url
}

export const imageUploadCloudinary = async imageData =>{
      const formData = new FormData();
    formData.append("file", imageData);
    formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOADE_PRESENT);

      const  {data}  = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUDE_NAME}/image/upload`,
        formData
      );
      return data.secure_url
}

export const saveOrUpdateUser = async userData =>{
  const {data} = await axios.post(
    `${import.meta.env.VITE_API_URL}/user`, userData
  )
  return data
}