import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { InventoryContext } from '../context/InventoryContext';

export default function SettingsScreen() {
    const { session, signOut } = useContext(InventoryContext);

    const handleSignOut = () => {
        Alert.alert(
            'Sair',
            'Deseja realmente sair da conta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', onPress: signOut, style: 'destructive' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Usuário Logado:</Text>
                <Text style={styles.email}>{session?.user?.email}</Text>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                    <Text style={styles.logoutButtonText}>Sair da Conta</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />

            <Text style={styles.version}>Versão 3.1.0 - Carrinho & Preços</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 1,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    email: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginBottom: 20,
    }
});
