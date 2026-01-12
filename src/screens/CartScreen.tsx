import React, { useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { InventoryContext } from '../context/InventoryContext';

export default function CartScreen() {
    const { cart, removeFromCart, clearCart } = useContext(InventoryContext);

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleClear = () => {
        Alert.alert(
            'Limpar Carrinho',
            'Tem certeza que deseja apagar todos os itens?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpar', onPress: clearCart, style: 'destructive' }
            ]
        );
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSubText}>
                    {item.quantity}x R$ {item.price.toFixed(2)}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemTotal}>
                    R$ {(item.price * item.quantity).toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => removeFromCart(index)}>
                    <Text style={{ color: 'red', marginTop: 5 }}>Remover</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🛒 Meu Carrinho</Text>
                <TouchableOpacity onPress={handleClear} disabled={cart.length === 0}>
                    <Text style={[styles.clearText, cart.length === 0 && { opacity: 0.5 }]}>Limpar</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={cart}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Seu carrinho está vazio.</Text>
                    </View>
                }
                contentContainerStyle={{ padding: 15 }}
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL GERAL:</Text>
                    <Text style={styles.totalValue}>R$ {total.toFixed(2).replace('.', ',')}</Text>
                </View>
                <TouchableOpacity
                    style={styles.finishButton}
                    onPress={() => Alert.alert('Finalizar', 'Para finalizar, o cliente deve ir ao caixa com os produtos.')}
                >
                    <Text style={styles.finishButtonText}>Finalizar Pré-Venda</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    clearText: {
        color: '#ff4444',
        fontWeight: 'bold',
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        alignItems: 'center',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    itemSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#28a745',
    },
    footer: {
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#28a745',
    },
    finishButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    finishButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    }
});
