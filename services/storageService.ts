import { supabase } from "@/config/supabase";
import { ResponseType } from "@/types";

const AVATAR_BUCKET = "avatars";
const RECEIPT_BUCKET = "receipts";

const getImageMeta = (imageUri: string) => {
  const cleanUri = imageUri.split("?")[0] ?? imageUri;
  const rawExt = cleanUri.split(".").pop()?.toLowerCase();
  const extension =
    rawExt && ["jpg", "jpeg", "png", "webp", "heic"].includes(rawExt)
      ? rawExt
      : "jpg";

  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  return {
    extension,
    contentType: contentTypes[extension] ?? "image/jpeg",
  };
};

export const uploadImage = async (
  imageUri: string,
  userId: string,
): Promise<ResponseType> => {
  try {
    const { extension, contentType } = getImageMeta(imageUri);
    const filePath = `${userId}/avatar_${Date.now()}.${extension}`;
    const arrayBuffer = await fetch(imageUri).then((res) => res.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.log(
        `Avatar upload failed in ${AVATAR_BUCKET}:`,
        uploadError.message,
      );

      return {
        success: false,
        msg: uploadError.message,
      };
    }

    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: `${data.publicUrl}?v=${Date.now()}`,
    };
  } catch (error: any) {
    console.log("upload image error:", error);

    return {
      success: false,
      msg: error?.message || "Could not upload image",
    };
  }
};

export const uploadReceiptImage = async (
  imageUri: string,
  userId: string,
): Promise<ResponseType> => {
  try {
    const { extension, contentType } = getImageMeta(imageUri);
    const filePath = `${userId}/receipt_${Date.now()}.${extension}`;
    const arrayBuffer = await fetch(imageUri).then((res) => res.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.log(`Receipt upload failed in ${RECEIPT_BUCKET}:`, uploadError.message);
      return { success: false, msg: uploadError.message };
    }

    const { data } = supabase.storage
      .from(RECEIPT_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: `${data.publicUrl}?v=${Date.now()}`,
    };
  } catch (error: any) {
    console.log("receipt upload error:", error);
    return {
      success: false,
      msg: error?.message || "Could not upload receipt image",
    };
  }
};
