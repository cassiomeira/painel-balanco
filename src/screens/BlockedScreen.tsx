import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { InventoryContext } from '../context/InventoryContext';
import { Ionicons } from '@expo/vector-icons';

export default function BlockedScreen() {
    const { checkIp, isIpAuthorized } = useContext(InventoryContext);

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Ionicons name="lock-closed" size={80} color="#dc3545" />
                <Text style={styles.title}>Acesso Negado</Text>
                <Text style={styles.message}>
                    Este aplicativo só pode ser utilizado quando conectado na rede Wi-Fi da Loja (IP Autorizado).
                </Text>

                {isIpAuthorized === null ? (
                    <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
                ) : (
                    <TouchableOpacity style={styles.retryButton} onPress={checkIp}>
                        <Text style={styles.retryText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.footer}>
                    Se você acredita que isso é um erro, verifique se seu Wi-Fi está ligado.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#dc3545', // Red background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '100%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    retryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 30,
    }
});
