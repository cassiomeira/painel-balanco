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
        // Optimistic UI update (temp ID)
        const tempProduct = { ...product, id: Date.now() };
        const newProducts = [tempProduct, ...products]; // Add to top
        setProducts(newProducts);
        saveProductsLocal(newProducts);

        // Sync to Supabase
        if (session?.user) {
            const { data, error } = await supabase.from('inventory_logs').insert({
                product_code: product.code,
                quantity: product.quantity,
                product_name: product.name,
                user_id: session.user.id,
                user_email: session.user.email
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
            }
        }
    };

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
        <InventoryContext.Provider value={{ products, addProduct, updateProduct, removeProduct, clearInventory, session, signOut }}>
            {children}
        </InventoryContext.Provider>
    );
};
