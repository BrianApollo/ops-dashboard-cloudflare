/**
 * Canonical domain model for Angles.
 * Angles are ad/marketing angles associated with a product.
 */

export interface Angle {
  id: string;
  name: string;
  product: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface AngleFilters {
  productId: string | null;
  isActive: boolean | null;
}
