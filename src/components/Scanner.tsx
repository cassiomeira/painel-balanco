import React from 'react';
import { StyleSheet, View, Text, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface ScannerProps {
    onScanned: (data: string) => void;
    onClose: () => void;
}

export default function Scanner({ onScanned, onClose }: ScannerProps) {
    const [permission, requestPermission] = useCameraPermissions();

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Verificando permissões...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Precisamos da sua permissão para usar a câmera</Text>
                <Button onPress={requestPermission} title="Conceder permissão" />
                <Button onPress={onClose} title="Cancelar" color="red" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={({ data }) => {
                    onScanned(data);
                }}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code39", "code93", "code128", "codabar", "pdf417", "aztec", "datamatrix"],
                }}
            />
            <View style={styles.overlay}>
                <Button title="Cancelar" onPress={onClose} color="red" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
        marginBottom: 20,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 20,
    },
});
