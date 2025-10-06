import { supabase } from "@/lib/supabaseClient";

export const uploadImage = async (uri: string) => {
    const fileExt = uri.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const img = await fetch(uri);
    const blob = await img.blob();

    const { error } = await supabase.storage.from("product-images").upload(filePath, blob);
    if (error) throw error;

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
};

export const insertProduct = async (product: any) => {
    const { error } = await supabase.from("product").insert(product);
    if (error) throw error;
};
