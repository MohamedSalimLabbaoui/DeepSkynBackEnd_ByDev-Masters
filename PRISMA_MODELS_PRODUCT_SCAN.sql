// Ajoutez ces modèles à votre schema.prisma existant

model ProductScan {
  id                    String      @id @default(cuid())
  userId                String
  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Product Info
  productName           String
  brand                 String?
  category              String?
  imageUrl              String?
  
  // Analysis Data
  ingredients           String?     // JSON stringified
  benefits              String?     // JSON stringified
  concerns              String?     // JSON stringified
  skinTypeCompatibility String?     // JSON stringified
  analysisResult        String?     // JSON stringified (full analysis)
  
  // QR Scanning
  qrCode                String?     @unique
  barcode               String?
  
  // User Feedback
  rating                Int?        // 1-5
  review                String?
  
  // Timestamps
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  // Relations
  routineItems          RoutineItem[]
  userProducts          UserProduct[]
  
  @@index([userId])
  @@index([productName])
  @@index([brand])
}

model UserProduct {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  productName     String
  brand           String?
  category        String      // 'used', 'wishlist', 'rejected'
  categoryType    String?
  ingredients     String?     // JSON stringified
  imageUrl        String?
  
  // Link to ProductScan if available
  productScanId   String?
  productScan     ProductScan? @relation(fields: [productScanId], references: [id], onDelete: SetNull)
  productData     String?     // Full product JSON analysis
  
  // Usage Tracking
  quantity        Float?
  unit            String?     // ml, g, etc
  purchaseDate    DateTime?
  expiryDate      DateTime?
  
  rating          Int?        // 1-5
  notes           String?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([userId])
  @@index([category])
}

// Update existing SkinProfile model with product analysis history
// Add to SkinProfile model:
//   productScans         ProductScan[]     // Relation to product scans

// Update User model with:
//   productScans         ProductScan[]
//   userProducts         UserProduct[]

// Add this new model for product comparisons:
model ProductComparison {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  productIds      String[]    // Array of product IDs being compared
  comparisonData  String      // JSON stringified comparison results
  
  notes           String?
  saved           Boolean     @default(false)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([userId])
}

// Migration instructions:
// 1. Add these models to prisma/schema.prisma
// 2. Update existing User and SkinProfile relations
// 3. Run: npx prisma migrate dev --name add_product_scan
// 4. Run: npx prisma generate
