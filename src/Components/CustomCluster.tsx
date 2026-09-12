import { StyleSheet, View, Text } from "react-native";
import { Marker } from "react-native-maps";
import { AGGIE_BLUE } from "../Theme/commonStyles";
import { useEffect, useRef, useState } from "react";

interface Props {
    cluster: any;
}

const TRACKS_VIEW_OFF_AFTER_MS = 150;

export function CustomCluster({ cluster }: Props) {
    const { id, geometry, properties } = cluster;
    const [longitude, latitude] = geometry.coordinates;
    const pointsCount = properties.point_count;

    const [tracksViewChange, setTrackViewChange] = useState(true);
    const prevPointsCountRef = useRef(pointsCount);

    useEffect(() => {
        if (prevPointsCountRef.current !== pointsCount) {
            prevPointsCountRef.current = pointsCount;
            setTrackViewChange(true);
        }
    }, [pointsCount]);

    useEffect(() => {
        if (tracksViewChange) {
            const timer = setTimeout(() => {
                setTrackViewChange(false);
            }, TRACKS_VIEW_OFF_AFTER_MS);

            return () => setTrackViewChange(false);
        }
    }, [tracksViewChange]);

    return (
        <Marker
            coordinate={{ longitude, latitude }}
            tracksViewChanges={tracksViewChange}
            style={styles.clusterMarker}
        >
            <View style={styles.clusterContainer}>
                <Text style={styles.clusterText}>{pointsCount}</Text>
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    clusterMarker: {},
    clusterContainer: {
        backgroundColor: AGGIE_BLUE,
        width: 30,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "50%",
    },
    clusterText: {
        color: "#fff",
    },
});
