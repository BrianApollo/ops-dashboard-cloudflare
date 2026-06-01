export interface Advertorial {
    id: string;
    name: string;
    productId: string;
    productName: string;
    text?: string;
    link?: string;
    isChecked: boolean;
    createdAt: string;
    /** Linked Angle record ID (from the "Angles" field). */
    angleId?: string;
}

export interface AdvertorialFilters {
    productId: string | null;
}
