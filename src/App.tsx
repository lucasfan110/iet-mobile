import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SQLite from "expo-sqlite";
import { SQLiteDatabase, SQLiteProvider } from "expo-sqlite";
import { StyleSheet } from "react-native";
import { TabNavigator } from "./Navigators/TabNavigator";

async function deleteDatabase() {
    try {
        await SQLite.deleteDatabaseAsync("app.db");
        console.log("Deleted database successfully!");
    } catch (err) {
        console.log("Failed to delete database. Err: ", err);
    }
}

const queryClient = new QueryClient();

async function migrateDbIfNeeded(db: SQLiteDatabase) {
    const result = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
    );
    let currentVersion = result?.user_version ?? 0;

    await db.execAsync("PRAGMA foreign_keys = ON;");

    if (currentVersion === 0) {
        await db.execAsync(`
            PRAGMA journal_mode = 'wal';

            CREATE TABLE locations (
                id             TEXT PRIMARY KEY NOT NULL,
                kind           TEXT NOT NULL,
                name           TEXT NOT NULL,
                category_id    TEXT NOT NULL REFERENCES categories(id),
                lat            REAL NOT NULL,
                lng            REAL NOT NULL,
                subcategory_id TEXT NOT NULL,
                url            TEXT,
                image_url      TEXT,
                description    TEXT,
                group_name     TEXT,
                searchable     INTEGER NOT NULL,  -- boolean
                navigable      INTEGER NOT NULL,  -- boolean
                building_id    TEXT
            );

            CREATE INDEX idx_locations_category_id ON locations(category_id);

            CREATE TABLE categories (
                id                  TEXT PRIMARY KEY NOT NULL,
                name                TEXT NOT NULL,
                subcategories_json  TEXT NOT NULL  -- JSON array of {id, name}
            );
        `);
        currentVersion++;
    }
    if (currentVersion === 1) {
        await db.execAsync(`
            CREATE TABLE sync_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                checksum TEXT NOT NULL,
                last_checked_at INTEGER NOT NULL -- Date.now(), ms
            );
        `);
        currentVersion++;
    }

    await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}

export function App() {
    // deleteDatabase();

    return (
        <SQLiteProvider databaseName="app.db" onInit={migrateDbIfNeeded}>
            <QueryClientProvider client={queryClient}>
                <NavigationContainer>
                    <TabNavigator />
                </NavigationContainer>
            </QueryClientProvider>
        </SQLiteProvider>
    );
}

const styles = StyleSheet.create({});
