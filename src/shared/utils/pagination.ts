export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationQueryInput {
  page: number;
  limit: number;
}

export function calculatePaginationSkipTake(input: PaginationQueryInput): {
  skip: number;
  take: number;
} {
  return {
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  input: PaginationQueryInput,
  total: number,
): PaginatedResponse<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / input.limit);

  return {
    data,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages,
    },
  };
}
