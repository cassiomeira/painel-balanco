import React, { useContext } from 'react';
import { StyleSheet, View, Text, FlatList, Button, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { InventoryContext } from '../context/InventoryContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const [editModalVisible, setEditModalVisible] = React.useState(false);
const [editItem, setEditItem] = React.useState<{ index: number, quantity: string } | null>(null);
const { products, removeProduct, updateProduct, clearInventory } = useContext(InventoryContext);

const handleEdit = (index: number) => {
    setEditItem({ index, quantity: products[index].quantity.toString() });
    setEditModalVisible(true);
};

const saveEdit = () => {
    if (editItem) {
        const qty = parseInt(editItem.quantity);
        if (!isNaN(qty) && qty > 0) {
            updateProduct(editItem.index, qty);
            setEditModalVisible(false);
            setEditItem(null);
        } else {
            Alert.alert("Erro", "Quantidade inválida");
        }
    }
};

const confirmDelete = (index: number) => {
    Alert.alert("Excluir Item", "Tem certeza?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => removeProduct(index) }
    ]);
};

// ... exports logic remains same ...
const handleExport = async () => {
    if (products.length === 0) {
        Alert.alert('Aviso', 'Lista vazia.');
        return;
    }

    try {
        let content = "";
        products.forEach(p => {
            content += `${p.code};${p.quantity}\n`;
        });

        const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + "balanco.txt";

        await FileSystem.writeAsStringAsync(fileUri, content, { encoding: 'utf8' });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
        } else {
            Alert.alert("Erro", "Compartilhamento não disponível neste dispositivo");
        }

    } catch (e: any) {
        console.error(e);
        Alert.alert('Erro', 'Detalhes: ' + (e.message || e));
    }
};

const confirmClear = () => {
    Alert.alert("Limpar Lista", "Tem certeza que deseja apagar tudo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: clearInventory }
    ]);
}

return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Resumo ({products.length})</Text>
            <TouchableOpacity onPress={confirmClear} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
        </View>

        <FlatList
            data={products}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
                <View style={styles.item}>
                    <View>
                        <Text style={styles.itemCode}>Cod: {item.code}</Text>
                        {item.name ? <Text style={styles.itemName}>{item.name}</Text> : null}
                    </View>
                    <View style={styles.rightSide}>
                        <Text style={styles.itemQty}>{item.quantity}</Text>

                        <TouchableOpacity onPress={() => handleEdit(index)} style={styles.editBtn}>
                            <Text style={styles.editText}>✏️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => confirmDelete(index)} style={styles.deleteBtn}>
                            <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum produto adicionado.</Text>}
        />

        <View style={styles.footer}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                <Text style={styles.exportButtonText}>Exportar TXT</Text>
            </TouchableOpacity>
        </View>

        {/* Edit Modal */}
        {editModalVisible && (
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Editar Quantidade</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={editItem?.quantity}
                        onChangeText={(t) => setEditItem(prev => prev ? { ...prev, quantity: t } : null)}
                    />
                    <View style={styles.modalButtons}>
                        <Button title="Cancelar" onPress={() => setEditModalVisible(false)} color="#666" />
                        <Button title="Salvar" onPress={saveEdit} />
                    </View>
                </View>
            </View>
        )}
    </View>
);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0056b3',
    },
    item: {
        backgroundColor: '#f8fbff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e1effe',
    },
    itemCode: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    itemName: {
        color: '#666',
    },
    rightSide: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemQty: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 15,
        color: '#007bff',
    },
    deleteBtn: {
        padding: 5,
    },
    deleteText: {
        color: '#dc3545',
        fontWeight: 'bold',
        fontSize: 18,
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#888',
    },
    footer: {
        marginTop: 20,
        marginBottom: 20,
    },
    clearButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    clearButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    exportButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    editBtn: {
        padding: 5,
        marginRight: 10,
    },
    editText: {
        fontSize: 18,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        fontSize: 18,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    }
});
