import { SQLiteDatabase } from "expo-sqlite";
import {
    CategoryId,
    LocationCategory,
    LocationData,
    LocationKind,
    LocationQueryData,
} from "../Types/Locations";

interface LocationRow {
    id: string;
    kind: LocationKind;
    name: string;
    category_id: string;
    lat: number;
    lng: number;
    subcategory_id: string;
    url: string | null;
    image_url: string | null;
    description: string | null;
    group_name: string | null;
    searchable: number; // 0 or 1 — SQLite has no boolean type
    navigable: number; // 0 or 1
    building_id: string | null;
}

interface CategoryRow {
    id: string;
    name: string;
    subcategories_json: string;
}

interface SyncStateRow {
    id: number;
    checksum: string;
    last_checked_at: number;
}

function rowToLocationData(row: LocationRow): LocationData {
    return {
        id: row.id,
        kind: row.kind,
        name: row.name,
        categoryId: row.category_id as CategoryId,
        lat: row.lat,
        lng: row.lng,
        subcategoryId: row.subcategory_id,
        url: row.url ?? undefined,
        imageUrl: row.image_url ?? undefined,
        description: row.description ?? undefined,
        groupName: row.group_name ?? undefined,
        searchable: row.searchable === 1,
        navigable: row.navigable === 1,
        buildingId: row.building_id ?? undefined,
    };
}

function rowToLocationCategory(row: CategoryRow): LocationCategory {
    return {
        id: row.id as CategoryId,
        name: row.name,
        subcategories: JSON.parse(row.subcategories_json),
    };
}

export async function readLocationsFromDb(
    db: SQLiteDatabase,
): Promise<LocationQueryData | null> {
    const categoryRows = await db.getAllAsync<CategoryRow>(
        "SELECT id, name, subcategories_json FROM categories",
    );

    const locationRows = await db.getAllAsync<LocationRow>(
        `SELECT id, kind, name, category_id, lat, lng, subcategory_id, url,
            image_url, searchable, navigable, building_id, description,
            group_name
        FROM locations`,
    );

    if (categoryRows.length === 0 || locationRows.length === 0) {
        return null;
    }

    return {
        locations: locationRows.map(rowToLocationData),
        categories: categoryRows.map(rowToLocationCategory),
    };
}

export async function writeLocationsToDb(
    db: SQLiteDatabase,
    data: LocationQueryData,
): Promise<void> {
    await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM locations");
        await db.runAsync("DELETE FROM categories");

        const categoryStatement = await db.prepareAsync(
            `INSERT INTO categories (id, name, subcategories_json)
            VALUES ($id, $name, $subcategories_json)`,
        );

        try {
            for (const category of data.categories) {
                await categoryStatement.executeAsync({
                    $id: category.id,
                    $name: category.name,
                    $subcategories_json: JSON.stringify(category.subcategories),
                });
            }
        } finally {
            await categoryStatement.finalizeAsync();
        }

        const locationStatement = await db.prepareAsync(
            `INSERT INTO locations
                (id, kind, name, category_id, lat, lng, subcategory_id, url,
                image_url, description, group_name, searchable, navigable,
                building_id)
            VALUES
                ($id, $kind, $name, $category_id, $lat, $lng, $subcategory_id, $url,
                $image_url, $description, $group_name, $searchable, $navigable,
                $building_id)`,
        );

        try {
            for (const location of data.locations) {
                await locationStatement.executeAsync({
                    $id: location.id,
                    $kind: location.kind,
                    $name: location.name,
                    $category_id: location.categoryId,
                    $lat: location.lat,
                    $lng: location.lng,
                    $subcategory_id: location.subcategoryId,
                    $url: location.url ?? null,
                    $image_url: location.imageUrl ?? null,
                    $description: location.description ?? null,
                    $group_name: location.groupName ?? null,
                    $searchable: location.searchable ? 1 : 0,
                    $navigable: location.navigable ? 1 : 0,
                    $building_id: location.buildingId ?? null,
                });
            }
        } finally {
            await locationStatement.finalizeAsync();
        }
    });
}

export async function readSyncStateFromDb(
    db: SQLiteDatabase,
): Promise<SyncStateRow | null> {
    const row = await db.getFirstAsync<SyncStateRow>(
        "SELECT id, checksum, last_checked_at FROM sync_state",
    );
    return row;
}

export async function touchLastCheckedToDb(db: SQLiteDatabase): Promise<void> {
    await db.runAsync(
        "UPDATE sync_state SET last_checked_at = $now WHERE id = 1",
        { $now: Date.now() },
    );
}

export async function writeChecksumToDb(
    db: SQLiteDatabase,
    checksum: string,
): Promise<void> {
    await db.runAsync(
        `INSERT INTO sync_state (id, checksum, last_checked_at)
        VALUES (1, $checksum, $now)
        ON CONFLICT (id) DO UPDATE SET
            checksum        = excluded.checksum,
            last_checked_at = excluded.last_checked_at`,
        {
            $checksum: checksum,
            $now: Date.now(),
        },
    );
}
