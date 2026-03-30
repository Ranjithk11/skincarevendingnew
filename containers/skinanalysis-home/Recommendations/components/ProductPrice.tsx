"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

interface ProductPriceProps {
  retailPrice?: number;
  discountValue?: number;
  priceText?: string;
  productId?: string; // Add productId to fetch discount from API
  productName?: string; // Add productName to match by name if ID doesn't work
}

const calculateDiscount = (originalPrice?: number, discountPercentage?: number) => {
  if (!Number.isFinite(originalPrice as number)) return undefined;
  if (!Number.isFinite(discountPercentage as number)) return originalPrice;
  // discountPercentage is a percentage (e.g., 10 for 10%)
  const discountedPrice = (originalPrice as number) - (originalPrice as number) * ((discountPercentage as number) / 100);
  return Number(discountedPrice.toFixed(0));
};

const ProductPrice: React.FC<ProductPriceProps> = ({
  retailPrice,
  discountValue,
  priceText,
  productId,
  productName,
}) => {
  console.log('ProductPrice props:', { retailPrice, discountValue, priceText, productId });
  const [productsData, setProductsData] = useState<any[]>([]);
  const [fetchedDiscount, setFetchedDiscount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch products data to get discount information
  useEffect(() => {
    const fetchProductsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/products');
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setProductsData(data);
          
          // Get discount for this specific product
          if (productId || productName) {
            console.log('Looking for product:', { productId, productName });
            
            // First try to match by ID
            let product = data.find(p => p._id === productId || p.id === productId);
            
            // If not found by ID, try to match by name (case-insensitive, partial match)
            if (!product && productName) {
              product = data.find(p => {
                const apiName = (p.name || '').toLowerCase().trim();
                const slotName = productName.toLowerCase().trim();
                
                // Extract key words for better matching
                const slotWords = slotName.split(/\s+/).filter((w: string) => w.length > 2);
                const apiWords = apiName.split(/\s+/).filter((w: string) => w.length > 2);
                
                // Check if any key words match
                const hasKeyWordMatch = slotWords.some((slotWord: string) => 
                  apiWords.some((apiWord: string) => 
                    slotWord.includes(apiWord) || apiWord.includes(slotWord)
                  )
                );
                
                // Also try original partial matching
                const hasPartialMatch = apiName.includes(slotName) || slotName.includes(apiName);
                
                const matchResult = hasKeyWordMatch || hasPartialMatch;
                
                // Debug: Show matching details
                if (slotName.includes('minimalist') || slotName.includes('spf')) {
                  console.log('Matching details:', {
                    slotName,
                    apiName,
                    slotWords,
                    apiWords,
                    hasKeyWordMatch,
                    hasPartialMatch,
                    matchResult
                  });
                }
                
                return matchResult;
              });
            }
            
            const discount = product?.discount?.value || 0;
            setFetchedDiscount(discount);
            console.log('ProductPrice fetched discount:', { 
              productId, 
              productName, 
              discount, 
              foundProduct: product?.name, 
              matchMethod: product ? (productId ? 'ID' : 'Name') : 'None'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching products data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductsData();
  }, [productId, productName]);

  // Use fetched discount or fallback to prop discountValue
  const finalDiscountValue = fetchedDiscount || discountValue || 0;

  const hasDiscount =
    !isLoading &&
    Number.isFinite(retailPrice as number) &&
    Number.isFinite(finalDiscountValue) &&
    finalDiscountValue > 0 &&
    calculateDiscount(retailPrice, finalDiscountValue) !== retailPrice;

  // Debug: Log the final calculation
  console.log('ProductPrice calculation:', {
    retailPrice,
    fetchedDiscount,
    discountValue,
    finalDiscountValue,
    hasDiscount,
    discountedPrice: calculateDiscount(retailPrice, finalDiscountValue)
  });

  return (
    <Box sx={{ textAlign: "left" }}>
      {hasDiscount ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
          <Typography 
            sx={{ 
              textDecoration: "line-through",
              fontSize: "16px",
              color: "#6b7280",
              fontWeight: 800
            }} 
            variant="subtitle2"
          >
            INR.{retailPrice}/-
          </Typography>
          <Typography 
            variant="subtitle2" 
            color="#b91c1c" 
            sx={{ 
              fontSize: "24px",
              fontWeight: 800
            }}
          >
            INR.{calculateDiscount(retailPrice, finalDiscountValue)}/-
          </Typography>
        </Box>
      ) : (
        <Typography variant="subtitle1" color="#b91c1c" sx={{ fontWeight: 800, textAlign: "left", fontSize: "24px" }}>
          {priceText || `INR.${retailPrice}/-`}
        </Typography>
      )}

      {finalDiscountValue ? (
        <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary", textAlign: "left", fontSize: 24 }}>
          Discount: {finalDiscountValue}% off
        </Typography>
      ) : null}
    </Box>
  );
};

export default ProductPrice;
