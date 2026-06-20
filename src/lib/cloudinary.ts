import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

export async function uploadImage(
  file: File,
  folder: string = "connecta"
): Promise<{ url: string; publicId: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const dataUri = `data:${file.type};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "auto",
    transformation: [
      { width: 1200, height: 1200, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
