export const CATEGORY_IDS = [
    "student-staff-resources",
    "housing-dining",
    "places-of-interest",
    "public-art",
    "recreation",
    "transportation-parking",
    "accessibility",
    "other",
    "athletics-recreation",
    "academic-administration",
    "support",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type LocationKind = "building" | "poi" | "parking";

export interface LocationQueryData {
    locations: LocationData[];
    categories: LocationCategory[];
}

export interface LocationData {
    id: string;
    kind: LocationKind;
    name: string;
    categoryId: CategoryId;
    lat: number;
    lng: number;
    subcategoryId: string;
    url?: string;
    imageUrl?: string;
    description?: string;
    groupName?: string;
    searchable: boolean;
    navigable: boolean;
    buildingId?: string;
}

export interface LocationSubcategory {
    id: string;
    name: string;
}

export interface LocationCategory {
    id: CategoryId;
    name: string;
    subcategories: LocationSubcategory[];
}
