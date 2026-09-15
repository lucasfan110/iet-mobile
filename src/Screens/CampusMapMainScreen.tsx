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
import MapView, { Callout, MapMarker, Region } from "react-native-maps";
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
    // "academic-administration": require("../Assets/MapIcons/academic-administration.png"),
    "academic-administration": require("../Assets/MapIcons/student-staff-resources.png"),
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

/**
 * For the latitude delta (zoom level sort of) until the markers on the map disappear
 */
const MAX_LATITUDE_DELTA_FOR_MARKERS = 2;

/**
 * The latitude delta threshold until the markers with its field "searchable" as
 * false disappear
 */
const MAX_LATITUDE_DELTA_FOR_UNSEARCHABLE_MARKERS = 0.015;

/**
 * The search result animation which moves the region's duration
 */
const SEARCH_RESULT_ANIMATION_DURATION_MS = 500;

/**
 * The search result's padding of the edge most pins, which is a multiple of the
 * distance of the span.
 */
const SEARCH_RESULT_REGION_PADDING = 1.6;

/**
 * If there is only one pin or multiple pins at one close cluster, then set a minimum
 * delta so that it doesn't like zoom in crazily close
 */
const MIN_SEARCH_RESULT_REGION_DELTA = 0.004;

/**
 * Since the map isn't at full height, a true "center" display can look off centered,
 * so the region latitude needs to be shifted down, relative to the latitude delta
 * calculated
 */
const SEARCH_RESULT_REGION_LATITUDE_SHIFT_PERCENTAGE = -0.5;

const MAP_VIEWPORT_TOP_OBSCURED_FRACTION = 0.3;
const MAP_VIEWPORT_BOTTOM_OBSCURED_FRACTION = 0.07;

const MAP_VIEWPORT_CENTER_SHIFT_FRACTION =
    (MAP_VIEWPORT_BOTTOM_OBSCURED_FRACTION -
        MAP_VIEWPORT_TOP_OBSCURED_FRACTION) /
    2;

const INITIAL_CATEGORIES_DISPLAYED: CategoryId[] = [
    "transportation-parking",
    "student-staff-resources",
    "housing-dining",
];

function average(arr: number[]): number {
    if (arr.length === 0) {
        return NaN;
    }

    return arr.reduce((sum, num) => sum + num, 0) / arr.length;
}

function median(arr: number[]): number {
    if (arr.length === 0) {
        return NaN;
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 1) {
        return sorted[middleIndex];
    } else {
        return (sorted[middleIndex] + sorted[middleIndex - 1]) / 2;
    }
}

function midpointOfSpan(arr: number[]): number {
    if (arr.length === 0) {
        return NaN;
    }

    return (Math.min(...arr) + Math.max(...arr)) / 2;
}

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

function computeSearchResultRegion(locations: LocationData[]): Region | null {
    if (locations.length === 0) {
        return null;
    }

    const latitudes = locations.map(location => location.lat);
    const longitudes = locations.map(location => location.lng);

    const averageLatitude = midpointOfSpan(latitudes);
    const averageLongitude = midpointOfSpan(longitudes);

    const latitudeSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const longitudeSpan = Math.max(...longitudes) - Math.min(...longitudes);

    const latitudeDelta = Math.max(
        latitudeSpan * SEARCH_RESULT_REGION_PADDING,
        MIN_SEARCH_RESULT_REGION_DELTA,
    );

    const longitudeDelta = Math.max(
        longitudeSpan * SEARCH_RESULT_REGION_PADDING,
        MIN_SEARCH_RESULT_REGION_DELTA,
    );

    let actualLatitudeDelta = latitudeDelta;

    if (longitudeDelta * 1.6 >= latitudeDelta) {
        actualLatitudeDelta = longitudeDelta * 1.6;
    }

    return {
        latitude:
            averageLatitude +
            actualLatitudeDelta * MAP_VIEWPORT_CENTER_SHIFT_FRACTION,
        longitude: averageLongitude,
        latitudeDelta,
        longitudeDelta,
    };
}

export function CampusMapMainScreen() {
    const navigation = useNavigation<CampusMapMainScreenNavigationProp>();
    const { data: locationData, isPending, isError } = useLocationsData();
    const [searchQuery, setSearchQuery] = useState("");
    const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
    const [selectedCategories, setSelectedCategories] = useState(
        () => new Set(INITIAL_CATEGORIES_DISPLAYED),
    );
    const [latitudeDelta, setLatitudeDelta] = useState(0.01);

    const mapRef = useRef<MapView>(null);

    const visibleLocations = useMemo(() => {
        if (submittedSearchQuery !== "") {
            return (
                locationData?.locations.filter(
                    location =>
                        submittedSearchQuery === "" ||
                        matchesSearchQuery(location, submittedSearchQuery),
                ) ?? []
            );
        } else {
            return (
                locationData?.locations.filter(location =>
                    selectedCategories.has(location.categoryId),
                ) ?? []
            );
        }
    }, [locationData, selectedCategories, submittedSearchQuery]);

    const markersVisible = latitudeDelta <= MAX_LATITUDE_DELTA_FOR_MARKERS;
    const unsearchableMarkerVisible =
        latitudeDelta <= MAX_LATITUDE_DELTA_FOR_UNSEARCHABLE_MARKERS;

    const renderedLocations = useMemo(() => {
        if (!markersVisible) {
            return [];
        }

        return visibleLocations.filter(
            location => location.searchable || unsearchableMarkerVisible,
        );
    }, [visibleLocations, markersVisible, unsearchableMarkerVisible]);

    useEffect(() => {
        (async () => {
            await requestLocationPermission();
        })();
    }, []);

    useEffect(() => {
        const region = computeSearchResultRegion(visibleLocations);

        if (region !== null) {
            mapRef.current?.animateToRegion(
                region,
                SEARCH_RESULT_ANIMATION_DURATION_MS,
            );
        }
    }, [visibleLocations]);

    useEffect(() => {
        if (searchQuery === "") {
            handleSearchClear();
        }
    }, [searchQuery]);

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
                    ref={mapRef}
                    style={styles.mapView}
                    initialRegion={{
                        latitude: 38.54,
                        longitude: -121.75,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }}
                    showsUserLocation
                    showsMyLocationButton
                    onRegionChangeComplete={region => {
                        setLatitudeDelta(region.latitudeDelta);
                    }}
                    // radius={40}
                    // renderCluster={cluster => (
                    //     <CustomCluster
                    //         key={`cluster-${cluster.id}-${cluster.properties.pointCount}`}
                    //         cluster={cluster}
                    //     />
                    // )}
                >
                    {renderedLocations.map(location => (
                        <MapMarker
                            key={location.id}
                            coordinate={{
                                latitude: Number(location.lat),
                                longitude: Number(location.lng),
                            }}
                            tracksViewChanges={false}
                            image={getMarkerImage(location)}
                            // style={{
                            //     opacity: location.searchable ? 1 : 0.3,
                            // }}
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
