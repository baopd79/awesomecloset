import { BottomTabBarProps } from 'expo-router/tabs';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/components/ui/Icon';
import { T } from '@/lib/theme';

// Custom tab bar matching design: Hôm nay · Tủ đồ · + · Thống kê
// Center "+" button is larger with ink background (Add screen)

type RegularTab = { type: 'tab'; routeName: string; label: string; icon: IconName };
type AddButton = { type: 'add' };
type BarItem = RegularTab | AddButton;

const BAR_ITEMS: BarItem[] = [
  { type: 'tab', routeName: 'index',     label: 'Hôm nay',  icon: 'home' },
  { type: 'tab', routeName: 'closet',    label: 'Tủ đồ',    icon: 'closet' },
  { type: 'add' },
  { type: 'tab', routeName: 'analytics', label: 'Thống kê', icon: 'chart' },
];

function TabBarButton({ item, state, navigation }: { item: RegularTab; state: BottomTabBarProps['state']; navigation: BottomTabBarProps['navigation'] }) {
  const routeIdx = state.routes.findIndex((r) => r.name === item.routeName);
  const focused = state.index === routeIdx;

  function onPress() {
    const route = state.routes[routeIdx];
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(item.routeName);
  }

  return (
    <Pressable key={item.routeName} onPress={onPress} style={styles.tabItem}>
      <Icon name={item.icon} size={22} color={focused ? T.accent : T.sub} strokeWidth={focused ? 2 : 1.8} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{item.label}</Text>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}>
      {BAR_ITEMS.map((item) => {
        if (item.type === 'add') {
          return (
            <Pressable
              key="add-btn"
              onPress={() => router.push('/(tabs)/add')}
              style={({ pressed }) => [styles.addBtn, pressed && styles.addPressed]}
            >
              <Icon name="plus" size={26} color="#FBF8F2" strokeWidth={2} />
            </Pressable>
          );
        }
        return <TabBarButton key={item.routeName} item={item} state={state} navigation={navigation} />;
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="closet" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="analytics" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.line,
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    minHeight: 42,
  },
  tabLabel: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 10.5,
    color: T.sub,
  },
  tabLabelActive: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: T.accent,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: -16,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  addPressed: { transform: [{ scale: 0.93 }] },
});
