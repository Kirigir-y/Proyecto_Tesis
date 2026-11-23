import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import PerfilScreen from '../screens/PerfilScreen';
import MensajesScreen from '../screens/mensajes/MensajesScreen';
import CalendarioScreen from '../screens/calendario/CalendarioScreen';
import InventarioScreen from '../screens/inventario/InventarioScreen';
import TurnoStack from './TurnoStack';
import VisitasStack from './VisitasStack';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Turno: '📋',
  Calendario: '📅',
  Visitas: '🚪',
  Inventario: '🧴',
  Mensajes: '💬',
  Perfil: '👤',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{ICONS[name] ?? '•'}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0a3a8a',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Turno" component={TurnoStack} />
      <Tab.Screen
        name="Calendario"
        component={CalendarioScreen}
        options={{ headerShown: true, title: 'Calendario', headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}
      />
      <Tab.Screen name="Visitas" component={VisitasStack} />
      <Tab.Screen
        name="Inventario"
        component={InventarioScreen}
        options={{ headerShown: true, title: 'Inventario de Aseo', headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}
      />
      <Tab.Screen
        name="Mensajes"
        component={MensajesScreen}
        options={{ headerShown: true, title: 'Mensajes', headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ headerShown: true, title: 'Perfil', headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0a3a8a" />
        <Text style={{ marginTop: 12, color: '#555' }}>Conectando con la plataforma...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
