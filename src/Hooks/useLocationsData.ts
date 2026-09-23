import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { LocationQueryData } from "../Types/Locations";
import {
    readLocationsFromDb,
    readSyncStateFromDb,
    touchLastCheckedToDb,
    writeChecksumToDb,
    writeLocationsToDb,
} from "../Database/locationsDb";

// https://mobile-dev.ucdavis.edu/api/v3/locations

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const HOSTNAME = "https://mobile.ucdavis.edu";

function numberOrUndefined(text: string | undefined): number | undefined {
    const num = Number(text);
    if (isNaN(num)) {
        return undefined;
    }

    return num;
}

async function fetchLocations(): Promise<LocationQueryData> {
    const locationData = await axios.get(
        "https://mobile-dev.ucdavis.edu/api/v3/locations",
    );

    return {
        locations: locationData.data.places,
        categories: locationData.data.categories,
    };
}

async function loadLocations(db: SQLiteDatabase): Promise<LocationQueryData> {
    const syncState = await readSyncStateFromDb(db);

    let checksum: string | undefined = undefined;
    let timeToCheck = true;

    if (syncState !== null) {
        checksum = syncState.checksum;

        if (Date.now() - syncState.last_checked_at <= CHECK_INTERVAL_MS) {
            console.log(
                "Not enough time elapsed to check for location updates from API.",
            );
            timeToCheck = false;
        }
    }

    if (timeToCheck) {
        console.log("Checking server for location updates...");
        const locationData = await axios.get(`${HOSTNAME}/api/v3/locations`, {
            headers: {
                "If-None-Match": checksum,
            },
            validateStatus: s => (s >= 200 && s < 300) || s === 304,
        });

        if (locationData.status !== 304) {
            await writeLocationsToDb(db, {
                categories: locationData.data.categories,
                locations: locationData.data.places,
            });
            await writeChecksumToDb(db, locationData.data.checksum);
            console.log(
                "Updated the database to match the new location data on the server.",
            );
        } else {
            console.log("No new data from the server.");
            await touchLastCheckedToDb(db);
        }
    }

    const locationQuery = await readLocationsFromDb(db);

    if (locationQuery !== null) {
        return locationQuery;
    } else {
        throw new Error("Locations DB unexpectedly empty");
    }
}

export function useLocationsData() {
    const db = useSQLiteContext();

    const query = useQuery<LocationQueryData>({
        queryKey: ["locations"],
        queryFn: async () => await loadLocations(db),
    });

    return query;
}
