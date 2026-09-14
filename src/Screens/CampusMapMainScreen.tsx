import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import {
    ImageRequireSource,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
// import MapView from "react-native-map-clustering";
import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Callout, MapMarker } from "react-native-maps";
import { LocationCategoryCheckbox } from "../Components/LocationCategoryCheckbox";
import SearchBar from "../Components/SearchBar";
import { useLocationsData } from "../Hooks/useLocationsData";
import {
    AGGIE_BLUE,
    AGGIE_BLUE_LIGHTER,
    commonStyles,
} from "../Theme/commonStyles";
import { CategoryId, LocationData } from "../Types/Locations";
import { LocationsStackParamList } from "../Types/LocationsStackParamList";

type CampusMapMainScreenNavigationProp = NativeStackNavigationProp<
    LocationsStackParamList,
    "CampusMap"
>;

const LOCATION_CATEGORY_MARKER_IMAGE: Record<CategoryId, ImageRequireSource> = {
    "student-staff-resources": require("../Assets/MapIcons/student-staff-resources.png"),
    "housing-dining": require("../Assets/MapIcons/housing-dining.png"),
    "places-of-interest": require("../Assets/MapIcons/places-of-interest.png"),
    "public-art": require("../Assets/MapIcons/public-art.png"),
    recreation: require("../Assets/MapIcons/recreation.png"),
    "transportation-parking": require("../Assets/MapIcons/transportation-parking.png"),
    accessibility: require("../Assets/MapIcons/accessibility.png"),
    "athletics-recreation": require("../Assets/MapIcons/athletics-recreation.png"),
    "academic-administration": require("../Assets/MapIcons/academic-administration.png"),
    support: require("../Assets/MapIcons/support.png"),
    other: require("../Assets/MapIcons/other.png"),
};

const LOCATION_SUBCATEGORY_MARKER_IMAGE = new Map<string, ImageRequireSource>(
    Object.entries({
        "unitrans-terminals": require("../Assets/MapIcons/unitrans-terminals.png"),
        "student-housing": require("../Assets/MapIcons/student-housing.png"),
        "private-on-campus-apartments": require("../Assets/MapIcons/private-on-campus-apartments.png"),
        "faculty-staff-housing": require("../Assets/MapIcons/faculty-staff-housing.png"),
        "gender-inclusive-restrooms": require("../Assets/MapIcons/gender-inclusive-restrooms.png"),
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

function matchesSearchQuery(location: LocationData, query: string): boolean {
    if (!location.searchable) {
        return false;
    }

    return location.name.toLowerCase().includes(query.toLowerCase());
}

const BASE_ICON_SIZE = 15;
const TIME_MS_TILL_TRACKS_CHANGE_FALSE = 2000;

const INITIAL_CATEGORIES_DISPLAYED: CategoryId[] = [
    "transportation-parking",
    "student-staff-resources",
    "housing-dining",
];

export function CampusMapMainScreen() {
    const navigation = useNavigation<CampusMapMainScreenNavigationProp>();
    const { data: locationData, isPending, isError } = useLocationsData();
    const [tracksViewChange, setTracksViewChange] = useState(true);
    const [trackedMarkerIds, setTrackedMarkerIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState(
        () => new Set(INITIAL_CATEGORIES_DISPLAYED),
    );
    const settledMarkerIdsRef = useRef<Set<string>>(new Set());
    const trackChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const visibleLocations = useMemo(() => {
        return (
            locationData?.locations
                .filter(location => selectedCategories.has(location.categoryId))
                .filter(
                    location =>
                        submittedSearchQuery === "" ||
                        matchesSearchQuery(location, submittedSearchQuery),
                ) ?? []
        );
    }, [locationData, selectedCategories, submittedSearchQuery]);

    useEffect(() => {
        (async () => {
            await requestLocationPermission();
        })();
    }, []);

    useEffect(() => {
        return () => {
            if (trackChangeTimeoutRef.current !== null) {
                clearTimeout(trackChangeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const visibleIds = new Set(
            visibleLocations.map(location => location.id),
        );

        for (const id of settledMarkerIdsRef.current) {
            if (!visibleIds.has(id)) {
                settledMarkerIdsRef.current.delete(id);
            }
        }

        const newlyVisibleIds = [...visibleIds].filter(
            id => !settledMarkerIdsRef.current.has(id),
        );

        if (newlyVisibleIds.length === 0) {
            return;
        }

        setTrackedMarkerIds(prev => {
            const next = new Set(prev);
            for (const id of newlyVisibleIds) {
                next.add(id);
            }

            return next;
        });

        if (trackChangeTimeoutRef.current !== null) {
            clearTimeout(trackChangeTimeoutRef.current);
        }

        trackChangeTimeoutRef.current = setTimeout(() => {
            setTrackedMarkerIds(prev => {
                for (const id of prev) {
                    settledMarkerIdsRef.current.add(id);
                }
                return new Set();
            });
        }, TIME_MS_TILL_TRACKS_CHANGE_FALSE);
    }, [visibleLocations]);

    function getMarkerImage(location: LocationData): ImageRequireSource {
        const subcategoryImage = LOCATION_SUBCATEGORY_MARKER_IMAGE.get(
            location.subcategoryId,
        );

        if (subcategoryImage !== undefined) {
            return subcategoryImage;
        }

        return LOCATION_CATEGORY_MARKER_IMAGE[location.categoryId];
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

    function handleSearchSubmit(query: string) {
        setSubmittedSearchQuery(query.trim());
    }

    function handleSearchClear() {
        setSubmittedSearchQuery("");
    }

    return (
        <View style={styles.mainContainer}>
            <View style={styles.headerContainer}>
                <View style={styles.searchBarContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmit={handleSearchSubmit}
                        onClear={handleSearchClear}
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
                    {visibleLocations.map(location => (
                        <MapMarker
                            key={location.id}
                            coordinate={{
                                latitude: Number(location.lat),
                                longitude: Number(location.lng),
                            }}
                            tracksViewChanges={false}
                            image={getMarkerImage(location)}
                        >
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
        paddingTop: 50,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        flexDirection: "row",
        gap: 20,
        backgroundColor: AGGIE_BLUE_LIGHTER,
        minWidth: "100%",
    },
});
