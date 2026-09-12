import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FeedMainScreen } from "../Screens/FeedMainScreen";
import { FeedDetailScreen } from "../Screens/FeedDetailScreen";
import { FeedStackParamList } from "../Types/FeedStackParamList";
import { LocationsStackParamList } from "../Types/LocationsStackParamList";
import { LocationsMainScreen } from "../Screens/LocationsMainScreen";
import { LocationsDetailScreen } from "../Screens/LocationsDetailScreen";
import { CampusMapMainScreen } from "../Screens/CampusMapMainScreen";

const Stack = createNativeStackNavigator<LocationsStackParamList>();

export function LocationsStackNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="CampusMap"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen
                name="Main"
                component={LocationsMainScreen}
                options={{ title: "" }}
            />
            <Stack.Screen name="CampusMap" component={CampusMapMainScreen} />
            <Stack.Screen
                name="Detail"
                component={LocationsDetailScreen}
                options={{ title: "Detail" }}
            />
        </Stack.Navigator>
    );
}
