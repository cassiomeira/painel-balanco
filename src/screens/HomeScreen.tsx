import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { InventoryContext } from '../context/InventoryContext';
import React, { useState, useEffect, useContext } from 'react';
import Scanner from '../components/Scanner';

export default function HomeScreen({ navigation }: any) {
    const [scanning, setScanning] = useState(false);
    const [scannedCode, setScannedCode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [name, setName] = useState('');
    const { addProduct, session, signOut } = useContext(InventoryContext);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    const handleBarCodeScanned = (data: string) => {
        setScannedCode(data);
        setScanning(false);
    };

    const handleAddProduct = () => {
        if (!quantity) {
            Alert.alert('Erro', 'Informe a quantidade.');
            return;
        }
        const qty = parseInt(quantity);
        if (isNaN(qty)) {
            Alert.alert('Erro', 'Quantidade inválida.');
            return;
        }

        addProduct({
            code: scannedCode,
            quantity: qty,
            name: name.trim() || undefined,
        });

        setScannedCode('');
        setQuantity('');
        setName('');
        Alert.alert('Sucesso', 'Produto adicionado!');
    };

    if (scanning) {
        return <Scanner onScanned={handleBarCodeScanned} onClose={() => setScanning(false)} />;
    }

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {!scannedCode ? (
                <View style={styles.centerContent}>
                    <Image
                        source={require('../../assets/cnr_logo.jpg')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>CNR Balanço</Text>

                    <TouchableOpacity style={styles.scanButton} onPress={() => setScanning(true)}>
                        <Text style={styles.scanButtonText}>Ler Código de Barras</Text>
                    </TouchableOpacity>

                    <Text style={styles.hint}>Toque no botão para iniciar a leitura</Text>
                </View>
            ) : (
                <View style={styles.form}>
                    {session?.user?.email && (
                        <View style={{ marginBottom: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#666', marginBottom: 5 }}>
                                Logado como: <Text style={{ fontWeight: 'bold' }}>{session.user.email}</Text>
                            </Text>
                            <TouchableOpacity onPress={signOut} style={{ padding: 8, backgroundColor: '#ffebee', borderRadius: 5 }}>
                                <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>Sair (Logout)</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <Image
                        source={require('../../assets/cnr_logo.jpg')}
                        style={styles.logoSmall}
                        resizeMode="contain"
                    />
                    <Text style={styles.label}>Código: {scannedCode}</Text>

                    <Text style={styles.label}>Quantidade (Obrigatório):</Text>
                    <TextInput
                        style={styles.input}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="0"
                        autoFocus
                    />

                    <Text style={styles.label}>Nome (Opcional):</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Nome do produto"
                    />

                    <View style={styles.buttons}>
                        <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
                            <Text style={styles.addButtonText}>Adicionar Produto</Text>
                        </TouchableOpacity>

                        <View style={styles.spacer} />

                        <TouchableOpacity style={styles.cancelButton} onPress={() => {
                            setScannedCode('');
                            setQuantity('');
                            setName('');
                        }}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    logo: {
        width: 250,
        height: 150,
        marginBottom: 20,
    },
    logoSmall: {
        width: 150,
        height: 80,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        marginBottom: 40,
        fontWeight: 'bold',
        color: '#0056b3', // Dark Blue
    },
    scanButton: {
        backgroundColor: '#007bff', // Primary Blue
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        elevation: 3,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hint: {
        color: '#666',
        marginTop: 15,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        marginTop: 10,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#bce0fd',
        backgroundColor: '#f8fbff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        fontSize: 18,
        color: '#000',
    },
    buttons: {
        marginTop: 20,
    },
    addButton: {
        backgroundColor: '#28a745', // Green for success/add
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#dc3545', // Red for cancel
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    spacer: {
        height: 10,
    }
});
