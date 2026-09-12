import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FeedStackNavigator } from "./FeedStackNavigator";
import AntDesign from "@react-native-vector-icons/ant-design";
import { LocationsStackNavigator } from "./LocationsStackNavigator";

const Tab = createBottomTabNavigator();

export function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="MainTab"
                component={FeedStackNavigator}
                options={{
                    title: "Home",
                    tabBarIcon: () => (
                        <AntDesign name="home" color="black" size={20} />
                    ),
                }}
            />
            <Tab.Screen
                name="LocationsTab"
                component={LocationsStackNavigator}
                options={{
                    title: "Locations",
                    tabBarIcon: () => (
                        <AntDesign name="environment" color="black" size={20} />
                    ),
                }}
            />
            <Tab.Screen
                name="CampusMapTab"
                component={LocationsStackNavigator}
                options={{
                    title: "Campus Map",
                    tabBarIcon: () => (
                        <AntDesign name="environment" color="black" size={20} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
