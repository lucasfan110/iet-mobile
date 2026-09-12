import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Feed } from "../Types/Feed";
import { LocationData, LocationQueryData } from "../Types/Locations";
import { nanoid } from "nanoid/non-secure";
import { useSQLiteContext } from "expo-sqlite";

// https://mobile-dev.ucdavis.edu/api/v3/locations

function numberOrUndefined(text: string | undefined): number | undefined {
    const num = Number(text);
    if (isNaN(num)) {
        return undefined;
    }

    return num;
}

// async function fetchLocations(): Promise<LocationBlock[]> {
//     // await new Promise(resolve => {
//     //     setTimeout(resolve, 5000);
//     // });

//     const campusMap = axios.get(
//         "https://mobile.ucdavis.edu/api/v2/locations/campus-map",
//     );

//     const studySpots = axios.get(
//         "https://mobile.ucdavis.edu/api/v2/locations/study-spots",
//     );

//     const allLocationsDataRaw = await Promise.all([campusMap, studySpots]);
//     const allLocationsData: LocationBlock[] = allLocationsDataRaw[0].data;

//     // Push the study spots data, as a location block
//     allLocationsData.push({
//         name: "Study Spots",
//         locations: allLocationsDataRaw[1].data,
//     });

//     for (const locationBlock of allLocationsData) {
//         for (const location of locationBlock.locations) {
//             location.id = nanoid();
//         }
//     }

//     return allLocationsData;
// }

async function fetchLocations(): Promise<LocationQueryData> {
    const locationData = await axios.get(
        "https://mobile-dev.ucdavis.edu/api/v3/locations",
    );

    return {
        locations: locationData.data.places,
        categories: locationData.data.categories,
    };
}

export function useLocationsData() {
    const db = useSQLiteContext();

    // async function saveFetchedLocations(locationBlocks: LocationBlock[]) {
    //     // Create location sections
    //     await db.execAsync("DELETE FROM locations;");
    //     await db.execAsync("DELETE FROM location_sections;");

    //     await db.withTransactionAsync(async () => {
    //         const locationSectionStatement = await db.prepareAsync(
    //             `INSERT INTO location_sections (name) VALUES ($name)`,
    //         );

    //         try {
    //             for (const locationBlock of locationBlocks) {
    //                 const result = await locationSectionStatement.executeAsync({
    //                     $name: locationBlock.name,
    //                 });

    //                 const locationStatement = await db.prepareAsync(
    //                     `INSERT INTO locations (
    //                         id, name, abbr, lat, lng, link,
    //                         icon, glyph, image, section_id
    //                     ) VALUES (
    //                         $id, $name, $abbr, $lat, $lng, $link,
    //                         $icon, $glyph, $image, ${result.lastInsertRowId}
    //                     )`,
    //                 );

    //                 for (const location of locationBlock.locations) {
    //                     await locationStatement.executeAsync({
    //                         $id: location.id,
    //                         $name: location.name,
    //                         $abbr: location.abbr,
    //                         $lat: Number(location.lat),
    //                         $lng: Number(location.lng),
    //                         $link: location.link,
    //                         $icon: location.icon,
    //                         $glyph: location.glyph,
    //                         $image: location.image ?? null,
    //                     });
    //                 }
    //             }
    //         } finally {
    //             await locationSectionStatement.finalizeAsync();
    //         }
    //     });
    // }

    // async function readLocations(): Promise<LocationBlock[]> {
    //     const locations = await fetchLocations();

    //     // await saveFetchedLocations(locations);

    //     return locations;
    // }

    const query = useQuery<LocationQueryData>({
        queryKey: ["locations"],
        queryFn: fetchLocations,
    });

    return query;
}
