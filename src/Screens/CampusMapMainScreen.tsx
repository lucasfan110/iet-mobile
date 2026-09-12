import Lucide from "@react-native-vector-icons/lucide";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { ScrollView, StyleSheet, Text, View } from "react-native";
// import MapView from "react-native-map-clustering";
import { useEffect, useState } from "react";
import MapView, { Callout, MapMarker } from "react-native-maps";
import { useLocationsData } from "../Hooks/useLocationsData";
import {
    AGGIE_BLUE,
    AGGIE_BLUE_LIGHTER,
    commonStyles,
} from "../Theme/commonStyles";
import { CATEGORY_IDS, CategoryId, LocationData } from "../Types/Locations";
import { LocationsStackParamList } from "../Types/LocationsStackParamList";
import SearchBar from "../Components/SearchBar";
import { Checkbox } from "expo-checkbox";
import { LocationCategoryCheckbox } from "../Components/LocationCategoryCheckbox";

type CampusMapMainScreenNavigationProp = NativeStackNavigationProp<
    LocationsStackParamList,
    "CampusMap"
>;

/**
 * The application will first look at the `LOCATION_SUBCATEGORIES_ICON` for a
 * specific subcategory icon, and apply that. If you didn't specify a subcategory
 * icon, then it'll fall back to whatever icon you chose for the
 * `LOCATION_CATEGORY_ICON`. Same thing applies for the background color
 */

const LOCATION_CATEGORY_ICON = {
    "student-staff-resources": "building-2",
    "housing-dining": "utensils",
    "places-of-interest": "landmark",
    "public-art": "palette",
    recreation: "sport-shoe",
    "transportation-parking": "square-parking",
    accessibility: "accessibility",
    "athletics-recreation": "medal",
    "academic-administration": "university",
    support: "headset",
    other: "building",
} as const;

const LOCATION_SUBCATEGORY_ICON = {
    "unitrans-terminals": "bus-front",
    "student-housing": "house",
    "private-on-campus-apartments": "house",
    "faculty-staff-housing": "house",
    "gender-inclusive-restrooms": "toilet",
} as const;

const LOCATION_CATEGORY_BACKGROUND_COLOR = {
    "student-staff-resources": AGGIE_BLUE,
    "housing-dining": "#D80",
    "places-of-interest": "#DC143C",
    "public-art": "#DC143C",
    recreation: "#388004",
    "transportation-parking": "#3AF",
    accessibility: AGGIE_BLUE,
    "athletics-recreation": "#388004",
    "academic-administration": AGGIE_BLUE,
    support: AGGIE_BLUE,
    other: AGGIE_BLUE,
} as const;

const LOCATION_SUBCATEGORY_BACKGROUND_COLOR = new Map(
    Object.entries({
        "unitrans-terminals": "#F00",
        "student-housing": "#0B0",
        "private-on-campus-apartments": "#0B0",
        "faculty-staff-housing": "#0B0",
        "gender-inclusive-restrooms": "#4A4A4A",
    }),
);

async function requestLocationPermission(): Promise<boolean> {
    let { status } = await Location.getForegroundPermissionsAsync();

    if (status !== "granted") {
        const request = await Location.requestForegroundPermissionsAsync();
        status = request.status;
    }

    if (status === "granted") {
        return true;
    } else {
        return false;
    }
}

const BASE_ICON_SIZE = 15;

const INITIAL_CATEGORIES_DISPLAYED: CategoryId[] = [
    "transportation-parking",
    "student-staff-resources",
    "housing-dining",
];

