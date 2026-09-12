// export interface LocationData {
//     id: string;
//     name: string;
//     abbr: string;
//     lat: string;
//     lng: string;
//     link: string;
//     icon: string;
//     glyph: string;
//     image?: string;
// }

// export interface LocationBlock {
//     name: string;
//     locations: LocationData[];
// }

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

export interface LocationQueryData {
    locations: LocationData[];
    categories: LocationCategory[];
}

export interface LocationData {
    id: string;
    kind: string;
    name: string;
    categoryId: CategoryId;
    lat: number;
    lng: number;
    subcategoryId: string;
    url: string;
    imageUrl: string;
    searchable: boolean;
    navigable: boolean;
    buildingId: string;
}

export interface LocationSubcategory {
    id: string;
    name: string;
}

export interface LocationCategory {
    id: CategoryId;
    name: string;
    subcategories: LocationCategory[];
}
