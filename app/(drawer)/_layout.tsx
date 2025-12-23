import { Drawer } from 'expo-router/drawer';
import { DrawerContent } from '@/components/DrawerContent';
import { colors } from '@/styles/commonStyles';

export default function DrawerLayout() {
    return (
        <Drawer
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'slide',
                drawerActiveBackgroundColor: colors.card,
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: colors.text,
                drawerStyle: {
                    backgroundColor: colors.background,
                    width: '80%',
                },
                overlayColor: 'rgba(0,0,0,0.5)',
            }}
        >
            <Drawer.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                }}
            />
        </Drawer>
    );
}
