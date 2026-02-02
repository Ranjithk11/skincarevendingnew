import { createApi } from "@reduxjs/toolkit/query/react";
import inititBaseQuery from "../baseQuery/baseQuery";
import { API_ROUTES } from "../routes/apiRoutes";

interface GetFilteredProductsProps {
  search?: string;
  catId?: string;
  limit?: number;
  page?: number;
  brandId?: string;
  hasBrand?: boolean;
  isShopifyAvailable?: boolean;
}

interface ApiResponse {
  data: any[];
  message: string;
  status: string;
  statusCode: number;
  totalCounts: number;
}

export const productsApi = createApi({
  reducerPath: "productsApi",
  baseQuery: inititBaseQuery({}),
  endpoints: (builder) => ({
    getTopSellingProducts: builder.query<ApiResponse, any>({
      query: () => `${API_ROUTES.GET_TOP_SELLING_PRODUCTS}?limit=20`,
    }),
    getFilteredProducts: builder.query<ApiResponse, GetFilteredProductsProps>({
      query: ({ search, catId, limit, page, brandId, hasBrand, isShopifyAvailable }) => {
        return {
          url: `${API_ROUTES.FETCH_ALL_PRODUCTS}`,
          method: "GET",
          params: {
            ...(search && { search }),
            ...(page && { page }),
            ...(limit && { limit }),
            ...(catId && catId !== "all" && { catId }),
            ...(brandId && brandId !== "all" && { brandId }),
            hasBrand: hasBrand,
            isShopifyAvailable: isShopifyAvailable ?? true,
          },
        };
      },
    }),
    getProductCategories: builder.query<ApiResponse, any>({
      query: () => {
        return {
          url: `${API_ROUTES.GET_PRODUCT_CATEGORIES}`,
          method: "GET",
        };
      },
      transformResponse: (response: any) => {
        let categories: any[] = [];
        if (response?.data?.length > 0) {
          response?.data?.map((category: any) => {
            categories.push(category);
          });
        }
        return {
          data: [
            {
              title: "All",
              _id: "all",
            },
            ...categories,
          ],
          message: response?.message,
          status: response?.status,
          statusCode: response?.statusCode,
          totalCounts: response?.totalCounts,
        };
      },
    }),
    getAllBrands: builder.query<ApiResponse, any>({
      query: () => {
        return {
          url: API_ROUTES.GET_ALL_BRANDS,
          method: "GET",
          params: {
            page: 1,
            limit: 50,
          },
        };
      },
    }),
  }),
});

export const {
  useLazyGetTopSellingProductsQuery,
  useLazyGetFilteredProductsQuery,
  useGetFilteredProductsQuery,
  useLazyGetProductCategoriesQuery,
  useGetProductCategoriesQuery,
  useGetAllBrandsQuery,
  useLazyGetAllBrandsQuery,
} = productsApi;
