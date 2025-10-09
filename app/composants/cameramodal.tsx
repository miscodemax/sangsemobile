// app/composants/CameraModal.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CameraModal({ visible, onClose, onPictureTaken }) {
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [photo, setPhoto] = useState(null); // Pour stocker la photo prise
    const cameraRef = useRef(null);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible]);

    if (!permission) {
        return <View />; // Ou un loader
    }
    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.permissionText}>Vous devez autoriser l'accès à la caméra pour continuer.</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleTakePhoto = async () => {
        if (cameraRef.current) {
            const result = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            setPhoto(result);
        }
    };

    const handleConfirmPhoto = () => {
        onPictureTaken(photo.uri);
        setPhoto(null); // Réinitialiser pour la prochaine fois
    };

    const handleRetakePhoto = () => {
        setPhoto(null);
    };

    return (
        <View style={styles.container}>
            {photo ? (
                // --- ÉCRAN DE CONFIRMATION ---
                <ImageBackground source={{ uri: photo.uri }} style={styles.preview}>
                    <SafeAreaView style={styles.overlay}>
                        <TouchableOpacity onPress={handleRetakePhoto} style={[styles.controlButton, styles.retakeButton]}>
                            <Ionicons name="refresh" size={28} color="#1C2B49" />
                            <Text style={styles.controlButtonText}>Reprendre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleConfirmPhoto} style={[styles.controlButton, styles.confirmButton]}>
                            <Ionicons name="checkmark-circle" size={28} color="#1C2B49" />
                            <Text style={styles.controlButtonText}>Utiliser cette photo</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </ImageBackground>
            ) : (
                // --- ÉCRAN DE PRISE DE PHOTO ---
                <Camera style={styles.camera} type={CameraType.back} ref={cameraRef}>
                    <SafeAreaView style={styles.overlay}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={32} color="white" />
                        </TouchableOpacity>
                        <View style={styles.guideFrame} />
                        <TouchableOpacity style={styles.shutterButton} onPress={handleTakePhoto} />
                    </SafeAreaView>
                </Camera>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    permissionText: { color: 'white', textAlign: 'center', fontSize: 18, padding: 20 },
    camera: { flex: 1 },
    preview: { flex: 1, justifyContent: 'flex-end' },
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', alignItems: 'center' },
    closeButton: { position: 'absolute', top: 20, left: 20 },
    guideFrame: {
        position: 'absolute',
        top: '15%',
        width: '90%',
        aspectRatio: 1,
        borderWidth: 2,
        borderColor: 'rgba(246, 196, 69, 0.7)',
        borderStyle: 'dashed',
        borderRadius: 10,
    },
    shutterButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        alignSelf: 'center',
        position: 'absolute',
        bottom: 40,
        borderWidth: 4,
        borderColor: 'rgba(0,0,0,0.2)',
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        margin: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    retakeButton: { backgroundColor: 'white' },
    confirmButton: { backgroundColor: '#F6C445' }, // Jaune Safran
    controlButtonText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C2B49',
    },
});