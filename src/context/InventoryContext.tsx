import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, InventoryContextType } from '../types';
import { supabase, supabaseAnon } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

type ExtendedContext = InventoryContextType & {
    session: Session | null;
    lookupProduct: (code: string) => Promise<{
        description: string;
        expected_quantity?: number;
        price?: number;
    } | null>;
    signOut: () => void;
};

export const InventoryContext = createContext<ExtendedContext>({
    products: [],
    addProduct: () => { },
    updateProduct: () => { },
    removeProduct: () => { },
    clearInventory: () => { },
    cart: [],
    addToCart: () => { },
    removeFromCart: () => { },
    clearCart: () => { },
    session: null,
    lookupProduct: async () => null,
    signOut: () => { },
});

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // Load local backup
        loadProducts();
        loadCart();
    }, []);

    const loadProducts = async () => {
        try {
            const stored = await AsyncStorage.getItem('@inventory');
            if (stored) {
                setProducts(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load inventory', e);
        }
    };

    const saveProductsLocal = async (newProducts: Product[]) => {
        try {
            await AsyncStorage.setItem('@inventory', JSON.stringify(newProducts));
        } catch (e) {
            console.error(e);
        }
    }

    const loadCart = async () => {
        try {
            const stored = await AsyncStorage.getItem('@cart');
            if (stored) {
                setCart(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load cart', e);
        }
    };

    const saveCartLocal = async (newCart: any[]) => {
        try {
            await AsyncStorage.setItem('@cart', JSON.stringify(newCart));
        } catch (e) {
            console.error(e);
        }
    }

    const addToCart = (item: any) => {
        const newCart = [...cart];
        const existingIndex = newCart.findIndex(i => i.code === item.code);
        if (existingIndex !== -1) {
            newCart[existingIndex].quantity += item.quantity;
        } else {
            newCart.push(item);
        }
        setCart(newCart);
        saveCartLocal(newCart);
    };

    const removeFromCart = (index: number) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
        saveCartLocal(newCart);
    };

    const clearCart = () => {
        setCart([]);
        saveCartLocal([]);
    };

    const addProduct = async (product: Product) => {
        // Optimistic UI update (temp ID)
        const tempProduct = { ...product, id: Date.now() };
        const newProducts = [tempProduct, ...products]; // Add to top
        setProducts(newProducts);
        saveProductsLocal(newProducts);

        // Sync to Supabase
        // Sync to Supabase
        if (session?.user) {
            // Detect if product needs correction (prioritize manual override if provided)
            const needsCorrection = product.needs_correction !== undefined
                ? product.needs_correction
                : (!product.code || product.code === 'SEM_EAN' || product.code.trim() === '');

            // 1. Insert Log with correction flag
            const { data, error } = await supabase.from('inventory_logs').insert({
                product_code: product.code,
                quantity: product.quantity,
                product_name: product.name,
                user_id: session.user.id,
                user_email: session.user.email,
                needs_correction: needsCorrection
            }).select().single();

            if (error) {
                console.error("Supabase Sync Error:", error);
            } else if (data) {
                // Update local product with real ID from Supabase
                const updatedProducts = newProducts.map(p =>
                    p.id === tempProduct.id ? { ...p, id: data.id } : p
                );
                setProducts(updatedProducts);
                saveProductsLocal(updatedProducts);

                // Log if product was flagged
                if (needsCorrection) {
                    console.log('⚠️ Produto marcado para correção:', product.name);
                }
            }

            // 2. Increment Product Base Count (RPC)
            const { error: rpcError } = await supabase.rpc('increment_product_count', {
                p_ean: product.code,
                p_qty: product.quantity
            });
            if (rpcError) console.error("RPC Error:", rpcError);
        }
    };

    const lookupProduct = async (code: string) => {
        console.log('🔍 Buscando produto com EAN:', code);
        const { data, error } = await supabaseAnon
            .from('products_base')
            .select('description, expected_quantity, price')
            .eq('ean', code)
            .single();

        if (error) {
            console.log('⚠️ Produto não encontrado na base');
            return null;
        }

        console.log('✅ Produto encontrado:', data?.description);
        return data; // { description: "..." } or null
    }

    const updateProduct = async (index: number, quantity: number) => {
        const newProducts = [...products];
        const product = newProducts[index];

        if (product) {
            product.quantity = quantity;
            setProducts(newProducts);
            saveProductsLocal(newProducts);

            // Sync Update
            if (product.id && session?.user) {
                const { error } = await supabase
                    .from('inventory_logs')
                    .update({ quantity: quantity })
                    .eq('id', product.id);

                if (error) console.error("Update Error:", error);
            }
        }
    };

    const removeProduct = async (index: number) => {
        const productToRemove = products[index];
        const newProducts = products.filter((_, i) => i !== index);
        setProducts(newProducts);
        saveProductsLocal(newProducts);

        // Sync Delete
        if (productToRemove.id && session?.user) {
            const { error } = await supabase
                .from('inventory_logs')
                .delete()
                .eq('id', productToRemove.id);

            if (error) console.error("Delete Error:", error);
        }
    };

    const clearInventory = () => {
        setProducts([]);
        saveProductsLocal([]);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    }

    return (
        <InventoryContext.Provider value={{
            products,
            addProduct,
            updateProduct,
            removeProduct,
            clearInventory,
            cart,
            addToCart,
            removeFromCart,
            clearCart,
            session,
            lookupProduct,
            signOut
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
