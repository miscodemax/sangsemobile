import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import { Button, Image, StyleSheet, View } from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";

type Props = {
    image: string | null;
    setImage: (uri: string | null) => void;
};

export default function ImagePickerComponent({ image, setImage }: Props) {
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const devices = useCameraDevices();
    const device = devices.back;
    const cameraRef = useRef<Camera>(null);

    useEffect(() => {
        const requestPermissions = async () => {
            await Camera.requestCameraPermission();
            await MediaLibrary.requestPermissionsAsync();
        };
        requestPermissions();
    }, []);

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePhoto({ qualityPrioritization: "speed" });
        setImage(`file://${photo.path}`);
        setCameraEnabled(false);
    };

    const pickFromGallery = async () => {
        const result = await MediaLibrary.launchImageLibraryAsync({
            mediaTypes: MediaLibrary.MediaTypeOptions.Images,
            quality: 0.7,
        });
        if (!result.canceled) return;
        setImage(result.assets[0].uri);
    };

    return (
        <View style={{ marginVertical: 10 }}>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <Button title="📸 Prendre une photo" onPress={() => setCameraEnabled(true)} />
                <Button title="🖼️ Galerie" onPress={pickFromGallery} />
            </View>

            {cameraEnabled && device && (
                <Camera
                    ref={cameraRef}
                    style={{ width: "100%", height: 300, marginBottom: 10 }}
                    device={device}
                    isActive={cameraEnabled}
                    photo
                />
            )}

            {image && <Image source={{ uri: image }} style={styles.imagePreview} />}
        </View>
    );
}

const styles = StyleSheet.create({
    imagePreview: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        marginTop: 10,
    },
});
