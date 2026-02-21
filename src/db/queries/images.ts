/**
 * D1 Query Functions — Images + Temp Images
 * READ-ONLY for Phase 3.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { images, tempImages, products } from '../schema';

const imageFields = {
  id:            images.id,
  imageName:     images.imageName,
  status:        images.status,
  productId:     images.productId,
  imageType:     images.imageType,
  driveFileId:   images.driveFileId,
  imageDriveLink: images.imageDriveLink,
  thumbnailUrl:  images.thumbnailUrl,
  width:         images.width,
  height:        images.height,
  fileSize:      images.fileSize,
  notes:         images.notes,
  count:         images.count,
  createdAt:     images.createdAt,
  productName:   products.productName,
  isTemp:        images.id,           // placeholder; overridden in mapping
};

export async function getAllImages(db: DbClient) {
  const [imageRows, tempRows] = await Promise.all([
    db
      .select({
        id: images.id, imageName: images.imageName, status: images.status,
        productId: images.productId, imageType: images.imageType,
        driveFileId: images.driveFileId, imageDriveLink: images.imageDriveLink,
        thumbnailUrl: images.thumbnailUrl, width: images.width, height: images.height,
        fileSize: images.fileSize, notes: images.notes, count: images.count,
        createdAt: images.createdAt, productName: products.productName,
      })
      .from(images)
      .leftJoin(products, eq(images.productId, products.id)),

    db
      .select({
        id: tempImages.id, imageName: tempImages.imageName,
        productId: tempImages.productId, driveLink: tempImages.driveLink,
        createdAt: tempImages.createdAt, productName: products.productName,
      })
      .from(tempImages)
      .leftJoin(products, eq(tempImages.productId, products.id)),
  ]);

  return {
    images: imageRows,
    tempImages: tempRows,
  };
}

export async function getImagesByProduct(db: DbClient, productId: string) {
  const [imageRows, tempRows] = await Promise.all([
    db
      .select({
        id: images.id, imageName: images.imageName, status: images.status,
        productId: images.productId, imageType: images.imageType,
        driveFileId: images.driveFileId, imageDriveLink: images.imageDriveLink,
        thumbnailUrl: images.thumbnailUrl, width: images.width, height: images.height,
        fileSize: images.fileSize, notes: images.notes, count: images.count,
        createdAt: images.createdAt, productName: products.productName,
      })
      .from(images)
      .leftJoin(products, eq(images.productId, products.id))
      .where(eq(images.productId, productId)),

    db
      .select({
        id: tempImages.id, imageName: tempImages.imageName,
        productId: tempImages.productId, driveLink: tempImages.driveLink,
        createdAt: tempImages.createdAt, productName: products.productName,
      })
      .from(tempImages)
      .leftJoin(products, eq(tempImages.productId, products.id))
      .where(eq(tempImages.productId, productId)),
  ]);

  return { images: imageRows, tempImages: tempRows };
}
