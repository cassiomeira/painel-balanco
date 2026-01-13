import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image, FlatList } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { InventoryContext } from '../context/InventoryContext';
import React, { useState, useEffect, useContext } from 'react';
import Scanner from '../components/Scanner';
import { supabase, supabaseAnon } from '../services/supabase';

export default function HomeScreen({ navigation }: any) {
    const [scanning, setScanning] = useState(false);
    const [scannedCode, setScannedCode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [name, setName] = useState('');
    const [expectedQty, setExpectedQty] = useState<number | null>(null);
    const [price, setPrice] = useState<number | null>(null);
    const [currentEan, setCurrentEan] = useState('');
    const [currentInternalCode, setCurrentInternalCode] = useState('');
    const { addProduct, session, signOut, lookupProduct, addToCart } = useContext(InventoryContext);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [needsCorrection, setNeedsCorrection] = useState(false);

    // Search State
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [totalProducts, setTotalProducts] = useState<number | null>(null);

    // Buscar total de produtos ao carregar (igual painel web)
    useEffect(() => {
        const fetchTotal = async () => {
            try {
                const { count, error } = await supabaseAnon
                    .from('products_base')
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error('Erro ao contar produtos:', error);
                    setTotalProducts(0);
                } else {
                    console.log('✅ Total de produtos na base:', count);
                    setTotalProducts(count || 0);
                }
            } catch (err) {
                console.error('Erro:', err);
                setTotalProducts(0);
            }
        };
        fetchTotal();
    }, []);

    // Using supabase directly for search since it's specific to this screen
    const handleSearch = async (text: string) => {
        console.log('🔍 Buscando:', text);
        setSearchText(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            console.log('📡 Consultando Supabase...');

            // Busca em description, ean, e internal_code (usando ilike em todos)
            const { data, error } = await supabaseAnon
                .from('products_base')
                .select('*')
                .or(`description.ilike.%${text}%,ean.ilike.%${text}%,internal_code.ilike.%${text}%`)
                .limit(1000);

            if (error) {
                console.error('❌ Erro Supabase:', error);
                Alert.alert('Erro', 'Falha ao buscar: ' + error.message);
                return;
            }

            console.log('✅ Resultados:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('📦 Primeiro resultado completo:', JSON.stringify(data[0], null, 2));
            }
            setSearchResults(data || []);
        } catch (err) {
            console.error('❌ Erro inesperado:', err);
            Alert.alert('Erro', String(err));
        }
    };

    const handleBarCodeScanned = async (data: string) => {
        setScannedCode(data);
        setScanning(false);
        setLoadingProduct(true);

        // Auto-lookup
        const product = await lookupProduct(data);
        if (product && product.description) {
            setName(product.description);
            setExpectedQty(product.expected_quantity || 0);
            setPrice(product.price || 0);
            setCurrentEan(product.ean || data);
            setCurrentInternalCode(product.internal_code || '');
            // If scanned code is 'SEM_EAN' or similar, mark for correction
            if (data === 'SEM_EAN' || data === 'SEM GTIN') {
                setNeedsCorrection(true);
            } else {
                setNeedsCorrection(false);
            }
        } else {
            setName(''); // Not found, clear or keep previous? Better clear.
            setExpectedQty(null);
            setPrice(null);
            setCurrentEan(data);
            setCurrentInternalCode('');
            setNeedsCorrection(false); // Reset if product not found
        }
        setLoadingProduct(false);
    };

    // Auto-detect if selected product from search has no EAN
    const selectProduct = (item: any) => {
        setScannedCode(item.ean || 'SEM_EAN');
        setName(item.description);
        setExpectedQty(item.expected_quantity || 0);
        setPrice(item.price || 0);
        setCurrentEan(item.ean || '');
        setCurrentInternalCode(item.internal_code || '');
        setSearchText('');
        setSearchResults([]);
        // Auto-mark if missing EAN
        if (!item.ean || item.ean === 'SEM GTIN') {
            setNeedsCorrection(true);
        } else {
            setNeedsCorrection(false);
        }
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
            needs_correction: needsCorrection,
        });

        resetForm();
        Alert.alert('Sucesso', 'Produto adicionado ao Balanço!');
    };

    const handleAddToCart = () => {
        if (!quantity) {
            Alert.alert('Erro', 'Informe a quantidade.');
            return;
        }
        const qty = parseInt(quantity);
        if (isNaN(qty)) {
            Alert.alert('Erro', 'Quantidade inválida.');
            return;
        }

        if (!price || price <= 0) {
            Alert.alert('Aviso', 'Este produto está sem preço na planilha. Deseja adicionar mesmo assim?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Adicionar', onPress: () => processAddToCart(qty) }
            ]);
        } else {
            processAddToCart(qty);
        }
    };

    const processAddToCart = (qty: number) => {
        addToCart({
            code: scannedCode,
            name: name || 'Produto sem nome',
            price: price || 0,
            quantity: qty,
            ean: currentEan,
            internalCode: currentInternalCode
        });
        resetForm();
        Alert.alert('Carrinho', 'Produto adicionado ao carrinho!');
    };

    const resetForm = () => {
        setScannedCode('');
        setQuantity('');
        setName('');
        setExpectedQty(null);
        setPrice(null);
        setCurrentEan('');
        setCurrentInternalCode('');
        setNeedsCorrection(false);
    };

    if (scanning) {
        return <Scanner onScanned={handleBarCodeScanned} onClose={() => setScanning(false)} />;
    }

    // TELA DO FORMULÁRIO (Usando ScrollView para caber tudo)
    // Se não há código lido, usamos View para a busca (evita conflito de scroll)
    if (!scannedCode) {
        return (
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <FlatList
                    data={searchResults}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    ListHeaderComponent={
                        <View style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 }}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="🔍 Buscar produto por nome..."
                                value={searchText}
                                onChangeText={handleSearch}
                            />
                        </View>
                    }
                    ListEmptyComponent={
                        searchText.length < 3 ? (
                            <View style={[styles.centerContent, { padding: 20, marginTop: 40 }]}>
                                <Image
                                    source={require('../../assets/cnr_logo.jpg')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.title}>CNR Balanço</Text>

                                <Text style={{ fontSize: 14, color: totalProducts === null ? 'gray' : (totalProducts > 0 ? 'green' : 'red'), marginBottom: 10 }}>
                                    Base: {totalProducts === null ? 'Carregando...' : `${totalProducts} produtos`}
                                </Text>

                                <TouchableOpacity style={styles.scanButton} onPress={() => setScanning(true)}>
                                    <Text style={styles.scanButtonText}>Ler Código de Barras</Text>
                                </TouchableOpacity>

                                <Text style={styles.hint}>Toque no botão para iniciar a leitura</Text>
                            </View>
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#666' }}>Nenhum produto encontrado.</Text>
                            </View>
                        )
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.resultItem, { marginHorizontal: 20, backgroundColor: '#fcfcfc', borderBottomWidth: 1, borderBottomColor: '#eee' }]}
                            onPress={() => selectProduct(item)}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.resultText}>{item.description}</Text>
                                    <Text style={styles.resultSubText}>
                                        EAN: {item.ean || 'N/A'} - Cod: {item.internal_code || 'N/A'}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                                    {item.expected_quantity !== undefined && (
                                        <Text style={{ fontSize: 13, color: '#0056b3', fontWeight: 'bold' }}>
                                            Estoque: {item.expected_quantity}
                                        </Text>
                                    )}
                                    {item.price !== undefined && item.price > 0 && (
                                        <Text style={{ fontSize: 13, color: '#28a745', fontWeight: 'bold' }}>
                                            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    contentContainerStyle={{ flexGrow: 1 }}
                />
            </View>
        );
    }

    // Se temos código lido, usamos ScrollView para o formulário caber em telas pequenas
    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
                {loadingProduct ? <Text style={{ color: 'blue' }}>Buscando produto...</Text> : null}
                <Text style={styles.label}>Código: {scannedCode}</Text>
                {expectedQty !== null && (
                    <Text style={{ fontSize: 18, color: '#0056b3', fontWeight: 'bold', marginVertical: 2 }}>
                        Estoque Esperado: {expectedQty}
                    </Text>
                )}
                {price !== null && price > 0 && (
                    <Text style={{ fontSize: 20, color: '#28a745', fontWeight: 'bold', marginVertical: 2 }}>
                        Preço: R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                )}

                <Text style={styles.label}>Quantidade (Obrigatório):</Text>
                <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="0"
                    autoFocus
                />

                <Text style={styles.label}>Produto:</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome do produto"
                />

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}
                    onPress={() => setNeedsCorrection(!needsCorrection)}
                >
                    <View style={{
                        width: 24, height: 24, borderRadius: 4, borderWidth: 2,
                        borderColor: needsCorrection ? '#ff9800' : '#ccc',
                        backgroundColor: needsCorrection ? '#fff3e0' : 'transparent',
                        justifyContent: 'center', alignItems: 'center', marginRight: 10
                    }}>
                        {needsCorrection && <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 16, color: needsCorrection ? '#e65100' : '#333', fontWeight: needsCorrection ? 'bold' : 'normal' }}>
                        {needsCorrection ? '⚠️ Marcar para Correção' : 'Marcar para Correção'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.buttons}>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
                        <Text style={styles.addButtonText}>📋 Adicionar ao Balanço</Text>
                    </TouchableOpacity>

                    <View style={styles.spacer} />

                    <TouchableOpacity style={[styles.addButton, { backgroundColor: '#007bff' }]} onPress={handleAddToCart}>
                        <Text style={styles.addButtonText}>🛒 Adicionar ao Carrinho</Text>
                    </TouchableOpacity>

                    <View style={styles.spacer} />

                    <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
    searchActiveContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        paddingTop: 40, // Espaço para não colar no topo
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
    searchContainer: {
        width: '100%',
        marginBottom: 20,
        zIndex: 10,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    resultsList: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        elevation: 5,
    },
    resultsListStatic: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        marginTop: 10,
        flex: 1,
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    resultText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    resultSubText: {
        fontSize: 12,
        color: '#666',
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
