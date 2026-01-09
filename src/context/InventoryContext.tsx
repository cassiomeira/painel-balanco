import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, InventoryContextType } from '../types';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

type ExtendedContext = InventoryContextType & {
    session: Session | null;
    signOut: () => void;
};

export const InventoryContext = createContext<ExtendedContext>({
    products: [],
    addProduct: () => { },
    updateProduct: () => { },
    removeProduct: () => { },
    clearInventory: () => { },
    session: null,
    signOut: () => { },
});

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const [products, setProducts] = useState<Product[]>([]);
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

    const addProduct = async (product: Product) => {
        const newProducts = [...products, product];
        setProducts(newProducts);
        saveProductsLocal(newProducts);

        // Sync to Supabase
        if (session?.user) {
            const { error } = await supabase.from('inventory_logs').insert({
                product_code: product.code,
                quantity: product.quantity,
                product_name: product.name,
                user_id: session.user.id,
                user_email: session.user.email // Enviando o email
            });

            if (error) {
                console.error("Supabase Sync Error:", error);
                // Optional: Mark as 'un-synced' to retry later
            }
        }
    };

    const updateProduct = (index: number, quantity: number) => {
        const newProducts = [...products];
        if (newProducts[index]) {
            newProducts[index].quantity = quantity;
            setProducts(newProducts);
            saveProductsLocal(newProducts);
        }
    };

    const removeProduct = (index: number) => {
        const newProducts = products.filter((_, i) => i !== index);
        setProducts(newProducts);
        saveProductsLocal(newProducts);
    };

    const clearInventory = () => {
        setProducts([]);
        saveProductsLocal([]);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    }

    return (
        <InventoryContext.Provider value={{ products, addProduct, updateProduct, removeProduct, clearInventory, session, signOut }}>
            {children}
        </InventoryContext.Provider>
    );
};
