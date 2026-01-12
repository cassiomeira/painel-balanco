import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { InventoryContext, InventoryProvider } from './src/context/InventoryContext';
import HomeScreen from './src/screens/HomeScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import CartScreen from './src/screens/CartScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BlockedScreen from './src/screens/BlockedScreen';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { session, isIpAuthorized } = useContext(InventoryContext);

  if (isIpAuthorized === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (isIpAuthorized === false) {
    return <BlockedScreen />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any;

            if (route.name === 'Leitor') {
              iconName = focused ? 'barcode' : 'barcode-outline';
            } else if (route.name === 'Carrinho') {
              iconName = focused ? 'cart' : 'cart-outline';
            } else if (route.name === 'Resumo') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Ajustes') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007bff',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen name="Leitor" component={HomeScreen} options={{ title: 'Balanço / Preço' }} />
        <Tab.Screen name="Carrinho" component={CartScreen} options={{ title: 'Carrinho de Venda' }} />
        <Tab.Screen name="Resumo" component={SummaryScreen} options={{ title: 'Produtos Lidos' }} />
        <Tab.Screen name="Ajustes" component={SettingsScreen} options={{ title: 'Configurações' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
