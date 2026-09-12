import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { LoadingText } from "../Components/LoadingText";
import { LocationItem } from "../Components/LocationItem";
import SearchBar from "../Components/SearchBar";
import { Spinner } from "../Components/Spinner";
import { useLocationsData } from "../Hooks/useLocationsData";
import { AGGIE_BLUE, commonStyles } from "../Theme/commonStyles";
import { LocationData } from "../Types/Locations";
import { LocationsStackParamList } from "../Types/LocationsStackParamList";

type LocationsMainScreenNavigationProp = NativeStackNavigationProp<
    LocationsStackParamList,
    "Main"
>;

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAllMatches(haystack: string, userInput: string): number[] {
    const regex = new RegExp(escapeRegex(userInput), "gi"); // g = global, i = case-insensitive
    return [...haystack.matchAll(regex)].map(m => m.index);
}

const ITEMS_PER_PAGE = 20;
const TIME_MS_TILL_AUTOMATIC_SEARCH = 500;

export function LocationsMainScreen() {
    const navigation = useNavigation<LocationsMainScreenNavigationProp>();
    const { data, isPending, error } = useLocationsData();
    const [searchQuery, setSearchQuery] = useState("");
    const currentSearchTimerId = useRef<number | null>(null);
    // Item id as key, indices of highlight as value
    const textMatchInfo = useRef<Map<string, number[]>>(new Map());
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const locations = data?.locations ?? [];
    const [isRendering, setIsRendering] = useState(false);

    const [currentlyDisplayedData, setCurrentlyDisplayedData] = useState<
        LocationData[]
    >([]);

    useEffect(() => {
        if (searchQuery === "") {
            search("");
            clearTimeout(currentSearchTimerId.current);
        } else {
            currentSearchTimerId.current = setTimeout(
                () => search(searchQuery),
                TIME_MS_TILL_AUTOMATIC_SEARCH,
            );
        }

        return () => clearTimeout(currentSearchTimerId.current);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentlyDisplayedData(locations);
        search(searchQuery);
    }, [data]);

    useEffect(() => {
        setIsRendering(false);
    }, [currentlyDisplayedData]);

    function search(searchQuery: string) {
        textMatchInfo.current.clear();

        if (searchQuery === "") {
            setCurrentlyDisplayedData(locations);
            setIsRendering(true);
            return;
        }

        const filteredDisplayData: LocationData[] = [];

        // for (const locationBlock of dataOrEmpty) {
        //     const filteredLocations: LocationData[] = [];

        //     for (const location of locationBlock.locations) {
        //         const indices = findAllMatches(location.name, searchQuery);

        //         if (indices.length > 0) {
        //             textMatchInfo.current.set(location.id, indices);
        //             filteredLocations.push(location);
        //         }
        //     }

        //     if (filteredLocations.length > 0) {
        //         filteredDisplayData.push({
        //             name: locationBlock.name,
        //             locations: filteredLocations,
        //         });
        //     }
        // }

        const filteredLocations: LocationData[] = [];

        for (const location of locations) {
            const indices = findAllMatches(location.name, searchQuery);

            if (indices.length > 0) {
                textMatchInfo.current.set(location.id, indices);
                filteredLocations.push(location);
            }
        }

        setIsRendering(true);
        setCurrentlyDisplayedData(filteredDisplayData);
    }

    function renderLocation(location: LocationData) {
        const textBoldInfo: { start: number; stop: number }[] = [];

        const info = textMatchInfo.current.get(location.id) ?? [];
        for (const index of info) {
            textBoldInfo.push({
                start: index,
                stop: index + searchQuery.length,
            });
        }

        return (
            <LocationItem
                key={location.id}
                location={location}
                onPress={() => {
                    navigation.navigate("Detail", {
                        name: location.name,
                        lat: location.lat,
                        lng: location.lng,
                        url: location.url,
                    });
                }}
                boldOn={textBoldInfo}
            />
        );
    }

    function loadMore() {
        if (visibleCount < locations.length) {
            setVisibleCount(prev =>
                Math.min(visibleCount + ITEMS_PER_PAGE, locations.length),
            );
        }
    }

    function onPageScroll({
        nativeEvent,
    }: NativeSyntheticEvent<NativeScrollEvent>) {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

        const paddingToBottom = 200;

        const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;

        if (isCloseToBottom) {
            loadMore();
        }
    }

    if (error) {
        return (
            <View style={commonStyles.whiteBackground}>
                <Text style={commonStyles.errorText}>
                    Failed to load location directory! (Error: {error?.message})
                </Text>
            </View>
        );
    }

    return (
        <>
            {isRendering && (
                <View style={styles.searchSpinner}>
                    <Spinner />
                    <LoadingText text="Searching" />
                </View>
            )}
            <View style={styles.page}>
                <View style={styles.header}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        containerStyle={styles.searchBar}
                        onSubmit={query => {
                            clearTimeout(currentSearchTimerId.current);
                            search(query);
                        }}
                        placeholder="Search locations"
                    />
                    {/* <Pressable
                        onPress={async () => {
                            await SQLite.deleteDatabaseAsync("app.db");
                        }}
                    >
                        <Text>Delete database</Text>
                    </Pressable> */}
                </View>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    style={styles.scrollView}
                >
                    {isPending ? (
                        <View style={[styles.spinnerContainer]}>
                            <Spinner />
                            <LoadingText text="Loading" />
                        </View>
                    ) : (
                        <View style={styles.mainContainer}>
                            {/* {currentlyDisplayedData
                                .slice(0, visibleCount)
                                .map(locationBlock => (
                                    <CollapsibleSection
                                        title={locationBlock.name}
                                        key={locationBlock.name}
                                    >
                                        <View style={styles.locationsList}>
                                            {locationBlock.locations.map(data =>
                                                renderLocation(data),
                                            )}
                                        </View>
                                    </CollapsibleSection>
                                ))} */}
                            {currentlyDisplayedData
                                .slice(0, 100)
                                .map(location => (
                                    <View style={styles.locationsList}>
                                        {renderLocation(location)},
                                    </View>
                                ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    locationsList: {
        width: "100%",
        backgroundColor: "white",
    },
    title: {
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: AGGIE_BLUE,
        color: "white",
    },
    page: {
        backgroundColor: AGGIE_BLUE,
        height: "100%",
        maxHeight: "100%",
        flex: 1,
    },
    spinnerContainer: {
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: "white",
        flex: 1,
    },
    mainContainer: {
        backgroundColor: "white",
        flex: 1,
    },
    searchBar: {
        marginTop: 70,
        marginBottom: 30,
    },
    header: {},
    scrollView: {},
    searchSpinner: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
});
