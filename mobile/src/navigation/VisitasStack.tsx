import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VisitasListScreen from '../screens/visitas/VisitasListScreen';
import VisitaFormScreen from '../screens/visitas/VisitaFormScreen';
import type { VisitLog } from '../types';

export type VisitasStackParamList = {
  VisitasLista: undefined;
  VisitaForm: { log?: VisitLog; date?: string } | undefined;
};

const Stack = createNativeStackNavigator<VisitasStackParamList>();

export default function VisitasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="VisitasLista" component={VisitasListScreen} options={{ title: 'Visitas y Salidas' }} />
      <Stack.Screen name="VisitaForm" component={VisitaFormScreen} options={{ title: 'Registro' }} />
    </Stack.Navigator>
  );
}
