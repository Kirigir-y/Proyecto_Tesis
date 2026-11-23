import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TurnoScreen from '../screens/turno/TurnoScreen';
import BedDetailScreen from '../screens/turno/BedDetailScreen';
import { TurnoProvider } from '../context/TurnoContext';
import type { Bed } from '../types';

export type TurnoStackParamList = {
  TurnoLista: undefined;
  BedDetail: { room: number; bed: Bed };
};

const Stack = createNativeStackNavigator<TurnoStackParamList>();

export default function TurnoStack() {
  return (
    <TurnoProvider>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a3a8a' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="TurnoLista" component={TurnoScreen} options={{ title: 'Informe de turno' }} />
        <Stack.Screen
          name="BedDetail"
          component={BedDetailScreen}
          options={({ route }) => ({ title: `Hab. ${route.params.room} · Cama ${route.params.bed}` })}
        />
      </Stack.Navigator>
    </TurnoProvider>
  );
}
