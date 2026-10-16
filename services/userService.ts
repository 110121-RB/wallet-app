import { supabase } from "@/config/supabase";
import { ResponseType, UserDataType } from "@/types";
import { uploadImage } from "./storageService";

export const updateUser = async (
  uid: string,
  updateData: UserDataType,
): Promise<ResponseType> => {
  try {
    let imageUrl = null;

    // Nếu image đã là URL cũ
    if (typeof updateData.image === "string") {
      imageUrl = updateData.image;
    }

    // Nếu image là ảnh mới từ ImagePicker
    if (
      updateData.image &&
      typeof updateData.image === "object" &&
      "uri" in updateData.image
    ) {
      const uploadRes = await uploadImage(updateData.image.uri, uid);

      if (!uploadRes.success) {
        return uploadRes;
      }

      imageUrl = uploadRes.data;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: updateData.name,
        image: imageUrl,
      })
      .eq("id", uid);

    if (error) {
      return {
        success: false,
        msg: error.message,
      };
    }

    return {
      success: true,
      msg: "Updated successfully",
    };
  } catch (error: any) {
    console.log("error updating user:", error);

    return {
      success: false,
      msg: error?.message || "Something went wrong",
    };
  }
};