export function CampusMapMainScreen() {
    const navigation = useNavigation<CampusMapMainScreenNavigationProp>();
    const { data: locationData, isPending, isError } = useLocationsData();
    const [tracksViewChange, setTracksViewChange] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState(
        () => new Set(INITIAL_CATEGORIES_DISPLAYED),
    );
    const [checked, setChecked] = useState(true);

    useEffect(() => {
        (async () => {
            await requestLocationPermission();
        })();
    }, []);

    useEffect(() => {
        setTimeout(() => {
            setTracksViewChange(false);
        }, 2000);
    }, [selectedCategories]);

    function renderLocationIcon(location: LocationData) {
        if (Object.hasOwn(LOCATION_SUBCATEGORY_ICON, location.subcategoryId)) {
            const icon =
                LOCATION_SUBCATEGORY_ICON[
                    location.subcategoryId as keyof typeof LOCATION_SUBCATEGORY_ICON
                ];

            return (
                <Lucide
                    name={icon}
                    size={BASE_ICON_SIZE}
                    style={styles.locationIconStyle}
                />
            );
        }

        return (
            <Lucide
                name={LOCATION_CATEGORY_ICON[location.categoryId]}
                size={BASE_ICON_SIZE}
                style={styles.locationIconStyle}
            />
        );
    }

    function getBackgroundColor(location: LocationData): string {
        const subcategoryColor = LOCATION_SUBCATEGORY_BACKGROUND_COLOR.get(
            location.subcategoryId,
        );
        if (subcategoryColor !== undefined) {
            return subcategoryColor;
        }

        return LOCATION_CATEGORY_BACKGROUND_COLOR[location.categoryId];
    }

    function setCategoryValue(categoryId: CategoryId, value: boolean) {
        setSelectedCategories(prev => {
            const next = new Set(prev);
            if (value) {
                next.add(categoryId);
            } else {
                next.delete(categoryId);
            }
            return next;
        });
    }

    return (
        <View style={styles.mainContainer}>
            <View style={styles.headerContainer}>
                <View style={styles.searchBarContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search locations"
                    />
                </View>
                <ScrollView
                    contentContainerStyle={styles.categoriesContainer}
                    horizontal
                >
                    {locationData?.categories.map(category => (
                        <LocationCategoryCheckbox
                            value={selectedCategories.has(category.id)}
                            onValueChange={checked => {
                                setCategoryValue(category.id, checked);
                                setTracksViewChange(true);
                            }}
                            key={category.id}
                        >
                            {category.name}
                        </LocationCategoryCheckbox>
                    ))}
                </ScrollView>
            </View>
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.mapView}
                    initialRegion={{
                        latitude: 38.54,
                        longitude: -121.75,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }}
                    showsUserLocation
                    showsMyLocationButton
                    // radius={40}
                    // renderCluster={cluster => (
                    //     <CustomCluster
                    //         key={`cluster-${cluster.id}-${cluster.properties.pointCount}`}
                    //         cluster={cluster}
                    //     />
                    // )}
                >
                    {locationData?.locations
                        .filter(location =>
                            selectedCategories.has(location.categoryId),
                        )
                        .map(location => (
                            <MapMarker
                                key={`${location.id}`}
                                coordinate={{
                                    latitude: Number(location.lat),
                                    longitude: Number(location.lng),
                                }}
                                tracksViewChanges={tracksViewChange}
                            >
                                <View
                                    style={[
                                        styles.locationIconContainer,
                                        {
                                            backgroundColor:
                                                getBackgroundColor(location),
                                        },
                                    ]}
                                >
                                    {renderLocationIcon(location)}
                                </View>
                                <Callout
                                    onPress={() => {
                                        navigation.navigate("Detail", {
                                            ...location,
                                        });
                                    }}
                                >
                                    <View style={styles.calloutContainer}>
                                        <Text style={commonStyles.title}>
                                            {location.name}
                                        </Text>
                                    </View>
                                </Callout>
                            </MapMarker>
                        ))}
                </MapView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: "100%",
    },
    mainContainer: {
        height: "100%",
    },
    mapView: {
        flex: 1,
    },
    calloutContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        width: 200,
    },
    locationIconStyle: {
        color: "white",
    },
    locationIconContainer: {
        borderRadius: "50%",
        width: 25,
        height: 25,
        alignItems: "center",
        justifyContent: "center",
    },
    searchBarContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 20,
    },
    headerContainer: {
        backgroundColor: AGGIE_BLUE,
        paddingTop: 40,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        flexDirection: "row",
        gap: 20,
        backgroundColor: AGGIE_BLUE_LIGHTER,
    },
});
